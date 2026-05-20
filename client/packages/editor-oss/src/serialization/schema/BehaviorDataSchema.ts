import z from 'zod';

import { BehaviorThrottlePriority } from '@stem/editor-oss/behaviors/performance/interfaces/IThrottleStrategy';

export const BehaviorThrottleConfigSchema = z.object({
    throttlePriority: z.enum(BehaviorThrottlePriority),
    enableFrustumCulling: z.boolean(),
    enableDistanceThrottling: z.boolean(),
    requiresConsistentUpdates: z.boolean().default(false),
});

export const BehaviorDataSchema = z.object({
    id: z.string(),
    uuid: z.string(),
    prefabBehaviorUuid: z.string().optional(),
    enabled: z.boolean(),
    priority: z.number(),
    attributesData: z.record(z.string(), z.any()).optional(),
    throttleConfig: BehaviorThrottleConfigSchema.optional(),
});
