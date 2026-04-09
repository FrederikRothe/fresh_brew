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
    expect(screen.getByText('Actual vs. Typical')).toBeInTheDocument();
    expect(screen.getByText('You Are Here')).toBeInTheDocument();
    
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

  it('splits the timeline on hover', async () => {
    render(<BrewTimeline history={mockHistory} />);
    
    // Check that track labels are NOT present initially
    expect(screen.queryByTestId('track-label-actual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('track-label-typical')).not.toBeInTheDocument();
    
    // Find the timeline container to hover
    const timelineContainer = screen.getByTestId('timeline-container');
    
    fireEvent.mouseEnter(timelineContainer);
    
    // Labels should be present on hover
    expect(await screen.findByTestId('track-label-actual')).toBeInTheDocument();
    expect(await screen.findByTestId('track-label-typical')).toBeInTheDocument();
    
    fireEvent.mouseLeave(timelineContainer);
  });
});
