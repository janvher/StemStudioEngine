export enum ScaleMode {
    NONE = "none",
    WIDTH = "width", 
    HEIGHT = "height",
    MIN = "min",
    MAX = "max",
    DPI = "dpi"
}

export interface ScalingConfig {
    scaleMode: ScaleMode | string;
    targetScreenWidth: number;
    targetScreenHeight: number;
}

export class TouchControlsScaler {
    private config: ScalingConfig;
    private static readonly FALLBACK_SCALING_SIZE = 400;
    private viewportOverride: {width: number; height: number} | null = null;
    private actualViewportOverride: {width: number; height: number} | null = null;
    private dpiOverride: number | null = null;

    constructor(config: ScalingConfig) {
        this.config = config;
    }

    public updateConfig(config: ScalingConfig): void {
        this.config = config;
    }

    public setViewportOverride(viewport: {width: number; height: number} | null): void {
        this.viewportOverride = viewport;
    }

    public setActualViewportOverride(viewport: {width: number; height: number} | null): void {
        this.actualViewportOverride = viewport;
    }

    public setDpiOverride(dpi: number | null): void {
        this.dpiOverride = dpi;
    }

    public scaleSize(size: number): number {
        const scaleMode = this.normalizeScaleMode(this.config.scaleMode);
        
        if (scaleMode === ScaleMode.NONE) {
            return size;
        }

        const viewport = this.actualViewportOverride || this.getViewportDimensions();
        const scaleFactor = this.calculateScaleFactor(scaleMode, viewport);

        return Math.round(size * scaleFactor);
    }

    public scalePosition(position: {x: number; y: number}): {x: number; y: number} {
        // Use actual viewport for positioning if available (editor mode)
        const viewport = this.actualViewportOverride || this.getViewportDimensions();
        
        // Clamp values between 0 and 1
        const clampedX = Math.max(0, Math.min(1, position.x));
        const clampedY = Math.max(0, Math.min(1, position.y));

        return {
            x: clampedX * viewport.width,
            y: clampedY * viewport.height,
        };
    }

    private normalizeScaleMode(scaleMode: ScaleMode | string): ScaleMode {
        // Convert string to enum if needed
        if (typeof scaleMode === "string") {
            return (ScaleMode as any)[scaleMode.toUpperCase()] || ScaleMode.NONE;
        }
        
        return scaleMode;
    }

    private calculateScaleFactor(scaleMode: ScaleMode, viewport: {width: number; height: number}): number {
        switch (scaleMode) {
            case ScaleMode.WIDTH:
                return viewport.width / this.config.targetScreenWidth;
                
            case ScaleMode.HEIGHT:
                return viewport.height / this.config.targetScreenHeight;
                
            case ScaleMode.MIN: {
                const minTargetDimension = Math.min(this.config.targetScreenWidth, this.config.targetScreenHeight);
                const minCurrentDimension = Math.min(viewport.width, viewport.height);
                return minCurrentDimension / minTargetDimension;
            }

            case ScaleMode.MAX: {
                const maxTargetDimension = Math.max(this.config.targetScreenWidth, this.config.targetScreenHeight);
                const maxCurrentDimension = Math.max(viewport.width, viewport.height);
                return maxCurrentDimension / maxTargetDimension;
            }

            case ScaleMode.DPI: {
                // DPI-based scaling with viewport adjustment
                // In editor mode: scale proportionally to preview frame vs design viewport
                const baseDpi = this.dpiOverride ?? window.devicePixelRatio ?? 1;
                
                if (this.viewportOverride && this.actualViewportOverride) {
                    // Apply viewport scale to DPI factor
                    const viewportScaleX = viewport.width / this.viewportOverride.width;
                    const viewportScaleY = viewport.height / this.viewportOverride.height;
                    const viewportScale = Math.min(viewportScaleX, viewportScaleY);
                    return baseDpi * viewportScale;
                }
                
                return baseDpi;
            }

            default:
                // Fallback
                return Math.min(viewport.width, viewport.height) / TouchControlsScaler.FALLBACK_SCALING_SIZE;
        }
    }

    private getViewportDimensions(): {width: number; height: number} {
        if (this.viewportOverride) {
            return this.viewportOverride;
        }
        
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
}
