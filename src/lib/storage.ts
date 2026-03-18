import { createClient } from 'redis';

const redisUrl = process.env.STORAGE_REDIS_URL;

export type BrewData = {
  lastBrewTimestamp: number | null;
  dailyBrewCount: number;
  lastBrewDate: string | null;
};

const BREW_KEY = 'coffee_brew_data';

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
    
    // In serverless, we should quit the client to avoid leaking connections
    // but Node-Redis 4.x client can be reused if kept in a global variable.
    // For simplicity and to avoid "connection limit" errors on some Redis plans:
    await client.quit();

    if (!data) {
      return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from Redis:', error);
    return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null };
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
