import { describe, expect, it } from 'vitest';
import { addDays, dayKey, lastDays, prune, streak } from '../logic';

const day = (n: number) => addDays(new Date(2026, 9, 24), n);
const goalMet = (...offsets: number[]) => Object.fromEntries(offsets.map((n) => [dayKey(day(n)), 8]));

describe('the streak', () => {
  it('counts the days that reached the goal, back from today', () => {
    expect(streak(goalMet(0, -1, -2), 8, day(0))).toBe(3);
  });

  it('reads from yesterday until today reaches the goal', () => {
    expect(streak(goalMet(-1, -2), 8, day(0))).toBe(2);
  });

  it('survives one missed day, but not two in a row', () => {
    expect(streak(goalMet(0, -2, -3), 8, day(0))).toBe(3);
    expect(streak(goalMet(0, -2, -3, -4), 8, day(0))).toBe(4);
    expect(streak(goalMet(0, -3, -4), 8, day(0))).toBe(1);
  });

  it('is zero with no days at the goal', () => {
    expect(streak({}, 8, day(0))).toBe(0);
  });
});

describe('the last seven days', () => {
  it('gives seven days, oldest first, ending today', () => {
    const week = lastDays(goalMet(0, -6), day(0));
    expect(week).toHaveLength(7);
    expect(dayKey(week[6].date)).toBe(dayKey(day(0)));
    expect(week[0].glasses).toBe(8);
    expect(week[6].glasses).toBe(8);
  });
});

describe('storage', () => {
  it('drops days older than 400 days', () => {
    const kept = prune({ [dayKey(day(-401))]: 3, [dayKey(day(-10))]: 5 }, day(0));
    expect(Object.keys(kept)).toEqual([dayKey(day(-10))]);
  });
});
