import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readBrewData, writeBrewData, appendBrewRecord, readBrewHistory } from '@/lib/storage';
import { createClient } from 'redis';

// Mock redis
vi.mock('redis', () => ({
  createClient: vi.fn(),
}));

describe('Storage Library', () => {
  const mockClient = {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    rPush: vi.fn(),
    lRange: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    isOpen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);
  });

  it('reads brew data from redis', async () => {
    const mockData = { lastBrewTimestamp: 123456789, dailyBrewCount: 5, lastBrewDate: '2026-03-18', brewDurationMs: 420000 };
    mockClient.get.mockResolvedValue(JSON.stringify(mockData));

    const data = await readBrewData();

    expect(mockClient.get).toHaveBeenCalledWith('coffee_brew_data');
    expect(data).toEqual(mockData);
  });

  it('returns default data when redis is empty', async () => {
    mockClient.get.mockResolvedValue(null);

    const data = await readBrewData();

    expect(data).toEqual({ lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null, brewDurationMs: null });
  });

  it('writes brew data to redis', async () => {
    const data = { lastBrewTimestamp: 987654321, dailyBrewCount: 10, lastBrewDate: '2026-03-19', brewDurationMs: 240000 };

    await writeBrewData(data);

    expect(mockClient.set).toHaveBeenCalledWith('coffee_brew_data', JSON.stringify(data));
    expect(mockClient.quit).toHaveBeenCalled();
  });

  it('handles redis read errors gracefully', async () => {
    mockClient.get.mockRejectedValue(new Error('Redis Error'));

    const data = await readBrewData();

    expect(data).toEqual({ lastBrewTimestamp: null, dailyBrewCount: 0, lastBrewDate: null, brewDurationMs: null });
  });

  it('appends a brew record to the history list', async () => {
    const record = { timestamp: 1000, durationMs: 420000 };
    mockClient.rPush.mockResolvedValue(1);

    await appendBrewRecord(record);

    expect(mockClient.rPush).toHaveBeenCalledWith('coffee_brew_history', JSON.stringify(record));
  });

  it('reads brew history from the list', async () => {
    const records = [
      { timestamp: 1000, durationMs: 420000 },
      { timestamp: 2000, durationMs: 240000 },
    ];
    mockClient.lRange.mockResolvedValue(records.map(r => JSON.stringify(r)));

    const history = await readBrewHistory();

    expect(mockClient.lRange).toHaveBeenCalledWith('coffee_brew_history', 0, -1);
    expect(history).toEqual(records);
  });

  it('returns empty array when history list is empty', async () => {
    mockClient.lRange.mockResolvedValue([]);

    const history = await readBrewHistory();

    expect(history).toEqual([]);
  });

  it('returns empty array on history read error', async () => {
    mockClient.lRange.mockRejectedValue(new Error('Redis Error'));

    const history = await readBrewHistory();

    expect(history).toEqual([]);
  });
});
