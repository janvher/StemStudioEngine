/**
 * Quality System Public API
 * 
 * This is the main entry point for the quality system.
 * All external modules should import from this file.
 */

// Core exports
export { QualityManager } from './QualityManager';
export { QualitySystemIntegration } from './QualitySystemIntegration';
export { PerformanceMonitor } from './PerformanceMonitor';
export { DeviceCapabilityDetector } from './DeviceCapabilityDetector';
export { QualityPersistence } from './QualityPersistence';
export { QualityPresets } from './QualityPresets';

// Type exports
export type {
    QualityLevel,
    IQualitySettings,
    QualityPresetId,
    Platform,
    DeviceTier,
    IPerformanceMetrics,
    IDeviceCapabilities,
    IQualityChangeEventData,
    IModeChangeEventData,
    IDeveloperQualityConfig,
    getQualityManager,
} from './types';

// Constant exports
export {
    QUALITY_PRESET_NAMES,
    PLATFORM_DEFAULTS,
    DEFAULT_QUALITY_SETTINGS,
    PERFORMANCE_CONSTANTS,
    DEVICE_TIERS,
    STORAGE_KEYS,
} from './constants';

// Module exports
export { RenderingQualityModule } from './modules/RenderingQualityModule';
export { PhysicsQualityModule } from './modules/PhysicsQualityModule';
export { BehaviorQualityModule } from './modules/BehaviorQualityModule';

// Interface exports
export type { IQualityManager, IQualityPreset, IQualityModule } from './interfaces/IQualityManager';

// Import dependencies for production functions
import { PLATFORM_DEFAULTS } from './constants';
import { QualitySystemIntegration } from './QualitySystemIntegration';
import type { Platform } from './types';
import type EngineRuntime from '@stem/editor-oss/EngineRuntime';

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for mobile devices
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'mobile';
    }

    // Check for tablets
    if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
        return 'tablet';
    }

    // Default to desktop
    return 'desktop';
}

/**
 * Initialize the quality system with the runtime engine
 * @param engine The EngineRuntime instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initializeQualitySystem(engine: any): Promise<void> {
    try {
        const qualitySystem = QualitySystemIntegration.getInstance();

        // Initialize the quality system
        await qualitySystem.initialize(engine);

        // Detect platform and apply appropriate defaults
        const platform = detectPlatform();
        const platformDefaults = PLATFORM_DEFAULTS[platform as keyof typeof PLATFORM_DEFAULTS] || PLATFORM_DEFAULTS.desktop;

        // Apply platform-specific preset
        await qualitySystem.applyPreset(platformDefaults.defaultPreset);

        console.log(`[Quality] System initialized for ${platform} platform with ${platformDefaults.defaultPreset} preset`);
    } catch (error) {
        console.error('[Quality] Failed to initialize system:', error);
        // Don't throw - quality system is optional enhancement
    }
}

/**
 * Cleanup quality system resources
 */
export function disposeQualitySystem(): void {
    try {
        const qualitySystem = QualitySystemIntegration.getInstance();
        qualitySystem.dispose();
    } catch (error) {
        console.error('[Quality] Failed to dispose system:', error);
    }
}

/**
 * Quick setup function for integrating the quality system
 * @param engine The EngineRuntime instance
 * @param options Configuration options
 * @param options.defaultPreset
 */
export async function setupQualitySystem(
    engine: EngineRuntime,
    options: {
        defaultPreset?: string;
    } = {},
): Promise<QualitySystemIntegration> {
    const qualitySystem = QualitySystemIntegration.getInstance();

    // Initialize the quality system
    await qualitySystem.initialize(engine);

    // Apply default preset if specified
    if (options.defaultPreset) {
        await qualitySystem.applyPreset(options.defaultPreset);
    }

    return qualitySystem;
}
