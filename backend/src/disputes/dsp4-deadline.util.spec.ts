import {
  computeDsp4ReworkDeadline,
  isDsp4ReworkWindowActive,
} from './dsp4-deadline.util';

describe('computeDsp4ReworkDeadline', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('extends 10 days from now when deadline already passed', () => {
    const deadline = new Date('2026-05-01T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, null, now);
    expect(result.toISOString()).toBe('2026-06-11T12:00:00.000Z');
  });

  it('uses effective deadline when 10+ days remain', () => {
    const deadline = new Date('2026-06-20T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, null, now);
    expect(result).toEqual(deadline);
  });

  it('sets 10 days from review when remaining time is less than 10 days', () => {
    // Deadline 20 Jun, review 17 Jun → 27 Jun (not deadline + 10).
    const deadline = new Date('2026-06-20T00:00:00.000Z');
    const review = new Date('2026-06-17T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, null, review);
    expect(result.toISOString()).toBe('2026-06-27T00:00:00.000Z');
  });

  it('leaves the deadline untouched when 10+ days already remain', () => {
    const deadline = new Date('2026-06-30T00:00:00.000Z');
    const review = new Date('2026-06-17T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, null, review);
    expect(result).toEqual(deadline);
  });

  it('prefers extendedDeadline over deadline', () => {
    const deadline = new Date('2026-06-05T00:00:00.000Z');
    const extended = new Date('2026-06-25T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, extended, now);
    expect(result).toEqual(extended);
  });
});

describe('isDsp4ReworkWindowActive', () => {
  it('is active before rework deadline', () => {
    expect(
      isDsp4ReworkWindowActive(
        'resolved_valid',
        new Date('2026-06-20T00:00:00.000Z'),
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('is inactive after rework deadline', () => {
    expect(
      isDsp4ReworkWindowActive(
        'resolved_valid',
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-10T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});
