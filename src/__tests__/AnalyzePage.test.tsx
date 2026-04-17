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
    totalCoffeeGrams: 3080,
    bigBrews: 8,
    smallBrews: 2,
    brewsPerWeek: { '2026-W12': 10 },
    avgBrewsPerDay: 2,
    avgCoffeePerDay: 616,
    hourDistribution: { '9': 5, '10': 5 },
    durationBreakdown: { [7 * 60 * 1000]: 8, [4 * 60 * 1000]: 2 },
    history: [
      { timestamp: new Date('2026-03-18T09:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
      { timestamp: new Date('2026-03-18T10:00:00Z').getTime(), durationMs: 4 * 60 * 1000 },
    ],
    predictedNextBrew: {
      time: '14:30',
      isOverdue: false,
      overdueMins: 0,
    },
    totalLiters: 51.3,
    espressoEquivalent: 171,
    totalWaitingMins: 70,
    wasteHistory: [],
    totalWasteCount: 5,
    wasteByDuration: { [7 * 60 * 1000]: 3, [4 * 60 * 1000]: 2 },
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
      expect(screen.getByText('Coffee Burn Rate')).toBeInTheDocument();
      expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
    });
  });

  it('highlights the current day (Wednesday) in weekly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      // AggregateRhythm uses div for day labels, CoffeeBurnChart uses span
      const wednesdayLabels = screen.getAllByText('Wed');
      const rhythmLabel = wednesdayLabels.find(el => el.tagName === 'DIV');
      expect(rhythmLabel).toHaveClass('text-blue-600');
    });
  });

  it('highlights the current day (18th) in monthly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      // Click the monthly button in the first chart (AggregateRhythm)
      const monthlyButtons = screen.getAllByRole('button', { name: /monthly/i });
      fireEvent.click(monthlyButtons[0]);
    });

    const day18Label = screen.getByText('18');
    expect(day18Label).toHaveClass('text-blue-600');
  });

  it('highlights the current month (March) in yearly mode', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const yearlyButtons = screen.getAllByRole('button', { name: /yearly/i });
      fireEvent.click(yearlyButtons[0]);
    });

    const marchLabel = screen.getByText('Mar');
    expect(marchLabel).toHaveClass('text-blue-600');
  });

  it('renders graph even with empty history', async () => {
    const emptyAnalytics = {
      totalBrews: 0,
      totalCoffeeGrams: 0,
      bigBrews: 0,
      smallBrews: 0,
      brewsPerWeek: {},
      avgBrewsPerDay: 0,
      avgCoffeePerDay: 0,
      hourDistribution: {},
      durationBreakdown: {},
      history: [],
      predictedNextBrew: null,
      totalLiters: 0,
      espressoEquivalent: 0,
      totalWaitingMins: 0,
      wasteHistory: [],
      totalWasteCount: 0,
      wasteByDuration: {},
    };
    vi.mocked(actions.getBrewAnalytics).mockResolvedValue(emptyAnalytics as actions.BrewAnalytics);

    render(<AnalyzePage />);

    await waitFor(() => {
      expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
      expect(screen.getByText('Total Brews')).toBeInTheDocument();
      expect(screen.getByText('Coffee Burn Rate')).toBeInTheDocument();
      
      // Should show "0" stats for both Total Brews and Total Waste
      const zeroStats = screen.getAllByText('0');
      expect(zeroStats.length).toBeGreaterThanOrEqual(2);
      
      expect(screen.getByText('0.0')).toBeInTheDocument(); // Avg / Day
      
      expect(screen.getByText('0/0')).toBeInTheDocument(); // Big / Small
      expect(screen.getByText('--')).toBeInTheDocument(); // Peak Hour
    });
  });

  it('correctly positions time labels on the Y-axis', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      const getLabelByTop = (text: string) => {
        const labels = screen.getAllByText(text);
        return labels.find(el => (el as HTMLElement).style.top !== '') as HTMLElement;
      };

      const label7AM = getLabelByTop('7 AM');
      const label8AM = getLabelByTop('8 AM');
      const label10AM = getLabelByTop('10 AM');
      const label12PM = getLabelByTop('12 PM');
      const label2PM = getLabelByTop('2 PM');
      const label4PM = getLabelByTop('4 PM');
      const label6PM = getLabelByTop('6 PM');

      expect(label7AM.style.top).toBe('0%');
      expect(label8AM.style.top).toContain('9.09');
      expect(label10AM.style.top).toContain('27.27');
      expect(label12PM.style.top).toContain('45.45');
      expect(label2PM.style.top).toContain('63.63');
      expect(label4PM.style.top).toContain('81.81');
      expect(label6PM.style.top).toBe('100%');
    });
  });

  it('renders Predicted Next Brew banner when available', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Next Brew Predicted')).toBeInTheDocument();
      expect(screen.getByText('14:30')).toBeInTheDocument();
      expect(screen.getByText(/Based on your typical Wednesday rhythm/i)).toBeInTheDocument();
    });
  });

  it('renders Deep Dive Fun Facts section', async () => {
    render(<AnalyzePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Deep Dive Fun Facts')).toBeInTheDocument();
      expect(screen.getByText('51L')).toBeInTheDocument();
      expect(screen.getByText('171 Shots')).toBeInTheDocument();
      expect(screen.getByText('1.2h')).toBeInTheDocument(); // 70 mins = 1.166...h -> 1.2h
      expect(screen.getByText('Waste Correlation')).toBeInTheDocument();
      expect(screen.getByText('3 Big vs 2 Small')).toBeInTheDocument();
    });
  });
});
