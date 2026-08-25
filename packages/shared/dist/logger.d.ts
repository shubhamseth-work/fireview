import { LogLevel } from './constants.js';
export interface Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
export declare function setLogLevel(level: LogLevel): void;
export declare function getLogLevel(): LogLevel;
export declare function setLogOutput(fn: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void): void;
export declare const logger: Logger;
export declare function createChildLogger(prefix: string): Logger;
//# sourceMappingURL=logger.d.ts.map