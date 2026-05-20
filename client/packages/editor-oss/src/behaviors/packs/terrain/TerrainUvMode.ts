export type TerrainUVMode = "scale" | "repeatCount";

export interface TerrainUvAttributes {
    uvMode?: unknown;
    uvScaleLocked?: unknown;
    uvScale?: unknown;
    uvScaleX?: unknown;
    uvScaleY?: unknown;
    uvRepeatLocked?: unknown;
    uvRepeat?: unknown;
    uvRepeatU?: unknown;
    uvRepeatV?: unknown;
}

export interface ResolvedTerrainUv {
    mode: TerrainUVMode;
    u: number;
    v: number;
}

export const DEFAULT_BASE_UV_REPEAT = 200;

/**
 *
 * @param value
 * @param fallback
 */
function toFiniteNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 *
 * @param value
 */
function resolveMode(value: unknown): TerrainUVMode {
    return value === "repeatCount" ? "repeatCount" : "scale";
}

/**
 *
 * @param attrs
 * @param options
 * @param options.baseUvRepeat
 */
export function resolveTerrainUv(
    attrs: TerrainUvAttributes,
    options?: { baseUvRepeat?: number },
): ResolvedTerrainUv {
    const mode = resolveMode(attrs.uvMode);
    const baseUvRepeat = toFiniteNumber(options?.baseUvRepeat, DEFAULT_BASE_UV_REPEAT);

    if (mode === "repeatCount") {
        const isLocked = attrs.uvRepeatLocked ?? true;
        const uniformRepeat = toFiniteNumber(attrs.uvRepeat, 1);
        return {
            mode,
            u: isLocked ? uniformRepeat : toFiniteNumber(attrs.uvRepeatU, 1),
            v: isLocked ? uniformRepeat : toFiniteNumber(attrs.uvRepeatV, 1),
        };
    }

    const isLocked = attrs.uvScaleLocked ?? true;
    const uniformScale = toFiniteNumber(attrs.uvScale, 1);
    return {
        mode,
        u: baseUvRepeat * (isLocked ? uniformScale : toFiniteNumber(attrs.uvScaleX, 1)),
        v: baseUvRepeat * (isLocked ? uniformScale : toFiniteNumber(attrs.uvScaleY, 1)),
    };
}
