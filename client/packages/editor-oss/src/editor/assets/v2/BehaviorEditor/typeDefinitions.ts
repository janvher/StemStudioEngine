/**
 * Type definitions for Monaco Editor IntelliSense
 *
 * This file combines TypeScript type definitions from separate .d.ts files
 * and injects them into Monaco Editor for autocomplete and IntelliSense.
 *
 * The .d.ts files in ./types/ are:
 * - Type-checked by TypeScript during build
 * - Imported as raw strings using Vite's ?raw suffix
 * - Combined into a single string for Monaco
 *
 * To update types, edit the individual .d.ts files in ./types/
 */

// Import actual .d.ts files as raw strings using Vite's ?raw suffix
import behaviorTypes from "./types/behavior.d.ts?raw";
import globalTypes from "./types/globals.d.ts?raw";
import lambdaTypes from "./types/lambda.d.ts?raw";
import physicsTypes from "./types/physics.d.ts?raw";
import threeTypes from "./types/three-subset.d.ts?raw";
import uikitTypes from "./types/uikit.d.ts?raw";

/**
 * Get combined type definitions for behavior scripts
 * @returns Combined TypeScript declarations as a string
 */
export const getBehaviorTypeDefinitions = (): string => {
    return [
        "// ==========================================================================",
        "// Auto-generated from .d.ts files in CodeEditor/types/",
        "// Edit those files to update these type definitions",
        "// ==========================================================================",
        "",
        "// THREE.js Types",
        threeTypes,
        "",
        "// Physics Types",
        physicsTypes,
        "",
        "// Behavior & GameManager Types",
        behaviorTypes,
        "",
        "// Lambda Types",
        lambdaTypes,
        "",
        "// UIKit Types",
        uikitTypes,
        "",
        "// Global Declarations",
        globalTypes,
    ].join("\n");
};
