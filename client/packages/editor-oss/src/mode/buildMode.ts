declare const __BUILD_MODE__: "integrated" | "oss" | undefined;

export type BuildMode = "integrated" | "oss";

const resolvedMode: BuildMode =
    typeof __BUILD_MODE__ !== "undefined" && __BUILD_MODE__ === "oss" ? "oss" : "integrated";

export const BUILD_MODE: BuildMode = resolvedMode;
export const IS_OSS = resolvedMode === "oss";
export const IS_INTEGRATED = resolvedMode === "integrated";
