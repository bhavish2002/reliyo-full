import { isInactivityJobEnabled } from './job-env';

describe('job-env', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.INACTIVITY_JOB_ENABLED;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.INACTIVITY_JOB_ENABLED;
    else process.env.INACTIVITY_JOB_ENABLED = originalFlag;
  });

  it('defaults inactivity job on outside production/test', () => {
    delete process.env.INACTIVITY_JOB_ENABLED;
    process.env.NODE_ENV = 'development';
    expect(isInactivityJobEnabled()).toBe(true);
    process.env.NODE_ENV = 'staging';
    expect(isInactivityJobEnabled()).toBe(true);
  });

  it('defaults inactivity job off in test and production', () => {
    delete process.env.INACTIVITY_JOB_ENABLED;
    process.env.NODE_ENV = 'test';
    expect(isInactivityJobEnabled()).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(isInactivityJobEnabled()).toBe(false);
  });

  it('respects explicit INACTIVITY_JOB_ENABLED=false', () => {
    process.env.NODE_ENV = 'development';
    process.env.INACTIVITY_JOB_ENABLED = 'false';
    expect(isInactivityJobEnabled()).toBe(false);
  });
});
