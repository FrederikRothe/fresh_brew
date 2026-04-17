import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { BrewStatus } from '@/app/actions';
import * as actions from '@/app/actions';

// Mock the actions and hooks
vi.mock('@/app/actions', () => ({
  getBrewStatus: vi.fn(),
  startBrew: vi.fn(),
  logWaste: vi.fn(),
}));

const mockSetAdminPassword = vi.fn();
const mockHandleLogin = vi.fn();
const mockHandleLogout = vi.fn();

let mockAdminPassword: string | null = 'password123';

vi.mock('@/hooks/use-admin-auth', () => ({
  useAdminAuth: () => ({
    adminPassword: mockAdminPassword,
    setAdminPassword: mockSetAdminPassword,
    handleLogin: mockHandleLogin,
    handleLogout: mockHandleLogout,
  }),
}));

// Mock the ConfirmModal to make testing easier
vi.mock('../components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, title }: any) => isOpen ? (
    <div data-testid="confirm-modal">
      <span>{title}</span>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  ) : null
}));

import {
  DEFAULT_BREW_TIME_MS as BREW_TIME_MS,
  FRESH_THRESHOLD_MS,
  SOUR_THRESHOLD_MS,
  RESET_THRESHOLD_MS,
} from "@/lib/constants";

describe('Dashboard Component', () => {
  const initialStatus: BrewStatus = {
    lastBrewTimestamp: Date.now(),
    dailyBrewCount: 1,
    lastBrewDate: new Date().toISOString().split('T')[0],
    brewDurationMs: null,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Set a consistent starting time
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));
    mockAdminPassword = 'password123';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders correctly in brewer mode (with admin password)', () => {
    render(<Dashboard initialStatus={initialStatus} />);
    expect(screen.getByText(/Coffee Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Indicate Waste/i)).toBeInTheDocument();
    expect(screen.getByText(/Poured in sink/i)).toBeInTheDocument();
    expect(screen.queryByText(/Daily Pot Count/i)).not.toBeInTheDocument();
  });

  it('renders correctly in viewer mode (without admin password)', () => {
    mockAdminPassword = null;
    render(<Dashboard initialStatus={initialStatus} />);
    expect(screen.getByText(/Coffee Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Pot Count/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/Indicate Waste/i)).not.toBeInTheDocument();
  });

  it('logs waste when the Waste button is clicked and confirmed', async () => {
    vi.useRealTimers();
    vi.stubGlobal('alert', vi.fn());
    const logWasteMock = vi.mocked(actions.logWaste).mockResolvedValue({ success: true, timestamp: Date.now() });

    render(<Dashboard initialStatus={initialStatus} />);
    
    // Initial click to open modal
    const wasteButton = screen.getByText(/Indicate Waste/i).closest('button');
    fireEvent.click(wasteButton!);

    // Check if modal is visible
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText('Log Coffee Waste?')).toBeInTheDocument();

    // Click confirm in the modal
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(logWasteMock).toHaveBeenCalledWith('password123');
      expect(window.alert).toHaveBeenCalledWith("Waste logged successfully.");
    });
  });

  it('disables the Start Brew buttons for 60 seconds after a brew starts', () => {
    const now = Date.now();
    const status = { ...initialStatus, lastBrewTimestamp: now - 30000 }; // 30 seconds ago
    render(<Dashboard initialStatus={status} />);
    
    // Both buttons should show "Brew Started"
    const brewStartedButtons = screen.getAllByText(/Brew Started/i, { selector: 'span' });
    expect(brewStartedButtons).toHaveLength(2);
    
    brewStartedButtons.forEach(span => {
      expect(span.closest('button')).toBeDisabled();
    });
    
    expect(screen.getAllByText(/Cooldown active/i, { selector: 'span' })).toHaveLength(2);
  });

  it('enables the Start Brew buttons after 60 seconds have passed', () => {
    const now = Date.now();
    const status = { ...initialStatus, lastBrewTimestamp: now - 61000 }; // 61 seconds ago
    render(<Dashboard initialStatus={status} />);
    
    const bigBrewButton = screen.getByText(/Start BIG Brew/i).closest('button');
    expect(bigBrewButton).not.toBeDisabled();
    expect(screen.queryByText(/Cooldown active/i)).not.toBeInTheDocument();
  });

  it('always shows the Analyze Consumption link', () => {
    render(<Dashboard initialStatus={initialStatus} />);
    expect(screen.getByText(/Analyze Consumption/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analyze Consumption/i })).toHaveAttribute('href', '/analyze');
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

  it('shows FRESH! state after small brew is complete (4m)', () => {
    const now = Date.now();
    const SMALL_BREW_TIME_MS = 4 * 60 * 1000;
    // 5 minutes later (4m brew time + 1m)
    const status = { 
      ...initialStatus, 
      lastBrewTimestamp: now - (SMALL_BREW_TIME_MS + 60000),
      brewDurationMs: SMALL_BREW_TIME_MS 
    };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText(/FRESH!/i)).toBeInTheDocument();
    expect(screen.getByText(/Brewed recently. Enjoy!/i)).toBeInTheDocument();
  });

  it('shows --:-- when data is too old (RESET_THRESHOLD)', () => {
    const now = Date.now();
    const status = { ...initialStatus, lastBrewTimestamp: now - (RESET_THRESHOLD_MS + 1000) };
    render(<Dashboard initialStatus={status} />);
    
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(screen.getByText(/STALE \/ EMPTY/i)).toBeInTheDocument();
  });

  it('shows hh:mm:ss when time exceeds 60 minutes', () => {
    const now = Date.now();
    // 7m (brew) + 65m (since ready) = 72m total
    const sixtyFiveMinsMs = 65 * 60 * 1000;
    const status = { ...initialStatus, lastBrewTimestamp: now - (BREW_TIME_MS + sixtyFiveMinsMs) };
    render(<Dashboard initialStatus={status} />);
    
    // 65 minutes = 01:05:00
    expect(screen.getByText('01:05:00')).toBeInTheDocument();
  });
});
