/**
 * Structured logger factory.
 * In Docker/K8s, structured JSON logs are required for log aggregation.
 *
 * LOG_LEVEL env var controls minimum level (default: info).
 * LOG_FORMAT=json produces JSON lines; default is human-readable.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const jsonFormat = process.env.LOG_FORMAT === 'json';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
    return new Date().toISOString();
}

function logLine(level: LogLevel, component: string, message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    if (jsonFormat) {
        const entry: Record<string, unknown> = {
            timestamp: formatTimestamp(),
            level,
            component,
            message,
        };
        if (data) entry.data = data;
        process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
        const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}] [${component}]`;
        const suffix = data ? ' ' + JSON.stringify(data) : '';
        // Use appropriate console method for stderr routing
        switch (level) {
            case 'error':
                process.stderr.write(`${prefix} ${message}${suffix}\n`);
                break;
            case 'warn':
                process.stderr.write(`${prefix} ${message}${suffix}\n`);
                break;
            default:
                process.stdout.write(`${prefix} ${message}${suffix}\n`);
                break;
        }
    }
}

export type Logger = {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
};

/**
 * Create a structured logger for a component.
 *
 * @example
 * const log = createLogger('agent');
 * log.info('Starting agent run', { sessionId: '123', provider: 'anthropic' });
 */
export function createLogger(component: string): Logger {
    return {
        debug: (message, data) => logLine('debug', component, message, data),
        info: (message, data) => logLine('info', component, message, data),
        warn: (message, data) => logLine('warn', component, message, data),
        error: (message, data) => logLine('error', component, message, data),
    };
}
