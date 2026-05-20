/**
 * Performance configuration for visibility checker and behavior system
 */

export const CACHE_CONFIG = {
    visibility: {
        maxSize: 1000,
        defaultTTL: 1000, // milliseconds (1 second - more reasonable for visibility cache)
        cleanupInterval: 30000, // milliseconds (30 seconds)
        enableProactiveCleanup: true, // Set to false to rely only on periodic cleanup during isVisible calls
        enableStats: true,
        debugMode: false, // Set to true to see cleanup logs
    },
};

// Export for use in VisibilityChecker
/**
 *
 */
export function getVisibilityCacheConfig() {
    return CACHE_CONFIG.visibility;
}