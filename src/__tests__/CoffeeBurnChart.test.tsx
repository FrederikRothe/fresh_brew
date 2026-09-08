import { render, screen } from '@testing-library/react';
import { CoffeeBurnChart } from '@/components/CoffeeBurnChart';
import { computeBrewAnalytics } from '@/lib/analytics';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('CoffeeBurnChart Component', () => {
  const mockHistory = [
    { timestamp: new Date('2026-03-20T09:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
  ];
  const now = new Date('2026-03-20T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the ISO week in last-7-days mode', () => {
    const analytics = computeBrewAnalytics(mockHistory, [], now);
    render(<CoffeeBurnChart data={analytics.charts.last7.burn} />);
    expect(screen.getByText(/ISO week 12/i)).toBeInTheDocument();
    expect(screen.getByText(/last 7 Copenhagen calendar days/i)).toBeInTheDocument();
  });

  it('displays the month name in this-month mode', () => {
    const analytics = computeBrewAnalytics(mockHistory, [], now);
    render(<CoffeeBurnChart data={analytics.charts.month.burn} />);
    expect(screen.getAllByText(/March/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays the year in this-year mode', () => {
    const analytics = computeBrewAnalytics(mockHistory, [], now);
    render(<CoffeeBurnChart data={analytics.charts.year.burn} />);
    expect(screen.getAllByText(/2026/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows an empty state when the period has no grams', () => {
    const analytics = computeBrewAnalytics([], [], now);
    render(<CoffeeBurnChart data={analytics.charts.last7.burn} />);
    expect(screen.getByText(/No coffee burned in this period/i)).toBeInTheDocument();
  });
});
