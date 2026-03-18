import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalyzePage from '@/app/analyze/page';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import * as actions from '@/app/actions';

// Mock the actions
vi.mock('@/app/actions', () => ({
  getBrewAnalytics: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('AnalyzePage Component', () => {
  const mockAnalytics = {
    totalBrews: 10,
    avgBrewsPerDay: 2,
    hourDistribution: { '9': 5, '10': 5 },
    durationBreakdown: { [7 * 60 * 1000]: 8, [4 * 60 * 1000]: 2 },
    history: [
      { timestamp: new Date('2026-03-18T09:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
      { timestamp: new Date('2026-03-18T10:00:00Z').getTime(), durationMs: 4 * 60 * 1000 },
    ],
  };

  beforeEach(() => {
    // Wednesday, March 18, 2026
    const mockDate = new Date('2026-03-18T12:00:00Z');
    vi.setSystemTime(mockDate);
    vi.mocked(actions.getBrewAnalytics).mockResolvedValue(mockAnalytics as actions.BrewAnalytics);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats and Consumption Rhythm graph', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Brews')).toBeInTheDocument();
      expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
    });
  });

  it('highlights the current day (Wednesday) in weekly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const wednesdayLabel = screen.getByText('Wed');
      expect(wednesdayLabel).toHaveClass('text-blue-600');
    });
  });

  it('highlights the current day (18th) in monthly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      fireEvent.click(monthlyButton);
    });

    const day18Label = screen.getByText('18');
    expect(day18Label).toHaveClass('text-blue-600');
  });

  it('highlights the current month (March) in yearly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      fireEvent.click(yearlyButton);
    });

    const marchLabel = screen.getByText('Mar');
    expect(marchLabel).toHaveClass('text-blue-600');
  });
});
