import { getGPUTier } from 'detect-gpu';

import type { IQualitySettings } from './interfaces/IQualityManager';
import type { DeviceLane } from './QualityLanes';
import { getLane } from './QualityLanes';
import { QualityPresets } from './QualityPresets';
import type { IExtendedNavigator, IExtendedWindow } from './types';

interface DeviceCapabilities {
    gpu: {
        vendor: string;
        renderer: string;
        tier: number; // 1-3, where 3 is high-end
        isMobile: boolean;
        isIntegrated: boolean;
    };
    cpu: {
        cores: number;
        estimatedSpeed: number; // MHz
    };
    memory: {
        deviceMemory: number; // GB
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
 * Detects device capabilities and recommends quality settings
 */
export class DeviceCapabilityDetector {
    private capabilities: DeviceCapabilities | null = null;
    private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    
    // GPU tier database (simplified version)
    private readonly gpuTiers = new Map<string, number>([
        // High-end desktop GPUs (Tier 3)
        ['nvidia geforce rtx 4090', 3],
        ['nvidia geforce rtx 4080', 3],
        ['nvidia geforce rtx 4070', 3],
        ['nvidia geforce rtx 3090', 3],
        ['nvidia geforce rtx 3080', 3],
        ['amd radeon rx 7900', 3],
        ['amd radeon rx 6900', 3],
        
        // Mid-range GPUs (Tier 2)
        ['nvidia geforce rtx 3060', 2],
        ['nvidia geforce rtx 2070', 2],
        ['nvidia geforce gtx 1080', 2],
        ['nvidia geforce gtx 1070', 2],
        ['amd radeon rx 6700', 2],
        ['amd radeon rx 5700', 2],
        
        // Low-end GPUs (Tier 1)
        ['nvidia geforce gtx 1050', 1],
        ['nvidia geforce gtx 1650', 1],
        ['amd radeon rx 550', 1],
        ['intel uhd graphics', 1],
        ['intel iris', 1],
        
        // Mobile GPUs
        ['apple gpu', 2], // M1, M2, etc.
        ['adreno', 1],
        ['mali', 1],
        ['powervr', 1],
    ]);

    /**
     * Synchronously determine whether anti-aliasing should be enabled.
     * Creates a temporary WebGL context for GPU detection; safe to call
     * before the main renderer exists.
     */
    public shouldEnableAntialias(): boolean {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        let gpuTier = 2;
        let isMobile = false;

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
                isMobile =
                    renderer.includes('adreno') ||
                    renderer.includes('mali') ||
                    renderer.includes('powervr') ||
                    renderer.includes('apple');

                // Check for known low-end GPUs
                if (renderer.includes('intel') || renderer.includes('integrated')) {
                    gpuTier = 1;
                }
            }
            const loseCtx = gl.getExtension('WEBGL_lose_context');
            if (loseCtx) loseCtx.loseContext();
        }
        canvas.remove();

        // High-DPI displays already have effective supersampling — skip AA
        if (window.devicePixelRatio >= 2) return false;

        // Low-end mobile GPUs: skip AA
        if (gpuTier <= 1 && isMobile) return false;

        return true;
    }

    public async detectCapabilities(): Promise<IQualitySettings> {
        if (!this.capabilities) {
            this.capabilities = await this.gatherDeviceInfo();
        }
        
        return this.generateQualitySettings(this.capabilities);
    }

    public getRecommendedSettings(): IQualitySettings {
        if (!this.capabilities) {
            // Return safe defaults if detection hasn't run
            return QualityPresets.getDefault().settings;
        }
        
        return this.generateQualitySettings(this.capabilities);
    }

    public getDeviceScore(): number {
        if (!this.capabilities) return 0.5;

        const gpuScore = this.capabilities.gpu.tier / 3;
        const memoryScore = Math.min(this.capabilities.memory.deviceMemory / 16, 1);
        const cpuScore = Math.min(this.capabilities.cpu.cores / 8, 1);
        const platformScore = this.capabilities.platform.isMobile ? 0.3 : 1;
        // WebGPU bonus: devices with WebGPU support can handle more
        const webgpuBonus = this.capabilities.webgpu.supported ? 0.1 : 0;

        // Weighted average
        return Math.min(1, 
            gpuScore * 0.4 +
            memoryScore * 0.2 +
            cpuScore * 0.2 +
            platformScore * 0.2
         + webgpuBonus);
    }

    /** Whether WebGPU is available on this device. */
    public get webgpuSupported(): boolean {
        return this.capabilities?.webgpu.supported ?? false;
    }

