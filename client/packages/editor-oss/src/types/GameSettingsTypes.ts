// ===================================================================
// Game Settings Types - Basic Interface Definitions
// ===================================================================
// This file provides basic type definitions for core Game Settings functionality.

import type {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import type {OrientationPolicy} from "../utils/orientationPolicy";

export type HUDRendererMode = "html" | "uikit";

// Rendering settings interface
export interface RenderingSettings {
  shadowMapType: number;
  ambient: {color: string; intensity: number};
  hemisphere: {skyColor: string; groundColor: string; intensity: number};
  fog: {
    type: string; 
    color: string; 
    near?: number; 
    far?: number; 
    density?: number;
    heightMin?: number;
    heightMax?: number;
    heightFalloff?: 'linear' | 'exp';
  };
  background: {
    type: 'Color' | 'Texture' | 'Cubemap' | 'Gradient';
    color: string;
    gradient?: string;
    gradientMode?: '2d' | '3d';
    texture?: string;
    textureAsset?: AssetRef;
    cubemap?: [string, string, string, string, string, string];
    cubemapAssets?: Array<AssetRef | undefined>;
    rotation?: number;
    intensity?: number;
    blurriness?: number;
  };
  toneMapping: {type: string; exposure: number};
}

// Basic game settings interface
export interface GameSettings {
    // Core game properties
    enabled: boolean;
    lives: number;
    maxScore: number;
    timer: number;
    gravity: number;

    // Display and behavior settings
    useAvatar: boolean;
    isMultiplayer: boolean;
    showStats: boolean;
    useInstancing: boolean;
    useShadows: boolean;
    rendering: RenderingSettings;
    voiceChatEnabled: boolean;
    isSandbox: boolean;
    showHUD: boolean;
    hudRenderer: HUDRendererMode;
    usePhysicsWorker: boolean;
    orientationPolicy: OrientationPolicy;
}
