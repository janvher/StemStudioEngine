/**
 * Import throughput tuning for scene asset migration.
 *
 * Defaults are conservative for backend stability and can be adjusted
 * per environment/profile if needed.
 */
export const IMPORT_TUNING = {
    // Number of asset references per backend batch import request (max API supports: 100).
    assetBatchSize: 20,
    // Number of derivative references per backend batch import request.
    derivativeBatchSize: 20,
    // Max number of concurrent create+poll pipelines for asset batches.
    assetBatchPollConcurrency: 5,
    // Max number of concurrent create+poll pipelines for derivative batches.
    derivativeBatchPollConcurrency: 5,
    // Max concurrent asset/revision creation calls within a dependency level.
    assetCreationConcurrency: 10,
} as const;