    /** Whether SharedArrayBuffer is available (needed for worker physics). */
    public get sharedArrayBufferSupported(): boolean {
        return this.capabilities?.features.sharedArrayBuffer ?? false;
    }

    /**
     * Detect the device lane for adaptive quality.
     * Uses detect-gpu for GPU tier and platform detection for lane classification.
     * Returns the lane and a recommended starting rung index (±1 from default).
     */
    public async detectDeviceLane(): Promise<{ lane: DeviceLane; startPresetId: string }> {
        if (!this.capabilities) {
            this.capabilities = await this.gatherDeviceInfo();
        }

        const caps = this.capabilities;
        let lane: DeviceLane;

        // Classify device lane
        if (caps.platform.os === 'ios') {
            lane = 'ios';
        } else if (caps.platform.os === 'android' || (caps.platform.isMobile && caps.platform.os !== 'macos')) {
            lane = 'android';
        } else if (caps.gpu.renderer.toLowerCase().includes('apple') || caps.webgpu.vendor.toLowerCase().includes('apple')) {
            lane = 'apple_silicon';
        } else if (caps.gpu.isIntegrated) {
            lane = 'desktop_integrated';
        } else {
            lane = 'desktop_discrete';
        }

        // Use detect-gpu for refined tier, allow ±1 rung adjustment
        const laneDef = getLane(lane);
        let rungIndex = laneDef.defaultRungIndex;

        try {
            const gpuTier = await getGPUTier();
            if (gpuTier.tier >= 3 && rungIndex < laneDef.rungs.length - 1) {
                rungIndex++;
            } else if (gpuTier.tier <= 1 && rungIndex > 0) {
                rungIndex--;
            }
        } catch {
            // Fallback to default rung
        }

        return { lane, startPresetId: laneDef.rungs[rungIndex]! };
    }

    private async gatherDeviceInfo(): Promise<DeviceCapabilities> {
        // Create temporary canvas for WebGL context
        const canvas = document.createElement('canvas');
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        const capabilities: DeviceCapabilities = {
            gpu: this.detectGPU(),
            cpu: this.detectCPU(),
            memory: this.detectMemory(),
            display: this.detectDisplay(),
            platform: this.detectPlatform(),
            webgpu: await this.detectWebGPU(),
            features: this.detectFeatures(),
        };
        
        // Clean up
        if (this.gl) {
            const loseContext = this.gl.getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
        }
        canvas.remove();
        
        return capabilities;
    }

    private detectGPU(): DeviceCapabilities['gpu'] {
        if (!this.gl) {
            return {
                vendor: 'unknown',
                renderer: 'unknown',
                tier: 1,
                isMobile: false,
                isIntegrated: false,
            };
        }
        
        const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
        let vendor = 'unknown';
        let renderer = 'unknown';
        
        if (debugInfo) {
            vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
            renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
        
        const rendererLower = renderer.toLowerCase();
        
        // Determine GPU tier
        let tier = 1;
        this.gpuTiers.forEach((gpuTier, gpu) => {
            if (rendererLower.includes(gpu) && tier === 1) {
                tier = gpuTier;
            }
        });
        
        // Check if integrated GPU
        const isIntegrated = 
            rendererLower.includes('intel') ||
            rendererLower.includes('integrated') ||
            rendererLower.includes('uhd graphics');
        
        // Check if mobile GPU
        const isMobile = 
            rendererLower.includes('adreno') ||
            rendererLower.includes('mali') ||
            rendererLower.includes('powervr') ||
            rendererLower.includes('apple');
        
        return { vendor, renderer, tier, isMobile, isIntegrated };
    }

    private detectCPU(): DeviceCapabilities['cpu'] {
        // Navigator.hardwareConcurrency gives logical cores
        const cores = navigator.hardwareConcurrency || 4;
        
        // Estimate CPU speed based on a simple benchmark
        const estimatedSpeed = this.estimateCPUSpeed();
        
        return { cores, estimatedSpeed };
    }

    private detectMemory(): DeviceCapabilities['memory'] {
        const navigator = window.navigator as IExtendedNavigator;
        const deviceMemory = navigator.deviceMemory || 4; // GB
        
        if (!this.gl) {
            return {
                deviceMemory,
                maxTextureSize: 2048,
                maxTextures: 8,
                maxVertexAttributes: 16,
            };
        }
        
        return {
            deviceMemory,
            maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
            maxTextures: this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS),
            maxVertexAttributes: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
        };
    }

