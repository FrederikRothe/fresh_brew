'use server';

import { revalidatePath } from 'next/cache';
import { readBrewData, writeBrewData, appendBrewRecord, readBrewHistory, appendWasteRecord, readWasteHistory, type BrewData, type BrewRecord, type WasteRecord } from '@/lib/storage';
import { formatCphDate, formatCphTime, getCphHour, getCphDayOfWeek, getCphSecondsSinceMidnight, getCphISOWeek } from '@/lib/utils';
import { SMALL_BATCH_GRAMS, BIG_BATCH_GRAMS, SMALL_BATCH_THRESHOLD_MS } from '@/lib/constants';

export type BrewStatus = BrewData;

export async function logWaste(password: string) {
  const ADMIN_PASSWORD = process.env.ADMIN_PSW;
  
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Unauthorized');
  }

  const now = Date.now();
  try {
    const currentData = await readBrewData();
    await appendWasteRecord({ 
      timestamp: now,
      lastBrewTimestamp: currentData.lastBrewTimestamp,
      lastBrewDurationMs: currentData.brewDurationMs
    });
    revalidatePath('/');
    return { success: true, timestamp: now };
  } catch (error) {
    console.error('Failed to log waste in Redis:', error);
    throw new Error('Could not log waste. Storage error.');
  }
}

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

export type PredictionData = {
  time: string;
  isOverdue: boolean;
  overdueMins: number;
};

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
  history: BrewRecord[];
  wasteHistory: WasteRecord[];
  predictedNextBrew: PredictionData | null;
  totalLiters: number;
  espressoEquivalent: number;
  totalWaitingMins: number;
  totalWasteCount: number;
  wasteByDuration: Record<number, number>; // durationMs → count of waste events
};

export async function getPredictedNextBrew(history?: BrewRecord[]): Promise<PredictionData | null> {
  const brewHistory = history || await readBrewHistory();
  const sortedHistory = [...brewHistory].sort((a, b) => a.timestamp - b.timestamp);

  const today = new Date();
  const todayStr = formatCphDate(today);
  const todayDayOfWeek = getCphDayOfWeek(today);

  // For predictive analytics
  const seqData: Record<number, Record<number, number[]>> = {}; // dayOfWeek -> seqIndex -> [secondsSinceMidnight]
  let lastDateStr = '';
  let currentSeq = 0;

  for (const record of sortedHistory) {
    const date = new Date(record.timestamp);
    const dateStr = formatCphDate(date);
    const dayOfWeek = getCphDayOfWeek(date);
    const secondsSinceMidnight = getCphSecondsSinceMidnight(date);

    if (dateStr !== lastDateStr) {
      currentSeq = 0;
      lastDateStr = dateStr;
    } else {
      currentSeq++;
    }

    if (!seqData[dayOfWeek]) seqData[dayOfWeek] = {};
    if (!seqData[dayOfWeek][currentSeq]) seqData[dayOfWeek][currentSeq] = [];
    seqData[dayOfWeek][currentSeq].push(secondsSinceMidnight);
  }

  // Count how many brewed today so far
  const brewedTodayCount = sortedHistory.filter(h => formatCphDate(h.timestamp) === todayStr).length;
  
  // Next brew sequence for today
  const nextSeq = brewedTodayCount;
  const typicalTimes = seqData[todayDayOfWeek]?.[nextSeq];

  if (typicalTimes && typicalTimes.length > 0) {
    const avgSeconds = typicalTimes.reduce((a, b) => a + b, 0) / typicalTimes.length;
    const h = Math.floor(avgSeconds / 3600);
    const m = Math.floor((avgSeconds % 3600) / 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    // Check if predicted time is in the past for today
    const nowSeconds = getCphSecondsSinceMidnight(today);
    const isOverdue = avgSeconds <= nowSeconds;
    const overdueMins = isOverdue ? Math.floor((nowSeconds - avgSeconds) / 60) : 0;

    return {
      time: timeStr,
      isOverdue,
      overdueMins
    };
  }

  return null;
}

export async function getBrewAnalytics(): Promise<BrewAnalytics> {
  const [history, wasteHistory] = await Promise.all([
    readBrewHistory(),
    readWasteHistory(),
  ]);

  const brewsPerWeek: Record<string, number> = {};
  const hourDistribution: Record<number, number> = {};
  const durationBreakdown: Record<number, number> = {};
  const daysSeen = new Set<string>();
  let totalCoffeeGrams = 0;
  let bigBrews = 0;
  let smallBrews = 0;

  // History is likely sorted by timestamp (appended), but let's be safe
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);

  for (const record of sortedHistory) {
    const date = new Date(record.timestamp);
    const dateStr = formatCphDate(date);

    const { week, year } = getCphISOWeek(date);
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
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

    daysSeen.add(dateStr);
  }

  const avgBrewsPerDay = daysSeen.size > 0 ? history.length / daysSeen.size : 0;
  const avgCoffeePerDay = daysSeen.size > 0 ? totalCoffeeGrams / daysSeen.size : 0;

  // Fun facts
  const totalLiters = totalCoffeeGrams / 60; // 60g/L
  const espressoEquivalent = totalCoffeeGrams / 18; // 18g double
  const totalWaitingMins = history.reduce((acc, h) => acc + (h.durationMs / 60000), 0);

  // Calculate waste correlation
  const wasteByDuration: Record<number, number> = {};
  for (const record of wasteHistory) {
    if (record.lastBrewDurationMs) {
      wasteByDuration[record.lastBrewDurationMs] = (wasteByDuration[record.lastBrewDurationMs] ?? 0) + 1;
    }
  }

  // Calculate predicted next brew using the standalone function
  const predictedNextBrew = await getPredictedNextBrew(history);

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
    history: sortedHistory,
    wasteHistory,
    predictedNextBrew,
    totalLiters,
    espressoEquivalent,
    totalWaitingMins,
    totalWasteCount: wasteHistory.length,
    wasteByDuration,
  };
}

