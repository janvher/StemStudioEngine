/**
 * Utility functions for UIKit HUD components
 */

/**
 * Convert a CSS color string (#ffffff, rgb, etc.) to a hex number (0xffffff)
 * that UIKit's ColorRepresentation accepts.
 * @param color
 */
export function cssColorToHex(color: string | undefined): number {
    if (!color) return 0xffffff;

    // Handle hex strings
    if (color.startsWith("#")) {
        const hex = color.slice(1).trim();

        // #rgb
        if (hex.length === 3) {
            const r = hex[0];
            const g = hex[1];
            const b = hex[2];
            return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
        }

        // #rgba (alpha ignored for color)
        if (hex.length === 4) {
            const r = hex[0];
            const g = hex[1];
            const b = hex[2];
            return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
        }

        // #rrggbb
        if (hex.length === 6) {
            return parseInt(hex, 16);
        }

        // #rrggbbaa (alpha ignored for color)
        if (hex.length === 8) {
            return parseInt(hex.slice(0, 6), 16);
        }

        return 0xffffff;
    }

    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1] ?? "0");
        const g = parseInt(rgbMatch[2] ?? "0");
        const b = parseInt(rgbMatch[3] ?? "0");
        return (r << 16) | (g << 8) | b;
    }

    // Named colors fallback
    const namedColors: Record<string, number> = {
        white: 0xffffff,
        black: 0x000000,
        red: 0xff0000,
        green: 0x00ff00,
        blue: 0x0000ff,
        yellow: 0xffff00,
        transparent: 0x000000,
    };
    return namedColors[color.toLowerCase()] ?? 0xffffff;
}

/**
 * Extract opacity from a CSS color string (rgba).
 * Returns 1 if no alpha channel found.
 * @param color
 */
export function cssColorOpacity(color: string | undefined): number {
    if (!color) return 1;
    const rgbaMatch = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
    if (rgbaMatch) {
        return parseFloat(rgbaMatch[1] ?? "1");
    }
    if (color === "transparent") return 0;
    return 1;
}
