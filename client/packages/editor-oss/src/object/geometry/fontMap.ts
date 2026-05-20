
export const DEFAULT_FONT = "helvetiker";
export const DEFAULT_WEIGHT = "regular";

export const FONT_MAP: Record<string, { path: string; displayName: string }> = {
    helvetiker: {path: "helvetiker", displayName: "Helvetiker"},
    gentilis: {path: "gentilis", displayName: "Gentilis"},
    optimer: {path: "optimer", displayName: "Optimer"},
    droid_sans: {path: "droid/droid_sans", displayName: "Droid Sans"},
    droid_serif: {path: "droid/droid_serif", displayName: "Droid Serif"},
};

/**
 * Returns the asset path for a font. Falls back to default if fontName is unknown.
 * @param fontName
 * @param weight
 */
export function resolveFontPath(fontName: string, weight: string): string {
    const entry = FONT_MAP[fontName] || FONT_MAP[DEFAULT_FONT]!;
    const w = weight === "bold" ? "bold" : "regular";
    return `/assets/fonts/${entry.path}_${w}.typeface.json`;
}
