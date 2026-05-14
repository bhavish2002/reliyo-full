import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('getHealth returns ok', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (_k: string, def?: string) => def ?? 'development' },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const body = controller.getHealth();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('reliyo-api');
  });
});
