import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readBrewData, writeBrewData } from '@/lib/storage';
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
});
