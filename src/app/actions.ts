'use server';

import { revalidatePath } from 'next/cache';
import { getISOWeek, getYear } from 'date-fns';
import { readBrewData, writeBrewData, appendBrewRecord, readBrewHistory, type BrewData } from '@/lib/storage';
import { formatCphDate, formatCphTime, getCphHour } from '@/lib/utils';
import { SMALL_BATCH_GRAMS, BIG_BATCH_GRAMS, SMALL_BATCH_THRESHOLD_MS } from '@/lib/constants';

export type BrewStatus = BrewData;

export async function getBrewStatus(): Promise<BrewStatus> {
  const data = await readBrewData();
  const today = formatCphDate(new Date());

  if (data.lastBrewDate !== today) {
    return {
      ...data,
      dailyBrewCount: 0,
    };
  }

  return data;
}

export async function validatePassword(password: string): Promise<boolean> {
  const ADMIN_PASSWORD = process.env.ADMIN_PSW;
  return password === ADMIN_PASSWORD;
}

export async function startBrew(password: string, durationMs: number = 7 * 60 * 1000) {
  const ADMIN_PASSWORD = process.env.ADMIN_PSW;
  
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Unauthorized');
  }

  const now = Date.now();
  const today = formatCphDate(now);

  try {
    const currentData = await readBrewData();
    
    // Prevent double-brewing within 60 seconds (anti-spam)
    if (currentData.lastBrewTimestamp && (now - currentData.lastBrewTimestamp) < 60000) {
      throw new Error('Too many requests. Please wait a minute before starting another brew.');
    }

    let newCount = 1;
    if (currentData.lastBrewDate === today) {
      newCount = (currentData.dailyBrewCount || 0) + 1;
    }

    const newData: BrewData = {
      lastBrewTimestamp: now,
      dailyBrewCount: newCount,
      lastBrewDate: today,
      brewDurationMs: durationMs,
    };

    await writeBrewData(newData);
    await appendBrewRecord({ timestamp: now, durationMs });

    const durationMins = Math.round(durationMs / 60000);
    const etc = formatCphTime(now + durationMs);
    const batchSize = durationMs > SMALL_BATCH_THRESHOLD_MS ? 'BIG' : 'small';

    // Notify Copenhagen Coffee Minion Slack workflow
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        const payload = {
          text: `☕ Pot #${newCount} is now brewing! It'll be ready in ~${durationMins} minutes.`,
          batch_size: batchSize,
          estimated_time_of_completion: etc,
        };
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (slackError) {
        console.error('Failed to notify Slack:', slackError);
      }
    }

    revalidatePath('/');
    return { success: true, timestamp: now, count: newCount, durationMs };
  } catch (error) {
    console.error('Failed to update brew status in Redis:', error);
    throw new Error('Could not start fresh brew. Storage error.');
  }
}

export type BrewAnalytics = {
  totalBrews: number;
  totalCoffeeGrams: number;
  bigBrews: number;
  smallBrews: number;
  brewsPerWeek: Record<string, number>;    // e.g. "2026-W11" → count
  hourDistribution: Record<number, number>; // hour 0-23 → count
  avgBrewsPerDay: number;
  avgCoffeePerDay: number;
  durationBreakdown: Record<number, number>; // durationMs → count
  history: { timestamp: number; durationMs: number }[];
};

export async function getBrewAnalytics(): Promise<BrewAnalytics> {
  const history = await readBrewHistory();

  const brewsPerWeek: Record<string, number> = {};
  const hourDistribution: Record<number, number> = {};
  const durationBreakdown: Record<number, number> = {};
  const daysSeen = new Set<string>();
  let totalCoffeeGrams = 0;
  let bigBrews = 0;
  let smallBrews = 0;

  for (const record of history) {
    const date = new Date(record.timestamp);

    const weekKey = `${getYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
    brewsPerWeek[weekKey] = (brewsPerWeek[weekKey] ?? 0) + 1;

    const hour = getCphHour(date);
    hourDistribution[hour] = (hourDistribution[hour] ?? 0) + 1;

    durationBreakdown[record.durationMs] = (durationBreakdown[record.durationMs] ?? 0) + 1;

    const isSmall = record.durationMs <= SMALL_BATCH_THRESHOLD_MS;
    if (isSmall) {
      smallBrews++;
      totalCoffeeGrams += SMALL_BATCH_GRAMS;
    } else {
      bigBrews++;
      totalCoffeeGrams += BIG_BATCH_GRAMS;
    }

    daysSeen.add(formatCphDate(date));
  }

  const avgBrewsPerDay = daysSeen.size > 0 ? history.length / daysSeen.size : 0;
  const avgCoffeePerDay = daysSeen.size > 0 ? totalCoffeeGrams / daysSeen.size : 0;

  return {
    totalBrews: history.length,
    totalCoffeeGrams,
    bigBrews,
    smallBrews,
    brewsPerWeek,
    hourDistribution,
    avgBrewsPerDay,
    avgCoffeePerDay,
    durationBreakdown,
    history,
  };
}
