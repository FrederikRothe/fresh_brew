import { render, screen, fireEvent } from '@testing-library/react';
import { CoffeeBurnChart } from '@/components/CoffeeBurnChart';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('CoffeeBurnChart Component', () => {
  const mockHistory = [
    { timestamp: new Date('2026-03-20T09:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
  ];

  beforeEach(() => {
    // Friday, March 20, 2026
    const mockDate = new Date('2026-03-20T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the week number in weekly mode', () => {
    render(<CoffeeBurnChart history={mockHistory} />);
    // March 20, 2026 is Week 12
    expect(screen.getByText(/Week 12/i)).toBeInTheDocument();
  });

  it('displays the month name in monthly mode', () => {
    render(<CoffeeBurnChart history={mockHistory} />);
    const monthlyButton = screen.getByRole('button', { name: /monthly/i });
    fireEvent.click(monthlyButton);
    expect(screen.getByText(/March/i)).toBeInTheDocument();
  });

  it('displays the year in yearly mode', () => {
    render(<CoffeeBurnChart history={mockHistory} />);
    const yearlyButton = screen.getByRole('button', { name: /yearly/i });
    fireEvent.click(yearlyButton);
    expect(screen.getByText(/2026/i)).toBeInTheDocument();
  });

  it('highlights today and shows total and average in weekly mode', () => {
    render(<CoffeeBurnChart history={mockHistory} />);
    const todayBar = screen.getByRole('button', { name: 'Fri: 340g' });
    expect(todayBar.querySelector('.bg-amber-600')).not.toBeNull();
    expect(screen.getAllByText('340g', { selector: 'span.text-xl' })).toHaveLength(2); // total + avg
    expect(screen.getByTestId('burn-avg-line')).toBeInTheDocument();
  });

  it('labels only every 5th day in monthly mode (plus the 1st and today)', () => {
    render(<CoffeeBurnChart history={mockHistory} />);
    fireEvent.click(screen.getByRole('button', { name: /monthly/i }));
    for (const d of ['1', '5', '10', '15', '20', '25', '30']) {
      expect(screen.getByText(d, { selector: 'span' })).toBeInTheDocument();
    }
    // Neighbours of today (20th) and non-multiples are not labelled
    expect(screen.queryByText('3', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.queryByText('19', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('shows an empty-state average when there is no data', () => {
    render(<CoffeeBurnChart history={[]} />);
    expect(screen.queryByTestId('burn-avg-line')).not.toBeInTheDocument();
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });
});
