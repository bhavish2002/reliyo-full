import { INACTIVITY_STRIKE_HOURS } from '../../jobs/inactivity.util';
import { PLATFORM_FEE_ON_REWARD } from '../../ledger/ledger.types';
import { QUIT_GRACE_MS } from '../../lifecycle/lifecycle.types';

/** Inactivity strike thresholds for requestor on `done` tasks (hours). */
export { INACTIVITY_STRIKE_HOURS };

export const PLATFORM_POLICY = {
  platformFeePercent: PLATFORM_FEE_ON_REWARD * 100,
  trustDepositPercent: 10,
  quitGraceHours: QUIT_GRACE_MS / (60 * 60 * 1000),
  inactivityStrikeHours: [...INACTIVITY_STRIKE_HOURS],
  autoCloseOnThreeStrikes: true,
  editable: false,
  source: 'code_constants' as const,
};
