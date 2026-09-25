import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AggregateRhythm,
  bucketBrews,
  computeThresholds,
  levelFor,
  getSlotIndex,
  getUnitIndex,
  SLOT_COUNT,
} from '@/components/AggregateRhythm';

const BIG = 7 * 60 * 1000;
const SMALL = 4 * 60 * 1000;
const ts = (iso: string) => new Date(iso).getTime();

describe('bucketing helpers', () => {
  it('uses Copenhagen time for slots, not UTC/local', () => {
    // 07:10 UTC in March (CET, UTC+1) = 08:10 Copenhagen -> slot 2 (8:00–8:30)
    expect(getSlotIndex(ts('2026-03-18T07:10:00Z'))).toBe(2);
    // Summer (CEST, UTC+2): 07:10 UTC = 09:10 Copenhagen -> slot 4
    expect(getSlotIndex(ts('2026-07-15T07:10:00Z'))).toBe(4);
  });

  it('drops brews outside 07:00–18:00', () => {
    expect(getSlotIndex(ts('2026-03-18T05:59:00Z'))).toBeNull(); // 06:59 CPH
    expect(getSlotIndex(ts('2026-03-18T06:00:00Z'))).toBe(0); // 07:00 CPH
    expect(getSlotIndex(ts('2026-03-18T16:59:00Z'))).toBe(SLOT_COUNT - 1); // 17:59 CPH
    expect(getSlotIndex(ts('2026-03-18T17:00:00Z'))).toBeNull(); // 18:00 CPH
  });

  it('assigns units by Copenhagen date', () => {
    // 23:30 UTC Sunday = 00:30 Monday in Copenhagen
    const t = ts('2026-03-15T23:30:00Z');
    expect(getUnitIndex(t, 'weekly')).toBe(0); // Mon
    expect(getUnitIndex(t, 'monthly')).toBe(15); // 16th
    expect(getUnitIndex(ts('2026-12-31T23:30:00Z'), 'yearly')).toBe(0); // Jan 1 in CPH
    expect(getUnitIndex(ts('2026-03-21T10:00:00Z'), 'weekly')).toBeNull(); // Saturday
  });

  it('counts big and small brews per cell and counts periods', () => {
    const history = [
      { timestamp: ts('2026-03-18T08:05:00Z'), durationMs: BIG }, // Wed 9:05
      { timestamp: ts('2026-03-18T08:20:00Z'), durationMs: SMALL }, // Wed 9:20
      { timestamp: ts('2026-03-25T08:10:00Z'), durationMs: BIG }, // next Wed 9:10
      { timestamp: ts('2026-03-18T08:45:00Z'), durationMs: BIG }, // Wed 9:45 -> next slot
    ];
    const { units, grid, periods } = bucketBrews(history, 'weekly');
    expect(units).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    expect(grid[2][4]).toEqual({ big: 2, small: 1 });
    expect(grid[2][5]).toEqual({ big: 1, small: 0 });
    expect(periods).toBe(2);
    const total = grid.flat().reduce((n, c) => n + c.big + c.small, 0);
    expect(total).toBe(4);
  });

  it('has the right number of columns per mode', () => {
    expect(bucketBrews([], 'monthly').grid).toHaveLength(31);
    expect(bucketBrews([], 'yearly').grid).toHaveLength(12);
    expect(bucketBrews([], 'weekly').grid[0]).toHaveLength(SLOT_COUNT);
  });

  it('derives increasing thresholds from the data', () => {
    expect(computeThresholds([0, 0])).toEqual([]);
    expect(computeThresholds([1, 1, 1])).toEqual([1]);
    const t = computeThresholds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(t[0]).toBe(1);
    expect(t).toHaveLength(4);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(levelFor(0, t)).toBe(0);
    expect(levelFor(1, t)).toBe(1);
    expect(levelFor(12, t)).toBe(4);
  });
});

describe('AggregateRhythm component', () => {
  const history = [
    { timestamp: ts('2026-03-18T08:05:00Z'), durationMs: BIG },
    { timestamp: ts('2026-03-18T08:20:00Z'), durationMs: SMALL },
    { timestamp: ts('2026-03-17T12:00:00Z'), durationMs: SMALL },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z')); // Wednesday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a weekly grid and highlights today', () => {
    render(<AggregateRhythm history={history} />);
    expect(screen.getByText('Wed')).toHaveClass('text-blue-600');
    expect(screen.getByText('Mon')).not.toHaveClass('text-blue-600');
    expect(screen.getAllByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri) / })).toHaveLength(5 * SLOT_COUNT);
    expect(screen.getByText('8AM')).toBeInTheDocument();
    expect(screen.getByText('5PM')).toBeInTheDocument();
  });

  it('shows a big/small breakdown in the tooltip on click', () => {
    render(<AggregateRhythm history={history} />);
    const cell = screen.getByRole('button', { name: /^Wed 9:00–9:30/ });
    fireEvent.click(cell);
    expect(screen.getByRole('tooltip')).toHaveTextContent('2 brews (1 big, 1 small)');
    fireEvent.click(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('filters by pot size', () => {
    render(<AggregateRhythm history={history} />);
    fireEvent.click(screen.getByRole('button', { name: 'Small' }));
    expect(screen.getByRole('button', { name: /^Wed 9:00–9:30/ })).toHaveAttribute('data-count', '1');
    expect(screen.getByRole('button', { name: /^Tue 13:00–13:30/ })).toHaveAttribute('data-count', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Big' }));
    expect(screen.getByRole('button', { name: /^Wed 9:00–9:30/ })).toHaveAttribute('data-count', '1');
    expect(screen.getByRole('button', { name: /^Tue 13:00–13:30/ })).toHaveAttribute('data-count', '0');
  });

  it('switches to monthly and yearly modes', () => {
    render(<AggregateRhythm history={history} />);
    fireEvent.click(screen.getByRole('button', { name: /monthly/i }));
    expect(screen.getByText('18')).toHaveClass('text-blue-600');
    expect(screen.getByRole('button', { name: /^Day 18 9:00–9:30/ })).toHaveAttribute('data-count', '2');

    fireEvent.click(screen.getByRole('button', { name: /yearly/i }));
    expect(screen.getByText('Mar')).toHaveClass('text-blue-600');
    expect(screen.getByRole('button', { name: /^Mar 9:00–9:30/ })).toHaveAttribute('data-count', '2');
  });

  it('renders an empty grid with no history', () => {
    render(<AggregateRhythm history={[]} />);
    expect(screen.getByText('No brews recorded yet')).toBeInTheDocument();
    expect(screen.getByTestId('rhythm-legend')).toHaveTextContent('0');
  });
});
