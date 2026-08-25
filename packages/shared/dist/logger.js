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
function redactSecrets(obj) {
    if (obj === null || obj === undefined)
        return obj;
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
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (SECRET_PATTERNS.some(p => p.test(key))) {
                result[key] = '[REDACTED]';
            }
            else {
                result[key] = redactSecrets(value);
            }
        }
        return result;
    }
    return obj;
}
let currentLogLevel = 'info';
let logOutput = consoleLogOutput;
function consoleLogOutput(level, message, meta) {
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
export function setLogLevel(level) {
    currentLogLevel = level;
}
export function getLogLevel() {
    return currentLogLevel;
}
export function setLogOutput(fn) {
    logOutput = fn;
}
function shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(currentLogLevel);
}
export const logger = {
    debug(message, meta) {
        if (shouldLog('debug'))
            logOutput('debug', message, meta);
    },
    info(message, meta) {
        if (shouldLog('info'))
            logOutput('info', message, meta);
    },
    warn(message, meta) {
        if (shouldLog('warn'))
            logOutput('warn', message, meta);
    },
    error(message, meta) {
        if (shouldLog('error'))
            logOutput('error', message, meta);
    },
};
export function createChildLogger(prefix) {
    return {
        debug(message, meta) {
            logger.debug(`[${prefix}] ${message}`, meta);
        },
        info(message, meta) {
            logger.info(`[${prefix}] ${message}`, meta);
        },
        warn(message, meta) {
            logger.warn(`[${prefix}] ${message}`, meta);
        },
        error(message, meta) {
            logger.error(`[${prefix}] ${message}`, meta);
        },
    };
}
//# sourceMappingURL=logger.js.map