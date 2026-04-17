import { createClient } from 'redis';

const redisUrl = process.env.STORAGE_REDIS_URL;

export type BrewRecord = {
  timestamp: number;  // Unix ms — when brew started
  durationMs: number; // brew duration in ms
};

export type WasteRecord = {
  timestamp: number; // Unix ms — when coffee was wasted
};

export type BrewData = {
  lastBrewTimestamp: number | null;
  dailyBrewCount: number;
  lastBrewDate: string | null;
  brewDurationMs: number | null;
};

const BREW_KEY = 'coffee_brew_data';
const BREW_HISTORY_KEY = 'coffee_brew_history';
const WASTE_HISTORY_KEY = 'coffee_waste_history';

async function getRedisClient() {
  const client = createClient({
    url: redisUrl
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

export async function readBrewData(): Promise<BrewData> {
  try {
    const client = await getRedisClient();
    const data = await client.get(BREW_KEY);
    await client.quit();

    if (!data) {
      return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null, brewDurationMs: null };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from Redis:', error);
    return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null, brewDurationMs: null };
  }
}

export async function writeBrewData(data: BrewData) {
  try {
    const client = await getRedisClient();
    await client.set(BREW_KEY, JSON.stringify(data));
    await client.quit();
  } catch (error) {
    console.error('Error writing to Redis:', error);
    throw new Error('Failed to update brew data storage.');
  }
}

export async function appendBrewRecord(record: BrewRecord): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.rPush(BREW_HISTORY_KEY, JSON.stringify(record));
    await client.quit();
  } catch (error) {
    console.error('Error appending brew record:', error);
    throw new Error('Failed to append brew record.');
  }
}

export async function readBrewHistory(): Promise<BrewRecord[]> {
  try {
    const client = await getRedisClient();
    const raw = await client.lRange(BREW_HISTORY_KEY, 0, -1);
    await client.quit();
    return raw.map(r => JSON.parse(r));
  } catch (error) {
    console.error('Error reading brew history:', error);
    return [];
  }
}

export async function appendWasteRecord(record: WasteRecord): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.rPush(WASTE_HISTORY_KEY, JSON.stringify(record));
    await client.quit();
  } catch (error) {
    console.error('Error appending waste record:', error);
    throw new Error('Failed to append waste record.');
  }
}

export async function readWasteHistory(): Promise<WasteRecord[]> {
  try {
    const client = await getRedisClient();
    const raw = await client.lRange(WASTE_HISTORY_KEY, 0, -1);
    await client.quit();
    return raw.map(r => JSON.parse(r));
  } catch (error) {
    console.error('Error reading waste history:', error);
    return [];
  }
}
