import { describe, expect, it } from 'vitest';
import { everyDay, hoursSummary, isLateNight, openLabel, openState, saigonClock } from '@/lib/hours';

// Builds a Date for a Saigon local time (UTC+7, no DST).
const at = (iso: string) => new Date(`${iso}+07:00`);
// 2026-11-09 is a Monday.

describe('saigonClock', () => {
  it('uses Asia/Ho_Chi_Minh regardless of server timezone', () => {
    expect(saigonClock(new Date('2026-11-08T17:30:00Z'))).toEqual({ day: 1, minutes: 30 }); // Mon 00:30 in Saigon
  });
});

describe('openState', () => {
  const day = everyDay(['06:00', '21:00']);
  const overnight = everyDay(['17:00', '02:00']);
  const twoShifts = everyDay(['05:30', '10:30'], ['15:00', '20:00']);

  it('open inside a normal window', () => {
    expect(openState(day, at('2026-11-09T12:00:00'))).toEqual({ open: true, closesAt: '21:00' });
  });

  it('closed at closing time, opens tomorrow', () => {
    expect(openState(day, at('2026-11-09T21:00:00'))).toEqual({ open: false, opensAt: '06:00', opensDayOffset: 1 });
  });

  it('closed before opening today', () => {
    expect(openState(day, at('2026-11-09T05:00:00'))).toEqual({ open: false, opensAt: '06:00', opensDayOffset: 0 });
  });

  it('overnight window: open late evening', () => {
    expect(openState(overnight, at('2026-11-09T23:30:00'))).toEqual({ open: true, closesAt: '02:00' });
  });

  it("overnight window: still open after midnight from yesterday's slot", () => {
    expect(openState(overnight, at('2026-11-10T01:15:00'))).toEqual({ open: true, closesAt: '02:00' });
  });

  it('overnight window: closed after it ends', () => {
    expect(openState(overnight, at('2026-11-10T02:00:00')).open).toBe(false);
  });

  it('overnight only on Saturday does not leak into Monday', () => {
    const satOnly = [{ day: 6, open: '18:00', close: '02:00' }];
    expect(openState(satOnly, at('2026-11-15T01:00:00')).open).toBe(true); // Sunday 01:00
    expect(openState(satOnly, at('2026-11-09T01:00:00')).open).toBe(false); // Monday 01:00
  });

  it('gap between two shifts', () => {
    expect(openState(twoShifts, at('2026-11-09T12:00:00'))).toEqual({ open: false, opensAt: '15:00', opensDayOffset: 0 });
  });

  it('no hours at all', () => {
    expect(openState([], at('2026-11-09T12:00:00'))).toEqual({ open: false });
  });
});

describe('labels', () => {
  it('formats open/closed lines', () => {
    expect(openLabel({ open: true, closesAt: '21:00' })).toBe('Đang mở · đến 21:00');
    expect(openLabel({ open: false, opensAt: '15:00', opensDayOffset: 0 })).toBe('Mở lúc 15:00');
    expect(openLabel({ open: false })).toBe('Đã đóng cửa');
  });

  it('summarises identical days', () => {
    expect(hoursSummary(everyDay(['06:00', '21:00'])).label).toBe('06:00–21:00 hằng ngày');
  });

  it('detects late-night places', () => {
    expect(isLateNight(everyDay(['17:00', '02:00']))).toBe(true);
    expect(isLateNight(everyDay(['05:30', '23:30']))).toBe(true);
    expect(isLateNight(everyDay(['06:00', '21:00']))).toBe(false);
    // Ops rule 09/11: "kéo qua 22:00".
    expect(isLateNight(everyDay(['10:00', '22:30']))).toBe(true);
    expect(isLateNight(everyDay(['10:00', '22:00']))).toBe(false);
  });
});
