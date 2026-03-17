'use server';

import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { readBrewData, writeBrewData, type BrewData } from '@/lib/storage';

export type BrewStatus = BrewData;

export async function getBrewStatus(): Promise<BrewStatus> {
  return await readBrewData();
}

export async function startBrew() {
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

    revalidatePath('/');
    return { success: true, timestamp: now, count: newCount };
  } catch (error) {
    console.error('Failed to update brew status in CSV:', error);
    throw new Error('Could not start fresh brew. Check local filesystem permissions.');
  }
}
