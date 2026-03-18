import { render, screen } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { BrewStatus } from '@/app/actions';

// Mock the actions
vi.mock('@/app/actions', () => ({
  getBrewStatus: vi.fn(),
  startBrew: vi.fn(),
}));

// Constants from Dashboard for testing
const BREW_TIME_MS = 7 * 60 * 1000;
const FRESH_THRESHOLD_MS = 15 * 60 * 1000;
const SOUR_THRESHOLD_MS = 25 * 60 * 1000;
const RESET_THRESHOLD_MS = 60 * 60 * 1000;

describe('Dashboard Component', () => {
  const initialStatus: BrewStatus = {
    lastBrewTimestamp: Date.now(),
    dailyBrewCount: 1,
    lastBrewDate: new Date().toISOString().split('T')[0],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Set a consistent starting time
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders correctly with initial status', () => {
    render(<Dashboard initialStatus={initialStatus} />);
    expect(screen.getByText(/Coffee Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Pot Count/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows BREWING... state immediately after brew starts', () => {
    const now = Date.now();
    const status = { ...initialStatus, lastBrewTimestamp: now };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText('BREWING...')).toBeInTheDocument();
    expect(screen.getByText(/Patience, the magic is happening/i)).toBeInTheDocument();
  });

  it('shows FRESH! state after brewing is complete', () => {
    const now = Date.now();
    // 8 minutes later (7m brew time + 1m)
    const status = { ...initialStatus, lastBrewTimestamp: now - (BREW_TIME_MS + 60000) };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText(/FRESH!/i)).toBeInTheDocument();
    expect(screen.getByText(/Brewed recently. Enjoy!/i)).toBeInTheDocument();
  });

  it('shows GETTING SOUR state after fresh threshold', () => {
    const now = Date.now();
    // 7m (brew) + 16m (past fresh)
    const status = { ...initialStatus, lastBrewTimestamp: now - (BREW_TIME_MS + FRESH_THRESHOLD_MS + 60000) };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText(/GETTING SOUR/i)).toBeInTheDocument();
    expect(screen.getByText(/Getting there, but still tasty/i)).toBeInTheDocument();
  });

  it('shows STALE state after sour threshold', () => {
    const now = Date.now();
    // 7m (brew) + 26m (past sour)
    const status = { ...initialStatus, lastBrewTimestamp: now - (BREW_TIME_MS + SOUR_THRESHOLD_MS + 60000) };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText(/STALE/i)).toBeInTheDocument();
    expect(screen.getByText(/Running low or getting cold/i)).toBeInTheDocument();
  });

  it('shows --:-- when data is too old (RESET_THRESHOLD)', () => {
    const now = Date.now();
    const status = { ...initialStatus, lastBrewTimestamp: now - (RESET_THRESHOLD_MS + 1000) };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(screen.getByText(/STALE \/ EMPTY/i)).toBeInTheDocument();
  });
});
