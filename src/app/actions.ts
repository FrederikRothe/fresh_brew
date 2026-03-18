'use server';

import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { readBrewData, writeBrewData, type BrewData } from '@/lib/storage';

export type BrewStatus = BrewData;

export async function getBrewStatus(): Promise<BrewStatus> {
  return await readBrewData();
}

export async function startBrew(password: string) {
  const ADMIN_PASSWORD = 'freshbrew'; // Super illegale hardcoded password, only for a simple coffee timer is this Ok :-)
  
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Unauthorized');
  }

  const now = Date.now();
  const today = format(now, 'yyyy-MM-dd');

  try {
    const currentData = await readBrewData();
    
    let newCount = 1;
    if (currentData.lastBrewDate === today) {
      newCount = (currentData.dailyBrewCount || 0) + 1;
    }

    const newData: BrewData = {
      lastBrewTimestamp: now,
      dailyBrewCount: newCount,
      lastBrewDate: today,
    };

    await writeBrewData(newData);

    // Notify Copenhagen Coffee Minion Slack workflow
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `☕ Pot #${newCount} is now brewing! It'll be ready in ~7 minutes.`,
          }),
        });
      } catch (slackError) {
        console.error('Failed to notify Slack:', slackError);
      }
    }

    revalidatePath('/');
    return { success: true, timestamp: now, count: newCount };
  } catch (error) {
    console.error('Failed to update brew status in Redis:', error);
    throw new Error('Could not start fresh brew. Storage error.');
  }
}
