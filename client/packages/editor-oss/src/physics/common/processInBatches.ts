export interface ProcessInBatchesOptions<T> {
    items: T[];
    batchSize: number;
    concurrency: number;
    processItem: (item: T, index: number) => Promise<void> | void;
    onBatchComplete?: (completedCount: number, totalCount: number) => Promise<void> | void;
    yieldBetweenBatches?: boolean;
}

/**
 *
 * @param items
 * @param processItem
 * @param offset
 * @param concurrency
 */
async function runWithConcurrency<T>(
    items: T[],
    processItem: (item: T, index: number) => Promise<void> | void,
    offset: number,
    concurrency: number,
): Promise<void> {
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
        while (cursor < items.length) {
            const localIndex = cursor++;
            await processItem(items[localIndex]!, offset + localIndex);
        }
    });
    await Promise.all(workers);
}

/**
 *
 * @param options
 */
export async function processInBatches<T>(options: ProcessInBatchesOptions<T>): Promise<void> {
    const { items, processItem, onBatchComplete } = options;
    const batchSize = Math.max(1, Math.floor(options.batchSize));
    const concurrency = Math.max(1, Math.floor(options.concurrency));
    const yieldBetweenBatches = options.yieldBetweenBatches ?? true;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, Math.min(i + batchSize, items.length));
        await runWithConcurrency(batch, processItem, i, Math.min(concurrency, batch.length));
        if (onBatchComplete) {
            await onBatchComplete(i + batch.length, items.length);
        }
        if (yieldBetweenBatches && i + batchSize < items.length) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
    }
}
