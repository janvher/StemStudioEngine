import {BasicShadowMap, PCFShadowMap, PCFSoftShadowMap, VSMShadowMap} from "three";

type GradientMode = "2d" | "3d";

const SHADOW_MAP_TYPES = new Set([BasicShadowMap, PCFShadowMap, PCFSoftShadowMap, VSMShadowMap]);

const SHADOW_MAP_TYPE_ALIASES: Record<string, number> = {
    "0": BasicShadowMap,
    basic: BasicShadowMap,
    basicshadowmap: BasicShadowMap,
    "1": PCFShadowMap,
    pcf: PCFShadowMap,
    pcfshadowmap: PCFShadowMap,
    "2": PCFSoftShadowMap,
    soft: PCFSoftShadowMap,
    pcfsoft: PCFSoftShadowMap,
    pcfsoftshadowmap: PCFSoftShadowMap,
    "3": VSMShadowMap,
    vsm: VSMShadowMap,
    vsmshadowmap: VSMShadowMap,
};

/**
 *
 * @param value
 */
function normalizeAliasKey(value: string): string {
    return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 *
 * @param value
 * @param fallback
 */
function parseGradientAngle(value: unknown, fallback = 180): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(deg|rad|turn)?$/);
        if (match) {
            const numeric = Number.parseFloat(match[1]!);
            if (Number.isFinite(numeric)) {
                const unit = match[2] ?? "deg";
                if (unit === "rad") {
                    return (numeric * 180) / Math.PI;
                }
                if (unit === "turn") {
                    return numeric * 360;
                }
                return numeric;
            }
        }
    }

    return fallback;
}

/**
 *
 * @param value
 * @param index
 * @param total
 */
function normalizeStopPosition(value: unknown, index: number, total: number): string | undefined {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        if (/[a-z%]/i.test(trimmed)) return trimmed;

        const numeric = Number.parseFloat(trimmed);
        if (Number.isFinite(numeric)) {
            return normalizeStopPosition(numeric, index, total);
        }

        return undefined;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const percent = value >= 0 && value <= 1 ? value * 100 : value;
        return `${percent}%`;
    }

    if (total <= 1) return undefined;
    return `${(index / (total - 1)) * 100}%`;
}

/**
 *
 * @param stop
 * @param index
 * @param total
 */
function extractStopToken(stop: unknown, index: number, total: number): string | null {
    if (typeof stop === "string") {
        return stop.trim() || null;
    }

    if (!stop || typeof stop !== "object") {
        return null;
    }

    const shape = stop as Record<string, unknown>;
    const color =
        typeof shape.color === "string"
            ? shape.color
            : typeof shape.value === "string"
              ? shape.value
              : typeof shape.hex === "string"
                ? shape.hex
                : typeof shape.rgba === "string"
                  ? shape.rgba
                  : null;

    if (!color) return null;

    const position = normalizeStopPosition(
        shape.position ?? shape.stop ?? shape.offset ?? shape.at,
        index,
        total,
    );

    return position ? `${color} ${position}` : color;
}

/**
 *
 * @param shape
 */
function buildGradientFromStops(shape: Record<string, unknown>): string | undefined {
    const rawStops = Array.isArray(shape.stops)
        ? shape.stops
        : Array.isArray(shape.colors)
          ? shape.colors
          : undefined;

    if (!rawStops || rawStops.length === 0) {
        return undefined;
    }

    const stopTokens = rawStops
        .map((stop, index) => extractStopToken(stop, index, rawStops.length))
        .filter((value): value is string => Boolean(value));

    if (stopTokens.length < 2) {
        return undefined;
    }

    const typeToken = typeof shape.type === "string" ? shape.type.trim().toLowerCase() : "";
    const isRadial =
        shape.radial === true ||
        typeToken === "radial" ||
        typeToken === "radial-gradient" ||
        typeToken === "radialgradient";

    if (isRadial) {
        return `radial-gradient(${stopTokens.join(", ")})`;
    }

    const angle = parseGradientAngle(shape.angle ?? shape.rotation, 180);
    return `linear-gradient(${angle}deg, ${stopTokens.join(", ")})`;
}

/**
 *
 * @param shape
 */
function buildGradientFromTopBottom(shape: Record<string, unknown>): string | undefined {
    const startColor =
        typeof shape.topColor === "string"
            ? shape.topColor
            : typeof shape.startColor === "string"
              ? shape.startColor
              : typeof shape.from === "string"
                ? shape.from
                : undefined;
    const endColor =
        typeof shape.bottomColor === "string"
            ? shape.bottomColor
            : typeof shape.endColor === "string"
              ? shape.endColor
              : typeof shape.to === "string"
                ? shape.to
                : undefined;

    if (!startColor || !endColor) {
        return undefined;
    }

    const angle = parseGradientAngle(shape.angle ?? shape.rotation, 180);
    return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

/**
 *
 * @param value
 */
export function parseShadowMapType(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && SHADOW_MAP_TYPES.has(value as 0)) {
        return value;
    }

    if (typeof value === "string") {
        const alias = SHADOW_MAP_TYPE_ALIASES[normalizeAliasKey(value)];
        return alias !== undefined ? alias : undefined;
    }

    if (value && typeof value === "object") {
        const shape = value as Record<string, unknown>;
        return parseShadowMapType(shape.type ?? shape.value ?? shape.name ?? shape.label);
    }

    return undefined;
}

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeShadowMapType(value: unknown, fallback = PCFShadowMap): number {
    return parseShadowMapType(value) ?? fallback;
}

/**
 *
 * @param value
 */
export function parseBackgroundGradient(value: unknown): string | undefined {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;

        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                return parseBackgroundGradient(JSON.parse(trimmed)) ?? trimmed;
            } catch {
                return trimmed;
            }
        }

        return trimmed;
    }

    if (!value || typeof value !== "object") {
        return undefined;
    }

    const shape = value as Record<string, unknown>;
    const direct =
        typeof shape.css === "string"
            ? shape.css
            : typeof shape.gradient === "string"
              ? shape.gradient
              : typeof shape.value === "string"
                ? shape.value
                : undefined;

    if (direct) {
        return direct.trim() || undefined;
    }

    return buildGradientFromTopBottom(shape) ?? buildGradientFromStops(shape);
}

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeBackgroundGradient(value: unknown, fallback?: string): string | undefined {
    return parseBackgroundGradient(value) ?? fallback;
}

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeGradientMode(value: unknown, fallback: GradientMode = "2d"): GradientMode {
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "2d" || normalized === "3d") {
            return normalized;
        }
    }

    return fallback;
}