    private detectDisplay(): DeviceCapabilities['display'] {
        const screen = window.screen;
        
        // Try to detect refresh rate (experimental)
        let refreshRate = 60;
        if ('getScreenDetails' in window) {
            // Screen Details API (experimental)
            const extWindow = window as IExtendedWindow;
            if (extWindow.getScreenDetails) {
                extWindow.getScreenDetails().then((details) => {
                    if (details.screens && details.screens[0] && details.screens[0].refreshRate) {
                        refreshRate = details.screens[0].refreshRate;
                    }
                }).catch(() => {
                    // Fallback to 60Hz
                });
            }
        }
        
        return {
            width: screen.width,
            height: screen.height,
            // NOTE: we use pixelRatio as a multiplier of the base pixel density (devicePixelRatio)
            pixelRatio: 1,
            refreshRate,
        };
    }

    private detectPlatform(): DeviceCapabilities['platform'] {
        const ua = navigator.userAgent.toLowerCase();
        
        // Detect mobile
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        
        // Detect tablet
        const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua);
        
        // Detect OS
        let os = 'unknown';
        if (ua.includes('windows')) os = 'windows';
        else if (ua.includes('mac')) os = 'macos';
        else if (ua.includes('linux')) os = 'linux';
        else if (ua.includes('android')) os = 'android';
        else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
        
        // Detect browser
        let browser = 'unknown';
        if (ua.includes('chrome')) browser = 'chrome';
        else if (ua.includes('firefox')) browser = 'firefox';
        else if (ua.includes('safari')) browser = 'safari';
        else if (ua.includes('edge')) browser = 'edge';
        
        return { isMobile, isTablet, os, browser };
    }

    private async detectWebGPU(): Promise<DeviceCapabilities['webgpu']> {
        const fallback = { supported: false, architecture: '', vendor: '', device: '' };
        try {
            const nav = navigator as Navigator & { gpu?: GPU };
            if (!nav.gpu) return fallback;
            const adapter = await nav.gpu.requestAdapter();
            if (!adapter) return { ...fallback, supported: true }; // API exists but no adapter
            const info = adapter.info;
            return {
                supported: true,
                architecture: info.architecture ?? '',
                vendor: info.vendor ?? '',
                device: info.device ?? '',
            };
        } catch {
            return fallback;
        }
    }

    private detectFeatures(): DeviceCapabilities['features'] {
        const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
        const canvas = document.createElement('canvas');
        const gl2 = canvas.getContext('webgl2');
        const webgl2 = gl2 !== null;
        const webgl2Extensions = gl2 ? gl2.getSupportedExtensions() ?? [] : [];
        canvas.remove();
        return { sharedArrayBuffer, webgl2, webgl2Extensions };
    }

    private estimateCPUSpeed(): number {
        // Disabled for performance reasons — benchmark adds ~50ms to startup
        return 3000;
    }

    private generateQualitySettings(capabilities: DeviceCapabilities): IQualitySettings {
        const score = this.getDeviceScore();

        // Use iOS preset for iOS devices (iPhone/iPad)
        if (capabilities.platform.os === 'ios') {
            const iosPreset = QualityPresets.getPreset('ios');
            if (iosPreset) {
                return { ...iosPreset.settings };
            }
        }

        // Use mobile preset for other mobile devices (Android, etc.)
        if (capabilities.platform.isMobile) {
            const mobilePreset = QualityPresets.getPreset('mobile');
            if (mobilePreset) {
                return { ...mobilePreset.settings };
            }
        }

        const basePreset = QualityPresets.getPresetForDevice(score);
        const settings = { ...basePreset.settings };
        
        // Adjust for high refresh rate displays
        if (capabilities.display.refreshRate > 60) {
            settings.physics.updateRate = Math.min(
                settings.physics.updateRate,
                capabilities.display.refreshRate,
                120,
            );
            settings.behavior.updateRate = Math.min(
                settings.behavior.updateRate,
                capabilities.display.refreshRate,
                120,
            );
            settings.network.updateRate = Math.min(
                settings.network.updateRate,
                capabilities.display.refreshRate,
                120,
            );
        }
        
        // Adjust for memory constraints
        if (capabilities.memory.deviceMemory < 4) {
            settings.rendering.textureQuality = 'low';
            settings.scene.maxTriangles = Math.min(settings.scene.maxTriangles, 1000000);
            settings.behavior.maxConcurrentBehaviors = Math.min(settings.behavior.maxConcurrentBehaviors, 50);
        }
        
        // Adjust for integrated GPUs
        if (capabilities.gpu.isIntegrated) {
            settings.rendering.shadowQuality = 'low';
            settings.rendering.ssao = false;
            settings.rendering.reflections = false;
            settings.rendering.volumetricLighting = false;
        }
        
        return settings;
    }
}
