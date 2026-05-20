/**
 * Lane-based preset system for adaptive quality.
 * Each device lane has an ordered array of preset IDs (rungs)
 * that the worker-driven system steps between at runtime.
 */

export type DeviceLane = 'desktop_discrete' | 'desktop_integrated' | 'apple_silicon' | 'ios' | 'android';

export interface LaneDefinition {
    readonly lane: DeviceLane;
    /** Ordered rungs from lowest to highest quality. */
    readonly rungs: readonly string[];
    /** Default starting index into rungs. */
    readonly defaultRungIndex: number;
}

const LANE_DEFINITIONS: Record<DeviceLane, LaneDefinition> = {
    desktop_discrete: {
        lane: 'desktop_discrete',
        rungs: ['desktop_balanced', 'desktop_high', 'desktop_ultra'],
        defaultRungIndex: 1,
    },
    desktop_integrated: {
        lane: 'desktop_integrated',
        rungs: ['desktop_balanced', 'desktop_high'],
        defaultRungIndex: 0,
    },
    apple_silicon: {
        lane: 'apple_silicon',
        rungs: ['apple_silicon_balanced', 'apple_silicon_high', 'apple_silicon_ultra'],
        defaultRungIndex: 1,
    },
    ios: {
        lane: 'ios',
        rungs: ['ios_balanced', 'ios_high'],
        defaultRungIndex: 0,
    },
    android: {
        lane: 'android',
        rungs: ['android_balanced', 'android_high'],
        defaultRungIndex: 0,
    },
};

/**
 *
 * @param lane
 */
export function getLane(lane: DeviceLane): LaneDefinition {
    return LANE_DEFINITIONS[lane];
}

/**
 *
 */
export function getAllLanes(): LaneDefinition[] {
    return Object.values(LANE_DEFINITIONS);
}

/**
 * Get the adjacent preset ID in the given direction.
 * Returns null if already at the floor/ceiling.
 * @param lane
 * @param currentPresetId
 * @param direction
 */
export function getAdjacentPreset(
    lane: DeviceLane,
    currentPresetId: string,
    direction: 'up' | 'down',
): string | null {
    const def = LANE_DEFINITIONS[lane];
    const idx = def.rungs.indexOf(currentPresetId);
    if (idx === -1) return null;

    const nextIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= def.rungs.length) return null;
    return def.rungs[nextIdx] ?? null;
}

/**
 *
 * @param lane
 * @param presetId
 */
export function isLaneFloor(lane: DeviceLane, presetId: string): boolean {
    const def = LANE_DEFINITIONS[lane];
    return def.rungs[0] === presetId;
}

/**
 *
 * @param lane
 * @param presetId
 */
export function isLaneCeiling(lane: DeviceLane, presetId: string): boolean {
    const def = LANE_DEFINITIONS[lane];
    return def.rungs[def.rungs.length - 1] === presetId;
}

/**
 *
 * @param lane
 * @param presetId
 */
export function getRungIndex(lane: DeviceLane, presetId: string): number {
    return LANE_DEFINITIONS[lane].rungs.indexOf(presetId);
}
