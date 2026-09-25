import { render, screen, fireEvent } from '@testing-library/react';
import { BrewTimeline } from '@/components/BrewTimeline';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('BrewTimeline Component', () => {
  const mockHistory = [
    // Today (2026-03-18)
    { timestamp: new Date('2026-03-18T08:30:00Z').getTime(), durationMs: 7 * 60 * 1000 },
    { timestamp: new Date('2026-03-18T10:15:00Z').getTime(), durationMs: 7 * 60 * 1000 },
    // Last Wednesday (2026-03-11)
    { timestamp: new Date('2026-03-11T08:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
    { timestamp: new Date('2026-03-11T10:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
    { timestamp: new Date('2026-03-11T13:00:00Z').getTime(), durationMs: 7 * 60 * 1000 },
  ];

  beforeEach(() => {
    // Wednesday, March 18, 2026, 11:00 AM UTC
    const mockDate = new Date('2026-03-18T11:00:00Z');
    vi.setSystemTime(mockDate);
  });

  it('renders correctly with history', () => {
    render(<BrewTimeline history={mockHistory} />);
    
    expect(screen.getByText('Daily Rhythm')).toBeInTheDocument();
    expect(screen.getByText('Today vs. a typical Wed')).toBeInTheDocument();
    // 11:00 UTC = 12:00 Copenhagen (CET)
    expect(screen.getByTestId('now-indicator')).toHaveTextContent('Now 12:00');
    
    expect(screen.getByText(/Pot #1 @ 09:30/)).toBeInTheDocument();
    expect(screen.getByText(/Pot #2 @ 11:15/)).toBeInTheDocument();
  });

  it('calculates typical brews based on same day of week', () => {
    render(<BrewTimeline history={mockHistory} />);
    
    expect(screen.getByText(/Typical Pot #1 - 09:15/)).toBeInTheDocument();
    expect(screen.getByText(/Typical Pot #2 - 11:07/)).toBeInTheDocument();
    expect(screen.getByText(/Typical Pot #3 - 14:00/)).toBeInTheDocument();
  });

  it('shows appropriate track info when ahead of schedule', () => {
    render(<BrewTimeline history={mockHistory} />);
    
    expect(screen.getByText(/You're right on schedule with your typical rhythm/)).toBeInTheDocument();
  });

  it('always shows labelled Today / Typical rows and a pot-size legend', () => {
    render(<BrewTimeline history={mockHistory} />);

    expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    expect(screen.getByTestId('track-label-actual')).toHaveTextContent('Today');
    expect(screen.getByTestId('track-label-typical')).toHaveTextContent('Typical Wed');
    expect(screen.getByText('Big pot')).toBeInTheDocument();
    expect(screen.getByText('Small pot')).toBeInTheDocument();
  });

  it('pins a marker tooltip open on tap and closes it on a second tap', () => {
    render(<BrewTimeline history={mockHistory} />);

    const marker = screen.getByRole('button', { name: /Pot 1 at 09:30, big/ });
    const tooltip = screen.getByText(/Pot #1 @ 09:30/).parentElement as HTMLElement;
    expect(tooltip).toHaveClass('opacity-0');

    fireEvent.click(marker);
    expect(tooltip).toHaveClass('opacity-100');

    fireEvent.click(marker);
    expect(tooltip).toHaveClass('opacity-0');
  });

  it('toggles the prediction explanation on tap', () => {
    render(
      <BrewTimeline
        history={mockHistory}
        predictedNextBrew={{ time: '14:30', sequenceIndex: 3, dayName: 'Wednesday' }}
      />
    );

    const infoButton = screen.getByRole('button', { name: /How is this predicted/ });
    expect(infoButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(infoButton);
    expect(infoButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent(/pot #3 on a Wednesday/);
  });
});
