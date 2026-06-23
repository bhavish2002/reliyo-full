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

  it('extends 10 days past deadline when fewer than 10 days remain', () => {
    const deadline = new Date('2026-06-05T00:00:00.000Z');
    const result = computeDsp4ReworkDeadline(deadline, null, now);
    expect(result.toISOString()).toBe('2026-06-15T00:00:00.000Z');
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
