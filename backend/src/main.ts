import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

// CommonJS package — `import cookieParser from 'cookie-parser'` breaks at runtime (no default export).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(cookieParser());

  const config = app.get(ConfigService);
  const globalPrefix = config.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsRaw = config.get<string>('CORS_ORIGIN', 'http://localhost:8080');
  const corsOrigin = corsRaw.includes(',')
    ? corsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : corsRaw;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Listening on http://localhost:${port}/${globalPrefix}`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
