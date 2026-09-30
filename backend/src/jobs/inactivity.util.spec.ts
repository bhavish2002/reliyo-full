import {
  computeDueStrikeLevel,
  computeInactivityAnchor,
  countStrikesInDoneStint,
  hoursUntilNextStrike,
  INACTIVITY_STRIKE_HOURS,
  resolveEffectiveDeadline,
} from './inactivity.util';

describe('inactivity.util', () => {
  const doneSince = new Date('2026-01-01T00:00:00Z');
  const deadline = new Date('2026-01-15T00:00:00Z');

  it('counts only strikes in current done stint', () => {
    const events = [
      {
        createdAt: new Date('2025-12-01T00:00:00Z'),
        entryType: 'alert',
        metadata: { alertType: 'sla_warning', strike: 1 },
      },
      {
        createdAt: new Date('2026-01-02T00:00:00Z'),
        entryType: 'alert',
        metadata: { alertType: 'sla_warning', strike: 1 },
      },
    ];
    expect(countStrikesInDoneStint(events, doneSince)).toBe(1);
  });

  it('computes due strike levels at 72/144/192 hours', () => {
    expect(computeDueStrikeLevel(71)).toBe(0);
    expect(computeDueStrikeLevel(72)).toBe(1);
    expect(computeDueStrikeLevel(143)).toBe(1);
    expect(computeDueStrikeLevel(144)).toBe(2);
    expect(computeDueStrikeLevel(192)).toBe(3);
    expect(computeDueStrikeLevel(-1)).toBe(0);
  });

  it('resolveEffectiveDeadline prefers extended deadline', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const ext = new Date('2026-01-20T00:00:00Z');
    expect(resolveEffectiveDeadline(base, null).getTime()).toBe(base.getTime());
    expect(resolveEffectiveDeadline(base, ext).getTime()).toBe(ext.getTime());
  });

  it('computeInactivityAnchor uses max(doneAt, effectiveDeadline)', () => {
    const earlyDone = new Date('2026-01-01T00:00:00Z');
    expect(
      computeInactivityAnchor(earlyDone, deadline).getTime(),
    ).toBe(deadline.getTime());

    const lateDone = new Date('2026-01-20T00:00:00Z');
    expect(
      computeInactivityAnchor(lateDone, deadline).getTime(),
    ).toBe(lateDone.getTime());
  });

  it('no strikes before inactivity anchor when done early', () => {
    const anchor = computeInactivityAnchor(doneSince, deadline);
    const events = [
      {
        createdAt: new Date('2026-01-05T00:00:00Z'),
        entryType: 'alert',
        metadata: { alertType: 'sla_warning', strike: 1 },
      },
    ];
    expect(countStrikesInDoneStint(events, anchor)).toBe(0);
  });

  it('hours until next strike is null before anchor elapsed', () => {
    expect(hoursUntilNextStrike(-5, 0)).toBeNull();
  });

  it('hours until next strike respects existing count', () => {
    expect(hoursUntilNextStrike(10, 0)).toBeCloseTo(62);
    expect(hoursUntilNextStrike(80, 1)).toBeCloseTo(64);
    expect(hoursUntilNextStrike(200, 3)).toBeNull();
  });

  it('strike thresholds match product policy', () => {
    expect([...INACTIVITY_STRIKE_HOURS]).toEqual([72, 144, 192]);
  });
});
