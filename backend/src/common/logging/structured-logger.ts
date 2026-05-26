import { ConsoleLogger, Injectable, LogLevel, LoggerService } from '@nestjs/common';

export interface LogFields {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

/**
 * JSON logs when LOG_FORMAT=json (production-friendly).
 * Default Nest text format in local dev.
 */
@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly jsonMode: boolean;
  private readonly nest = new ConsoleLogger('ReliyoApi');

  constructor() {
    this.jsonMode = process.env.LOG_FORMAT === 'json';
  }

  log(message: string, context?: string, fields?: LogFields): void {
    this.write('log', message, context, fields);
  }

  error(message: string, trace?: string, context?: string, fields?: LogFields): void {
    this.write('error', message, context, { ...fields, trace });
  }

  warn(message: string, context?: string, fields?: LogFields): void {
    this.write('warn', message, context, fields);
  }

  debug(message: string, context?: string, fields?: LogFields): void {
    this.write('debug', message, context, fields);
  }

  verbose(message: string, context?: string, fields?: LogFields): void {
    this.write('verbose', message, context, fields);
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    fields?: LogFields,
  ): void {
    if (this.jsonMode) {
      const line = JSON.stringify({
        level,
        message,
        context: context ?? 'ReliyoApi',
        timestamp: new Date().toISOString(),
        ...fields,
      });
      if (level === 'error') {
        console.error(line);
      } else {
        console.log(line);
      }
      return;
    }
    const ctx = context ?? 'ReliyoApi';
    switch (level) {
      case 'error':
        this.nest.error(message, fields?.trace as string | undefined, ctx);
        break;
      case 'warn':
        this.nest.warn(message, ctx);
        break;
      case 'debug':
        this.nest.debug(message, ctx);
        break;
      case 'verbose':
        this.nest.verbose(message, ctx);
        break;
      default:
        this.nest.log(message, ctx);
    }
  }
}
