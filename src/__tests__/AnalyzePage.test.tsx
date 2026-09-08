import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AnalyzeDashboard } from '@/components/AnalyzeDashboard';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeBrewAnalytics } from '@/lib/analytics';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  getBrewAnalytics: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const BIG = 7 * 60 * 1000;
const SMALL = 4 * 60 * 1000;

function brew(iso: string, durationMs = BIG) {
  return { timestamp: new Date(iso).getTime(), durationMs };
}

describe('AnalyzeDashboard', () => {
  const now = new Date('2026-03-18T12:00:00Z');

  const mockAnalytics = computeBrewAnalytics(
    [
      brew('2026-03-18T08:00:00Z', BIG),
      brew('2026-03-18T09:00:00Z', SMALL),
      brew('2026-03-11T08:00:00Z', BIG),
      brew('2026-03-11T09:00:00Z', BIG),
      brew('2026-03-11T12:00:00Z', BIG),
      brew('2026-03-16T08:00:00Z', BIG),
      brew('2026-03-17T08:00:00Z', BIG),
      brew('2026-03-10T08:00:00Z', BIG),
      brew('2026-03-04T08:00:00Z', SMALL),
      brew('2026-03-04T10:00:00Z', BIG),
    ],
    [
      {
        timestamp: new Date('2026-03-16T10:00:00Z').getTime(),
        lastBrewTimestamp: new Date('2026-03-16T08:00:00Z').getTime(),
        lastBrewDurationMs: BIG,
      },
      {
        timestamp: new Date('2026-03-04T12:00:00Z').getTime(),
        lastBrewTimestamp: new Date('2026-03-04T08:00:00Z').getTime(),
        lastBrewDurationMs: SMALL,
      },
    ],
    now,
  );

  beforeEach(() => {
    vi.setSystemTime(now);
    vi.mocked(actions.getBrewAnalytics).mockResolvedValue(mockAnalytics);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats and Consumption Rhythm graph', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    expect(screen.getByText('Total Brews')).toBeInTheDocument();
    expect(screen.getByText('Coffee Burn Rate')).toBeInTheDocument();
    expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
    expect(screen.getByText('Avg g / day')).toBeInTheDocument();
    expect(screen.getByText('Freshness & Waste')).toBeInTheDocument();
  });

  it('highlights the current day (Wednesday) in last-7-days mode', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    const wednesdayLabels = screen.getAllByText('Wed');
    const rhythmLabel = wednesdayLabels.find((el) => el.tagName === 'DIV');
    expect(rhythmLabel).toHaveClass('text-blue-600');
  });

  it('highlights the current day (18th) in this-month mode', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    fireEvent.click(screen.getByRole('button', { name: /this month/i }));
    const day18Label = screen.getByText('18');
    expect(day18Label).toHaveClass('text-blue-600');
  });

  it('highlights the current month (March) in this-year mode', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    fireEvent.click(screen.getByRole('button', { name: /this year/i }));
    const marchLabels = screen.getAllByText('Mar');
    const rhythmLabel = marchLabels.find((el) => el.tagName === 'DIV');
    expect(rhythmLabel).toHaveClass('text-blue-600');
  });

  it('renders graph even with empty history', () => {
    const emptyAnalytics = computeBrewAnalytics([], [], now);
    render(<AnalyzeDashboard initialAnalytics={emptyAnalytics} />);

    expect(screen.getByText('Consumption Rhythm')).toBeInTheDocument();
    expect(screen.getByText('Total Brews')).toBeInTheDocument();
    expect(screen.getByText('Coffee Burn Rate')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
  });

  it('correctly positions time labels on the Y-axis', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);

    const getLabelByTop = (text: string) => {
      const labels = screen.getAllByText(text);
      return labels.find((el) => (el as HTMLElement).style.top !== '') as HTMLElement;
    };

    expect(getLabelByTop('7AM').style.top).toBe('0%');
    expect(getLabelByTop('8AM').style.top).toContain('9.09');
    expect(getLabelByTop('10AM').style.top).toContain('27.27');
    expect(getLabelByTop('12PM').style.top).toContain('45.45');
    expect(getLabelByTop('2PM').style.top).toContain('63.63');
    expect(getLabelByTop('4PM').style.top).toContain('81.81');
    expect(getLabelByTop('6PM').style.top).toBe('100%');
  });

  it('renders Predicted Next Brew banner when available', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    expect(screen.getByText('Next Brew Overdue')).toBeInTheDocument();
    expect(screen.getByText(/on a Wednesday/i)).toBeInTheDocument();
  });

  it('renders overdue messaging when the prediction is in the past', () => {
    const overdue = {
      ...mockAnalytics,
      predictedNextBrew: { time: '09:15', isOverdue: true, overdueMins: 225 },
    };
    render(<AnalyzeDashboard initialAnalytics={overdue} />);
    expect(screen.getByText('Next Brew Overdue')).toBeInTheDocument();
    expect(screen.getByText(/Should have been brewed 3h 45m ago/i)).toBeInTheDocument();
  });

  it('renders Deep Dive Fun Facts and waste rates', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    expect(screen.getByText('Deep Dive Fun Facts')).toBeInTheDocument();
    expect(screen.getByText('Waste Correlation')).toBeInTheDocument();
    expect(screen.getByText('Big pot waste rate')).toBeInTheDocument();
    expect(screen.getByText('Small pot waste rate')).toBeInTheDocument();
  });

  it('formats peak hour as Copenhagen HH:mm', () => {
    render(<AnalyzeDashboard initialAnalytics={mockAnalytics} />);
    expect(screen.getByText('Peak Hour')).toBeInTheDocument();
    expect(screen.getAllByText('09:00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an error state with retry instead of a blank page', async () => {
    render(
      <AnalyzeDashboard
        initialAnalytics={null}
        initialError="Could not load analytics from storage. Check Redis and try again."
      />,
    );
    expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Consumption Rhythm')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => {
      expect(actions.getBrewAnalytics).toHaveBeenCalled();
    });
  });
});
