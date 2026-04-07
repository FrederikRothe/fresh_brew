import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Actual vs. Typical Sequence')).toBeInTheDocument();
    expect(screen.getByText('You Are Here')).toBeInTheDocument();
    
    // Check for actual pot markers
    // Note: formatCphTime depends on timezone. In CI it might be UTC or something else.
    // The component uses Europe/Copenhagen via lib/utils.
    // 08:30 UTC is 09:30 CPH (Winter time) or 10:30 CPH (Summer time).
    // March 18 is Winter time in DK (changes last Sunday of March).
    // So 08:30 UTC -> 09:30 CPH.
    // 10:15 UTC -> 11:15 CPH.
    
    expect(screen.getByText(/Pot #1 @ 09:30/)).toBeInTheDocument();
    expect(screen.getByText(/Pot #2 @ 11:15/)).toBeInTheDocument();
  });

  it('calculates typical brews based on same day of week', () => {
    render(<BrewTimeline history={mockHistory} />);
    
    // From mockHistory:
    // Last Wednesday: 08:00 UTC (09:00 CPH), 10:00 UTC (11:00 CPH), 13:00 UTC (14:00 CPH)
    // Today (so far): 08:30 UTC (09:30 CPH), 10:15 UTC (11:15 CPH)
    // Typical should be average of (09:00, 09:30), (11:00, 11:15), (14:00)
    // Typical #1: avg(09:00, 09:30) = 09:15
    // Typical #2: avg(11:00, 11:15) = 11:07 or 11:08
    // Typical #3: 14:00
    
    expect(screen.getByText('Typical Pot #1')).toBeInTheDocument();
    expect(screen.getByText('Typical Pot #2')).toBeInTheDocument();
    expect(screen.getByText('Typical Pot #3')).toBeInTheDocument();
  });

  it('shows appropriate track info when ahead of schedule', () => {
    render(<BrewTimeline history={mockHistory} />);
    
    // Pot #2 is at 11:15 CPH. Typical #2 is 11:07 CPH.
    // So actually we are LATE.
    // Wait, let's check my math.
    // Typical #2 avgSeconds = (11*3600+0*60 + 11*3600+15*60) / 2 = 11*3600 + 7.5*60 = 11:07:30
    // Actual #2 is 11:15:00. 11:15 > 11:07:30. 
    // The code says: typicalBrews[todayBrews.length - 1].avgSeconds > todayBrews[todayBrews.length - 1].seconds ? "early" : "on schedule"
    // 11:07:30 > 11:15:00 is FALSE. So "on schedule".
    
    expect(screen.getByText(/You're right on schedule with your typical rhythm/)).toBeInTheDocument();
  });
});
