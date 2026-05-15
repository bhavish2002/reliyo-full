import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok' as const,
      env: this.config.get<string>('NODE_ENV', 'development'),
      service: 'reliyo-api',
    };
  }

  @Get('version')
  getVersion() {
    return {
      version: process.env.npm_package_version ?? '0.1.0',
      commit: process.env.GIT_COMMIT ?? null,
    };
  }
}
