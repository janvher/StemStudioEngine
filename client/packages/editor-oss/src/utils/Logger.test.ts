
import { MockInstance } from 'vitest';

describe('Enhanced Logger', () => {
    let mockConsoleError: MockInstance;
    let mockConsoleWarn: MockInstance;
    let mockConsoleInfo: MockInstance;
    let mockConsoleDebug: MockInstance;
    let mockConsoleLog: MockInstance;

    beforeEach(() => {
        mockConsoleError = vi.spyOn(console, 'error');
        mockConsoleWarn = vi.spyOn(console, 'warn');
        mockConsoleInfo = vi.spyOn(console, 'info');
        mockConsoleDebug = vi.spyOn(console, 'debug');
        mockConsoleLog = vi.spyOn(console, 'log');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Pre-bound functions based on log level', () => {
        it('should bind only ERROR level when logLevel is ERROR', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'error');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            logger.error('error message');
            logger.warn('warn message');
            logger.info('info message');
            logger.debug('debug message');
            logger.log('log message');

            expect(mockConsoleError).toHaveBeenCalledWith('error message');
            expect(mockConsoleWarn).not.toHaveBeenCalled();
            expect(mockConsoleInfo).not.toHaveBeenCalled();
            expect(mockConsoleDebug).not.toHaveBeenCalled();
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });

        it('should bind ERROR and WARN when logLevel is WARN', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'warn');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            logger.error('error message');
            logger.warn('warn message');
            logger.info('info message');
            logger.debug('debug message');
            logger.log('log message');

            expect(mockConsoleError).toHaveBeenCalledWith('error message');
            expect(mockConsoleWarn).toHaveBeenCalledWith('warn message');
            expect(mockConsoleInfo).not.toHaveBeenCalled();
            expect(mockConsoleDebug).not.toHaveBeenCalled();
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });

        it('should bind ERROR, WARN, INFO when logLevel is INFO', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'info');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            logger.error('error message');
            logger.warn('warn message');
            logger.info('info message');
            logger.debug('debug message');
            logger.log('log message');

            expect(mockConsoleError).toHaveBeenCalledWith('error message');
            expect(mockConsoleWarn).toHaveBeenCalledWith('warn message');
            expect(mockConsoleInfo).toHaveBeenCalledWith('info message');
            expect(mockConsoleDebug).not.toHaveBeenCalled();
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });

        it('should bind all levels except LOG when logLevel is DEBUG', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'debug');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            logger.error('error message');
            logger.warn('warn message');
            logger.info('info message');
            logger.debug('debug message');
            logger.log('log message');

            expect(mockConsoleError).toHaveBeenCalledWith('error message');
            expect(mockConsoleWarn).toHaveBeenCalledWith('warn message');
            expect(mockConsoleInfo).toHaveBeenCalledWith('info message');
            expect(mockConsoleDebug).toHaveBeenCalledWith('debug message');
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });

        it('should bind all levels when logLevel is LOG', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'log');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            logger.error('error message');
            logger.warn('warn message');
            logger.info('info message');
            logger.debug('debug message');
            logger.log('log message');

            expect(mockConsoleError).toHaveBeenCalledWith('error message');
            expect(mockConsoleWarn).toHaveBeenCalledWith('warn message');
            expect(mockConsoleInfo).toHaveBeenCalledWith('info message');
            expect(mockConsoleDebug).toHaveBeenCalledWith('debug message');
            expect(mockConsoleLog).toHaveBeenCalledWith('log message');
        });

        it('should handle prettyPrint correctly based on DEBUG level', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'debug');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            const testObject = { key: 'value', nested: { data: 123 } };

            logger.prettyPrint(testObject);

            expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(testObject, null, 2));
            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        });

        it('should not notify listeners when log level is below threshold', async () => {
            vi.stubEnv('REACT_APP_WEB_LOG_LEVEL', 'error');
            vi.resetModules();

            const { initializeLogger, getLogger } = await import('./Logger');
            initializeLogger();
            const logger = getLogger()!;

            const listener = vi.fn();
            logger.addListener(listener);

            logger.warn('should not notify');
            logger.info('should not notify');
            logger.debug('should not notify');
            logger.log('should not notify');

            expect(listener).not.toHaveBeenCalled();

            logger.error('should notify');
            expect(listener).toHaveBeenCalledTimes(1);

            logger.removeListener(listener);
        });
    });
});
