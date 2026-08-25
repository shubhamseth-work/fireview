import { LogLevel } from './constants';

const SECRET_PATTERNS = [
  /private_key/gi,
  /client_email/gi,
  /client_secret/gi,
  /refresh_token/gi,
  /access_token/gi,
  /api_key/gi,
  /secret/gi,
  /password/gi,
  /token/gi,
  /credential/gi,
  /key/gi,
];

function redactSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SECRET_PATTERNS.some(p => p.test(key))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSecrets(value);
      }
    }
    return result;
  }
  return obj;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

let currentLogLevel: LogLevel = 'info';
let logOutput: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void = consoleLogOutput;

function consoleLogOutput(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const metaStr = meta ? ` ${JSON.stringify(redactSecrets(meta))}` : '';
  switch (level) {
    case 'debug':
      console.debug(`${prefix} ${message}${metaStr}`);
      break;
    case 'info':
      console.info(`${prefix} ${message}${metaStr}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}${metaStr}`);
      break;
    case 'error':
      console.error(`${prefix} ${message}${metaStr}`);
      break;
  }
}

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

export function setLogOutput(fn: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void): void {
  logOutput = fn;
}

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) >= levels.indexOf(currentLogLevel);
}

export const logger: Logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) logOutput('debug', message, meta);
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) logOutput('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) logOutput('warn', message, meta);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) logOutput('error', message, meta);
  },
};

export function createChildLogger(prefix: string): Logger {
  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      logger.debug(`[${prefix}] ${message}`, meta);
    },
    info(message: string, meta?: Record<string, unknown>): void {
      logger.info(`[${prefix}] ${message}`, meta);
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      logger.warn(`[${prefix}] ${message}`, meta);
    },
    error(message: string, meta?: Record<string, unknown>): void {
      logger.error(`[${prefix}] ${message}`, meta);
    },
  };
}