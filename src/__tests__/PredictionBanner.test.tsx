import { render, screen } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { BrewStatus } from '@/app/actions';

// Mock the hooks
const mockUseAdminAuth = vi.fn();
vi.mock('@/hooks/use-admin-auth', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

describe('Dashboard Prediction Banner', () => {
  const initialStatus: BrewStatus = {
    lastBrewTimestamp: Date.now(),
    dailyBrewCount: 1,
    lastBrewDate: new Date().toISOString().split('T')[0],
    brewDurationMs: null,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders prediction banner when not in admin mode and prediction exists', () => {
    mockUseAdminAuth.mockReturnValue({
      adminPassword: null,
      setAdminPassword: vi.fn(),
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(
      <Dashboard
        initialStatus={initialStatus}
        predictedNextBrew={{
          time: '14:30',
          isOverdue: false,
          overdueMins: 0,
        }}
      />,
    );
    
    expect(screen.getByText('Next Brew Predicted')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('Historical Estimate')).toBeInTheDocument();
  });

  it('renders overdue banner when brew is late', () => {
    mockUseAdminAuth.mockReturnValue({
      adminPassword: null,
      setAdminPassword: vi.fn(),
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(
      <Dashboard
        initialStatus={initialStatus}
        predictedNextBrew={{
          time: '11:30',
          isOverdue: true,
          overdueMins: 30,
        }}
      />,
    );
    
    expect(screen.getByText('Next Brew Overdue')).toBeInTheDocument();
    expect(screen.getByText('11:30')).toBeInTheDocument();
    expect(screen.getByText('Should have been brewed 30m ago')).toBeInTheDocument();
  });

  it('does NOT render prediction banner when in admin mode', () => {
    mockUseAdminAuth.mockReturnValue({
      adminPassword: 'password123',
      setAdminPassword: vi.fn(),
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(
      <Dashboard
        initialStatus={initialStatus}
        predictedNextBrew={{
          time: '14:30',
          isOverdue: false,
          overdueMins: 0,
        }}
      />,
    );
    
    expect(screen.queryByText('Next Brew Predicted')).not.toBeInTheDocument();
    expect(screen.queryByText('14:30')).not.toBeInTheDocument();
  });

  it('does NOT render prediction banner when no prediction exists', () => {
    mockUseAdminAuth.mockReturnValue({
      adminPassword: null,
      setAdminPassword: vi.fn(),
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(<Dashboard initialStatus={initialStatus} predictedNextBrew={null} />);
    
    expect(screen.queryByText('Next Brew Predicted')).not.toBeInTheDocument();
  });
});
