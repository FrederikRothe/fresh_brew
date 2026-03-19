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

  it('renders graph even with empty history', async () => {
    const emptyAnalytics = {
      totalBrews: 0,
      avgBrewsPerDay: 0,
      hourDistribution: {},
      durationBreakdown: {},
      history: [],
    };
    vi.mocked(actions.getBrewAnalytics).mockResolvedValue(emptyAnalytics as actions.BrewAnalytics);

    render(<AnalyzePage />);

    await waitFor(() => {
      expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
      expect(screen.getByText('Total Brews')).toBeInTheDocument();
      // Should show "--" or "0" stats
      expect(screen.getByText('0')).toBeInTheDocument(); // Total Brews
      expect(screen.getByText('0.0')).toBeInTheDocument(); // Avg / Day
      expect(screen.getByText('0/0')).toBeInTheDocument(); // Big / Small
      expect(screen.getByText('--')).toBeInTheDocument(); // Peak Hour
    });
  });

  it('correctly positions time labels on the Y-axis', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const label7AM = screen.getByText('7 AM');
      const label8AM = screen.getByText('8 AM');
      const label10AM = screen.getByText('10 AM');
      const label12PM = screen.getByText('12 PM');
      const label2PM = screen.getByText('2 PM');
      const label4PM = screen.getByText('4 PM');
      const label6PM = screen.getByText('6 PM');

      expect(label7AM.style.top).toBe('0%');
      expect(label8AM.style.top).toContain('9.09');
      expect(label10AM.style.top).toContain('27.27');
      expect(label12PM.style.top).toContain('45.45');
      expect(label2PM.style.top).toContain('63.63');
      expect(label4PM.style.top).toContain('81.81');
      expect(label6PM.style.top).toBe('100%');
    });
  });
});
