'use server';

import { revalidatePath } from 'next/cache';
import { readBrewData, writeBrewData, appendBrewRecord, readBrewHistory, appendWasteRecord, readHistoryForAnalytics, type BrewData, type BrewRecord, type WasteRecord } from '@/lib/storage';
import { formatCphDate, formatCphTime } from '@/lib/utils';
import { SMALL_BATCH_THRESHOLD_MS } from '@/lib/constants';
import {
  computeBrewAnalytics,
  computePredictedNextBrew,
  type BrewAnalytics,
  type PredictionData,
} from '@/lib/analytics';

export type { BrewAnalytics, PredictionData };
export type { BrewRecord, WasteRecord };

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

    // Reset current brew status because the pot is now empty
    const newData: BrewData = {
      ...currentData,
      lastBrewTimestamp: null,
      brewDurationMs: null,
    };
    await writeBrewData(newData);

    revalidatePath('/');
    revalidatePath('/analyze');
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
    revalidatePath('/analyze');
    return { success: true, timestamp: now, count: newCount, durationMs };
  } catch (error) {
    console.error('Failed to update brew status in Redis:', error);
    throw new Error('Could not start fresh brew. Storage error.');
  }
}

export async function getPredictedNextBrew(history?: BrewRecord[]): Promise<PredictionData | null> {
  const brewHistory = history || await readBrewHistory();
  return computePredictedNextBrew(brewHistory, Date.now());
}

export async function getBrewAnalytics(): Promise<BrewAnalytics> {
  const { history, wasteHistory } = await readHistoryForAnalytics();
  return computeBrewAnalytics(history, wasteHistory, Date.now());
}

