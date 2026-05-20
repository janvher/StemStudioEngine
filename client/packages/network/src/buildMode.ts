declare const __BUILD_MODE__: "integrated" | "oss" | undefined;

export const IS_OSS: boolean =
    typeof __BUILD_MODE__ !== "undefined" && __BUILD_MODE__ === "oss";
