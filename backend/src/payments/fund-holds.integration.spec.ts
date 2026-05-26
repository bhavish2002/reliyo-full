import { BadRequestException } from '@nestjs/common';
import { FundHoldStatus } from '@prisma/client';
import { FundHoldsService } from './fund-holds.service';

describe('FundHoldsService.assertRewardHoldForTaskCreate', () => {
  const actor = {
    sub: 'user-1',
    platformRole: 'user' as const,
    phoneE164: '+919000000001',
    preferredRole: 'requestor' as const,
  };

  it('rejects unconfirmed holds', async () => {
    const tx = {
      fundHold: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new FundHoldsService({} as never);

    await expect(
      service.assertRewardHoldForTaskCreate(
        tx as never,
        'hold-1',
        actor,
        500,
        'INR',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts confirmed unused holds with matching amount', async () => {
    const confirmedAt = new Date('2026-05-25T12:00:00Z');
    const tx = {
      fundHold: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'hold-1',
          userId: actor.sub,
          purpose: 'task_reward',
          status: FundHoldStatus.confirmed,
          amount: 500,
          currency: 'INR',
          confirmedAt,
          task: null,
        }),
      },
    };
    const service = new FundHoldsService({} as never);

    const result = await service.assertRewardHoldForTaskCreate(
      tx as never,
      'hold-1',
      actor,
      500,
      'INR',
    );

    expect(result).toEqual({ confirmedAt, holdId: 'hold-1' });
  });
});
