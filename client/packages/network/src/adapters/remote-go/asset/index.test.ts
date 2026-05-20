import { describe, expect, it } from 'vitest';

import { processWithConcurrencyLimit } from './index';

describe('processWithConcurrencyLimit', () => {
    it('should respect the provided concurrency limit', async () => {
        const active = { count: 0, max: 0 };
        const releaseResolvers: Array<() => void> = [];
        let completed = 0;

        const promise = processWithConcurrencyLimit(
            [1, 2, 3, 4, 5, 6],
            2,
            async (item) => {
                active.count++;
                active.max = Math.max(active.max, active.count);
                await new Promise<void>(resolve => {
                    releaseResolvers.push(resolve);
                });
                active.count--;
                completed++;
                return item * 10;
            },
        );

        // Allow initial workers to start.
        await Promise.resolve();

        while (completed < 6) {
            const next = releaseResolvers.shift();
            if (next) {
                next();
                // Allow next task to start.
                await Promise.resolve();
            } else {
                await Promise.resolve();
            }
        }

        const result = await promise;
        expect(active.max).toBeLessThanOrEqual(2);
        expect(result).toEqual([10, 20, 30, 40, 50, 60]);
    });

    it('should return empty array for empty input', async () => {
        const result = await processWithConcurrencyLimit([], 5, async (item: number) => item);
        expect(result).toEqual([]);
    });

    it('should run with at least one worker when concurrency is zero', async () => {
        const result = await processWithConcurrencyLimit([1, 2], 0, async (item) => item + 1);
        expect(result).toEqual([2, 3]);
    });
});
