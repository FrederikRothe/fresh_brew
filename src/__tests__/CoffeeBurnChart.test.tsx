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
});
