import { createClient } from 'redis';
import { BrewData, BrewRecord } from '../src/lib/storage';

const redisUrl = process.env.STORAGE_REDIS_URL || 'redis://localhost:6379';
const BREW_KEY = 'coffee_brew_data';
const BREW_HISTORY_KEY = 'coffee_brew_history';

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
  
  // Use a fixed reference date (Wednesday, March 18, 2026)
  // We'll work backwards from there
  const refDate = new Date(2026, 2, 18, 12, 0, 0); // Month is 0-indexed, so 2 = March

  for (let i = 0; i < 14; i++) {
    const currentDate = new Date(refDate.getTime() - (i * 24 * 60 * 60 * 1000));
    const dayOfWeek = currentDate.getDay();

    // Skip weekends for plotting visibility if we want to ensure they show up in the weekday chart
    // although the chart component handles filtering, it's better to have data that fits.
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Add 2-5 brews per weekday to ensure it looks "busy"
    const brewsPerDay = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < brewsPerDay; j++) {
      // Create a new date object for each brew on this day
      const brewDate = new Date(currentDate);
      
      // Generate a random hour between 8 AM and 5 PM (local time)
      const randomHour = 8 + Math.floor(Math.random() * 10);
      const randomMinute = Math.floor(Math.random() * 60);
      
      brewDate.setHours(randomHour, randomMinute, 0, 0);
      
      history.push({
        timestamp: brewDate.getTime(),
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
  const lastBrewDateObj = new Date(lastBrew.timestamp);
  const lastBrewDateStr = `${lastBrewDateObj.getFullYear()}-${String(lastBrewDateObj.getMonth() + 1).padStart(2, '0')}-${String(lastBrewDateObj.getDate()).padStart(2, '0')}`;
  
  const dailyBrewCount = history.filter(r => {
    const d = new Date(r.timestamp);
    return d.getFullYear() === lastBrewDateObj.getFullYear() &&
           d.getMonth() === lastBrewDateObj.getMonth() &&
           d.getDate() === lastBrewDateObj.getDate();
  }).length;

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
