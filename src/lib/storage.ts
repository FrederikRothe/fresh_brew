import fs from 'fs/promises';
import path from 'path';

const CSV_FILE_PATH = path.join(process.cwd(), 'coffee_data.csv');

export type BrewData = {
  lastBrewTimestamp: number | null;
  dailyBrewCount: number;
  lastBrewDate: string | null;
};

// Initialize CSV with headers if it doesn't exist
export async function initializeCSV() {
  try {
    await fs.access(CSV_FILE_PATH);
  } catch {
    const headers = 'lastBrewTimestamp,dailyBrewCount,lastBrewDate\n';
    const initialData = '0,0,\n';
    await fs.writeFile(CSV_FILE_PATH, headers + initialData, 'utf-8');
  }
}

export async function readBrewData(): Promise<BrewData> {
  try {
    await initializeCSV();
    const content = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null };

    const [timestamp, count, date] = lines[1].split(',');
    
    return {
      lastBrewTimestamp: timestamp === '0' ? null : Number(timestamp),
      dailyBrewCount: Number(count) || 0,
      lastBrewDate: date || null,
    };
  } catch (error) {
    console.error('Error reading CSV:', error);
    return { lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null };
  }
}

export async function writeBrewData(data: BrewData) {
  try {
    const headers = 'lastBrewTimestamp,dailyBrewCount,lastBrewDate\n';
    const row = `${data.lastBrewTimestamp || 0},${data.dailyBrewCount},${data.lastBrewDate || ''}\n`;
    await fs.writeFile(CSV_FILE_PATH, headers + row, 'utf-8');
  } catch (error) {
    console.error('Error writing CSV:', error);
    throw new Error('Failed to update brew data storage.');
  }
}
