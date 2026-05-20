import {inter, lato, montserrat, openSans, roboto} from "@ni2khanna/msdfonts/dist/index.js";

export const HUD_UIKIT_FONT_FAMILIES = {
    inter,
    roboto,
    openSans,
    montserrat,
    lato,
} as const;

const FONT_ALIASES: Record<string, keyof typeof HUD_UIKIT_FONT_FAMILIES> = {
    inter: "inter",
    roboto: "roboto",
    opensans: "openSans",
    "open sans": "openSans",
    montserrat: "montserrat",
    lato: "lato",
    arial: "inter",
    "jockey one": "inter",
};

/**
 *
 * @param fontFamily
 */
function normalizeFontFamilyName(fontFamily: string): string {
    return fontFamily
        .trim()
        .toLowerCase()
        .replace(/^["']+|["']+$/g, "")
        .replace(/\s+/g, " ");
}

/**
 *
 * @param fontFamily
 */
export function resolveUIKitFontFamily(fontFamily?: string): keyof typeof HUD_UIKIT_FONT_FAMILIES | undefined {
    if (!fontFamily) return "inter";
    const normalized = normalizeFontFamilyName(fontFamily);
    return FONT_ALIASES[normalized] ?? "inter";
}
