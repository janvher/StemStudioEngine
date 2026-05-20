/**
 * Type definitions for the quality system
 */

import type { IQualitySettings, IPerformanceMetrics } from './interfaces/IQualityManager';
import type { QualityManager } from './QualityManager';
import type EngineRuntime from '@stem/editor-oss/EngineRuntime';


/**
 * Extended EngineRuntime interface with quality system support
 */
export interface IEngineRuntimeWithQuality extends EngineRuntime {
    qualityManager?: QualityManager;
}

/**
 * Re-export all quality system types for convenience
 */
export type { IPerformanceMetrics, IQualityModule } from './interfaces/IQualityManager';
export type { IQualitySettings } from './interfaces/IQualityManager';

/**
 * Quality preset ID type
 */
export type QualityPresetId = 'ultra' | 'high' | 'medium' | 'low' | 'performance';

/**
 * Helper function to get quality manager from an EngineRuntime instance
 * @param engine EngineRuntime instance
 * @returns Quality manager instance or null if not initialized
 */
export function getQualityManager(engine: EngineRuntime | null | undefined): QualityManager | null {
    if (!engine) return null;
    
    const engineWithQuality = engine as IEngineRuntimeWithQuality;
    return engineWithQuality.qualityManager || null;
}

/**
 * Quality level type for simplified quality settings
 */
export type QualityLevel = 'minimal' | 'low' | 'medium' | 'high' | 'ultra';

/**
 * Performance thresholds for auto-quality adjustment
 */
export interface IPerformanceThresholds {
    targetFPS: number;
    minFPS: number;
    maxFPS: number;
    adjustmentCooldown: number;
    stabilityWindow: number;
}

/**
 * Device tier classification
 */
export type DeviceTier = 1 | 2 | 3;

/**
 * GPU vendor types
 */
export type GPUVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'qualcomm' | 'unknown';

/**
 * Platform types
 */
export type Platform = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/**
 * Quality change event data
 */
export interface IQualityChangeEventData {
    previousSettings: IQualitySettings;
    newSettings: IQualitySettings;
    reason: 'manual' | 'auto' | 'preset' | 'device' | 'performance' | 'thermal' | 'battery' | 'network';
    timestamp: number;
}

/**
 * EngineRuntime mode change event data
 */
export interface IModeChangeEventData {
    mode: 'PLAY' | 'EDIT' | 'SANDBOX' | 'IDLE';
    previousMode?: string;
}

/**
 * LOD creation options
 */
export interface ILODOptions {
    levels?: number;
    reductionFactors?: number[];
    distances?: number[];
    preserveUVs?: boolean;
}

/**
 * Extended window interface for experimental APIs
 */
export interface IExtendedWindow extends Window {
    getScreenDetails?: () => Promise<{
        screens: Array<{ width: number; height: number; refreshRate: number }>;
    }>;
    ThermalObserver?: new (callback: (entries: Array<{ state: string }>) => void) => {
        observe(): void;
        disconnect(): void;
    };
}

/**
 * Extended navigator interface for experimental APIs
 */
export interface IExtendedNavigator extends Navigator {
    deviceMemory?: number;
    getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (event: string, callback: () => void) => void;
    }>;
}

/**
 * Device capabilities snapshot
 */
export interface IDeviceCapabilities {
    gpu: {
        vendor: string;
        renderer: string;
        tier: number;
        isMobile: boolean;
        isIntegrated: boolean;
    };
    cpu: {
        cores: number;
        estimatedSpeed: number;
    };
    memory: {
        deviceMemory: number;
        maxTextureSize: number;
        maxTextures: number;
        maxVertexAttributes: number;
    };
    display: {
        width: number;
        height: number;
        pixelRatio: number;
        refreshRate: number;
    };
    platform: {
        isMobile: boolean;
        isTablet: boolean;
        os: string;
        browser: string;
    };
    webgpu: {
        supported: boolean;
        architecture: string;
        vendor: string;
        device: string;
    };
    features: {
        sharedArrayBuffer: boolean;
        webgl2: boolean;
        webgl2Extensions: string[];
    };
}

/**
 * Performance history entry
 */
export interface IPerformanceHistoryEntry {
    timestamp: number;
    metrics: IPerformanceMetrics;
    settings: IQualitySettings;
}

/**
 * Developer-defined quality configuration (saved with scene/project)
 */
export interface IDeveloperQualityConfig {
    // Default settings when game first loads
    defaultPreset: string;
    defaultAutoQualityEnabled: boolean;
    defaultTargetFPS: number;
    
    // Available presets for players to choose from
    availablePresets: string[];
    allowCustomSettings: boolean;
    
    // Constraints for player adjustments
    constraints: {
        rendering: {
            minShadowQuality?: 'none' | 'low' | 'medium' | 'high' | 'ultra';
            maxShadowQuality?: 'none' | 'low' | 'medium' | 'high' | 'ultra';
            minPixelRatio?: number;
            maxPixelRatio?: number;
            allowPostProcessing?: boolean;
            allowReflections?: boolean;
            // ... other constraints
        };
        physics: {
            minUpdateRate?: number;
            maxUpdateRate?: number;
            // ... other constraints
        };
        behavior: {
            minUpdateRate?: number;
            maxUpdateRate?: number;
            // ... other constraints
        };
    };
    
    // Platform-specific overrides
    platformOverrides?: {
        mobile?: Partial<IDeveloperQualityConfig>;
        tablet?: Partial<IDeveloperQualityConfig>;
        desktop?: Partial<IDeveloperQualityConfig>;
    };
}

/**
 * Runtime quality state combining developer config and player preferences
 */
export interface IRuntimeQualityState {
    // Developer's configuration
    developerConfig: IDeveloperQualityConfig;
    
    // Player's current settings (overrides defaults)
    playerSettings: IQualitySettings;
    
    // Whether player has customized settings
    hasPlayerCustomization: boolean;
    
    // Current effective settings (merged)
    effectiveSettings: IQualitySettings;
}
