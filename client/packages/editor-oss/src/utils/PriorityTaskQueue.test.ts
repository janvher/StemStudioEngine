import { describe, it, expect } from 'vitest';

import { PriorityTaskQueue } from './PriorityTaskQueue';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('PriorityTaskQueue', () => {
    it('should execute tasks', async () => {
        const queue = new PriorityTaskQueue(2);
        const result = await queue.enqueue(async () => {
            await Promise.resolve();
            return 'success';
        });
        expect(result).toBe('success');
    });

    it('should respect concurrency limit', async () => {
        const queue = new PriorityTaskQueue(2);
        let activeCount = 0;
        let maxActive = 0;

        const task = async () => {
            activeCount++;
            maxActive = Math.max(maxActive, activeCount);
            await sleep(10);
            activeCount--;
        };

        const promises = [
            queue.enqueue(task),
            queue.enqueue(task),
            queue.enqueue(task),
            queue.enqueue(task),
        ];

        await Promise.all(promises);
        expect(maxActive).toBe(2);
    });

    it('should execute higher priority tasks first when queued', async () => {
        const queue = new PriorityTaskQueue(1);
        const executionOrder: string[] = [];

        // Start a blocking task to occupy the queue
        const blocker = queue.enqueue(async () => {
            await sleep(20);
            executionOrder.push('blocker');
        }, 0);

        // Enqueue tasks while blocker is running
        const lowPriority = queue.enqueue(async () => {
            await Promise.resolve();
            executionOrder.push('low');
        }, 1);

        const highPriority = queue.enqueue(async () => {
            await Promise.resolve();
            executionOrder.push('high');
        }, 10);

        const mediumPriority = queue.enqueue(async () => {
            await Promise.resolve();
            executionOrder.push('medium');
        }, 5);

        await Promise.all([blocker, lowPriority, highPriority, mediumPriority]);

        // Blocker starts immediately.
        // Then high (10) should run.
        // Then medium (5).
        // Then low (1).
        expect(executionOrder).toEqual(['blocker', 'high', 'medium', 'low']);
    });

    it('should handle task failures gracefully', async () => {
        const queue = new PriorityTaskQueue(1);
        
        const failure = queue.enqueue(async () => {
            await Promise.resolve();
            throw new Error('failed');
        });

        const success = queue.enqueue(async () => {
            await Promise.resolve();
            return 'success';
        });

        await expect(failure).rejects.toThrow('failed');
        await expect(success).resolves.toBe('success');
    });

    it('should handle mixed priorities and concurrency', async () => {
        const queue = new PriorityTaskQueue(2);
        const executionOrder: string[] = [];

        // Fill concurrency slots
        const t1 = queue.enqueue(async () => {
            await sleep(20);
            executionOrder.push('t1');
        }, 1);
        const t2 = queue.enqueue(async () => {
            await sleep(20);
            executionOrder.push('t2');
        }, 1);

        // Queue pending tasks
        const t3 = queue.enqueue(async () => {
            await Promise.resolve();
            executionOrder.push('t3-low');
        }, 1);
        const t4 = queue.enqueue(async () => {
            await Promise.resolve();
            executionOrder.push('t4-high');
        }, 10);

        await Promise.all([t1, t2, t3, t4]);

        // t1 and t2 start immediately.
        // Since concurrency is 2, t3 and t4 wait.
        // t1 and t2 take 20ms. t3 and t4 are instant.
        // When the first of t1/t2 finishes, t4 (high priority) starts and finishes immediately.
        // Then the second of t1/t2 finishes, and t3 (low priority) starts.
        
        // So we expect t4 to finish before t3.
        expect(executionOrder.indexOf('t4-high')).toBeLessThan(executionOrder.indexOf('t3-low'));
        
        // And we expect t4 to finish after at least one of the initial tasks (proving it waited)
        const firstFinish = executionOrder[0];
        expect(['t1', 't2']).toContain(firstFinish);
        
        // t4 should be the second or third item, but definitely before t3
        expect(executionOrder).toContain('t4-high');
        expect(executionOrder).toContain('t3-low');
    });
});
