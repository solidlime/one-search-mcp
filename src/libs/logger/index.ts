import pino from 'pino';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogArgs = [obj: Record<string, unknown>, message: string, ...args: any[]] | [message: string, ...args: any[]];

export interface Logger {
  info(...args: LogArgs): void;
  error(...args: LogArgs): void;
  success(...args: LogArgs): void;
  warn(...args: LogArgs): void;
  log(...args: LogArgs): void;
}

export class PinoLogger implements Logger {
  private logger: pino.Logger;

  constructor(name?: string) {
    this.logger = pino(
      {
        name: name || 'one-search-mcp',
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        } : undefined,
      },
      // CRITICAL: Write to stderr, not stdout (MCP protocol requirement)
      process.stderr,
    );
  }

  private logWithLevel(level: 'info' | 'error' | 'warn', ...args: LogArgs): void {
    if (typeof args[0] === 'object') {
      // pino structured logging: (obj, message)
      const [obj, message, ...rest] = args as [Record<string, unknown>, string, ...unknown[]];
      this.logger[level](obj, message, ...rest);
    } else {
      // plain string logging: (message, ...extra)
      const [message, ...rest] = args as [string, ...unknown[]];
      if (rest.length > 0) {
        this.logger[level]({ data: rest }, message);
      } else {
        this.logger[level](message);
      }
    }
  }

  info(...args: LogArgs): void {
    this.logWithLevel('info', ...args);
  }

  error(...args: LogArgs): void {
    this.logWithLevel('error', ...args);
  }

  success(...args: LogArgs): void {
    if (typeof args[0] === 'object') {
      const [obj, message, ...rest] = args as [Record<string, unknown>, string, ...unknown[]];
      this.logger.info({ level: 'success', ...obj }, message, ...rest);
    } else {
      const [message, ...rest] = args as [string, ...unknown[]];
      if (rest.length > 0) {
        this.logger.info({ level: 'success', data: rest }, message);
      } else {
        this.logger.info({ level: 'success' }, message);
      }
    }
  }

  warn(...args: LogArgs): void {
    this.logWithLevel('warn', ...args);
  }

  log(...args: LogArgs): void {
    this.logWithLevel('info', ...args);
  }
}

export const defaultLogger = new PinoLogger();
