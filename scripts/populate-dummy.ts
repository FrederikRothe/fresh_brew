import { createClient } from 'redis';
import { BrewData, BrewRecord } from '../src/lib/storage';
import { formatCphDate } from '../src/lib/utils';

const redisUrl = process.env.STORAGE_REDIS_URL || 'redis://localhost:6379';
const BREW_KEY = 'coffee_brew_data';
const BREW_HISTORY_KEY = 'coffee_brew_history';

// Durations to match SMALL_BATCH_THRESHOLD_MS (5 min) in src/lib/constants.ts
const BIG_BREW = 7 * 60 * 1000;
const SMALL_BREW = 4 * 60 * 1000;

async function populate() {
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();

  console.log('Clearing existing data...');
  await client.del(BREW_KEY);
  await client.del(BREW_HISTORY_KEY);

  const history: BrewRecord[] = [];
  
  // Use current date to ensure charts are populated
  const refDate = new Date();

  // Populate 60 days of history for better monthly/yearly coverage
  for (let i = 0; i < 60; i++) {
    const currentDate = new Date(refDate.getTime() - (i * 24 * 60 * 60 * 1000));
    const dayOfWeek = currentDate.getDay();

    // Add 2-5 brews per day to ensure it looks "busy"
    const brewsPerDay = Math.floor(Math.random() * 4) + 2;
    const dayBrews: number[] = [];
    
    for (let j = 0; j < brewsPerDay; j++) {
      let brewTime: number;
      let attempts = 0;
      
      // Ensure no brew is within 40 minutes of another on the same day
      do {
        const brewDate = new Date(currentDate);
        // On Saturdays (like today), add more late brews to trigger prediction
        const minHour = (dayOfWeek === 6) ? 14 : 8;
        const randomHour = minHour + Math.floor(Math.random() * 8); // 14:00 - 22:00 for Sat
        const randomMinute = Math.floor(Math.random() * 60);
        brewDate.setHours(randomHour, randomMinute, 0, 0);
        brewTime = brewDate.getTime();
        attempts++;
      } while (dayBrews.some(t => Math.abs(t - brewTime) < 40 * 60 * 1000) && attempts < 100);
      
      dayBrews.push(brewTime);

      // Skip if this is a future brew for today specifically
      // But we WANT historical future-hour brews for previous Saturdays
      if (i === 0 && brewTime > refDate.getTime()) continue;

      history.push({
        timestamp: brewTime,
        durationMs: Math.random() > 0.4 ? BIG_BREW : SMALL_BREW
      });
    }
  }

  // Sort by timestamp descending (newest first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  console.log(`Adding ${history.length} history records...`);
  // Redis rPush adds to the end, so we push in chronological order (oldest first)
  const chronologicalHistory = [...history].reverse();
  for (const record of chronologicalHistory) {
    await client.rPush(BREW_HISTORY_KEY, JSON.stringify(record));
  }

  const lastBrew = history[0];
  const lastBrewDateStr = formatCphDate(lastBrew.timestamp);
  
  const dailyBrewCount = history.filter(r => formatCphDate(r.timestamp) === lastBrewDateStr).length;

  const data: BrewData = {
    lastBrewTimestamp: lastBrew.timestamp,
    dailyBrewCount: dailyBrewCount,
    lastBrewDate: lastBrewDateStr,
    brewDurationMs: lastBrew.durationMs
  };

  console.log('Setting brew data summary...');
  await client.set(BREW_KEY, JSON.stringify(data));

  await client.quit();
  console.log('Done populating dummy data.');
}

populate().catch(console.error);
