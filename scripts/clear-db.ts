import { createClient } from 'redis';

const redisUrl = process.env.STORAGE_REDIS_URL || 'redis://localhost:6379';
const BREW_KEY = 'coffee_brew_data';
const BREW_HISTORY_KEY = 'coffee_brew_history';

async function clear() {
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();

  console.log('Clearing existing data...');
  await client.del(BREW_KEY);
  await client.del(BREW_HISTORY_KEY);

  await client.quit();
  console.log('Done clearing data.');
}

clear().catch(console.error);
