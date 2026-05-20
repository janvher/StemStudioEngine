import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QualityPresets } from "./QualityPresets";
import { QualitySystemIntegration } from "./QualitySystemIntegration";

/**
 *
 */
function createSettings() {
    const settings = JSON.parse(JSON.stringify(QualityPresets.getDefault().settings));
    settings.rendering.pixelRatio = 1;
    settings.rendering.shadowQuality = "high";
    settings.rendering.bloom = true;
    return settings;
}

let originalWindow: typeof globalThis.window | undefined;

/**
 *
 */
function createHarness() {
    const integration = new (QualitySystemIntegration as any)() as QualitySystemIntegration;
    const renderer = {
        updatePostProcessingFromScene: vi.fn(),
    };
    const scene = {
        userData: {
            postProcessing: {
                outline: {
                    enabled: true,
                },
            },
        },
    };
    const currentSettings = createSettings();
    const qualityManager = {
        getCurrentSettings: vi.fn(() => currentSettings),
        setRuntimeRenderingOverride: vi.fn(),
    };

    (integration as any).qualityManager = qualityManager;
    (integration as any).initialized = true;
    (integration as any).scheduleRenderPressureTierApply = (tier: number) => {
        (integration as any).applyRenderPressureTier(tier);
    };
    (integration as any).engine = {
        game: { scene },
        editor: null,
        event: {
            events: [
                {
                    createRenderer: vi.fn(),
                    renderer,
                },
            ],
        },
    };

    return { integration, qualityManager, renderer, scene };
}

beforeEach(() => {
    originalWindow = globalThis.window;
    (globalThis as any).window = {
        ...(originalWindow ?? {}),
        devicePixelRatio: originalWindow?.devicePixelRatio ?? 1,
    };
});

afterEach(() => {
    if (originalWindow === undefined) {
        delete (globalThis as any).window;
    } else {
        (globalThis as any).window = originalWindow;
    }
});

describe("QualitySystemIntegration render pressure policy", () => {
    it("waits for sustained pressure samples before changing quality", () => {
        const { integration, qualityManager } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 5; i++) {
            policy.update(40, 16);
        }

        expect(qualityManager.setRuntimeRenderingOverride).not.toHaveBeenCalled();
    });

    it("sheds bloom, outline and resolution at the highest pressure tier", () => {
        const { integration, qualityManager, renderer, scene } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 6; i++) {
            // signalMs=40, targetFrameMs≈16.67 → tier 4
            policy.update(40, 16);
        }

        expect(qualityManager.setRuntimeRenderingOverride).toHaveBeenCalledWith(
            expect.objectContaining({
                bloom: false,
                pixelRatio: 0.85,
            }),
        );
        expect(scene.userData.postProcessing.outline.enabled).toBe(false);
        expect(renderer.updatePostProcessingFromScene).toHaveBeenCalled();
    });

    it("caps desktop effective DPR under pressure at tier 3", () => {
        const { integration, qualityManager } = createHarness();
        const policy = integration.createRenderPressurePolicy();
        Object.defineProperty(window, "devicePixelRatio", {
            configurable: true,
            value: 2,
        });
        (integration as any).getDeviceCategory = () => "Desktop";

        for (let i = 0; i < 6; i++) {
            // signalMs=13, targetFrameMs≈16.67 → 13 > 16.67*0.7=11.67 → tier 2
            policy.update(13, 16);
        }

        expect(qualityManager.setRuntimeRenderingOverride).toHaveBeenCalledWith(
            expect.objectContaining({
                bloom: false,
            }),
        );
    });

    it("requires sustained recovery before restoring pressure overrides", () => {
        const { integration, qualityManager, renderer, scene } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 6; i++) {
            policy.update(40, 16);
        }
        qualityManager.setRuntimeRenderingOverride.mockClear();
        renderer.updatePostProcessingFromScene.mockClear();

        for (let i = 0; i < 7; i++) {
            policy.update(1, 1);
        }

        expect(qualityManager.setRuntimeRenderingOverride).not.toHaveBeenCalled();
        // Outline stays disabled during hysteresis
        expect(scene.userData.postProcessing.outline.enabled).toBe(false);

        policy.update(1, 1);

        expect(qualityManager.setRuntimeRenderingOverride).toHaveBeenCalledWith(null);
        // Outline restored after full recovery
        expect(scene.userData.postProcessing.outline.enabled).toBe(true);
        expect(renderer.updatePostProcessingFromScene).toHaveBeenCalled();
    });

    it("resets recovery progress if pressure returns before hysteresis completes", () => {
        const { integration, qualityManager } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 6; i++) {
            policy.update(40, 16);
        }
        qualityManager.setRuntimeRenderingOverride.mockClear();

        for (let i = 0; i < 6; i++) {
            policy.update(1, 1);
        }

        for (let i = 0; i < 6; i++) {
            policy.update(40, 16);
        }

        for (let i = 0; i < 7; i++) {
            policy.update(1, 1);
        }

        expect(qualityManager.setRuntimeRenderingOverride).not.toHaveBeenCalled();
    });

    it("disables bloom at tier 1 without touching outline or shadows", () => {
        const { integration, qualityManager, renderer, scene } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 6; i++) {
            // signalMs=10.5, targetFrameMs≈16.67 → tier 1
            policy.update(10.5, 16);
        }

        expect(qualityManager.setRuntimeRenderingOverride).toHaveBeenCalledWith({
            bloom: false,
        });
        // Outline stays enabled at tier 1
        expect(scene.userData.postProcessing.outline.enabled).toBe(true);
        expect(renderer.updatePostProcessingFromScene).not.toHaveBeenCalled();
    });

    it("disables bloom and outline at tier 2", () => {
        const { integration, qualityManager, renderer, scene } = createHarness();
        const policy = integration.createRenderPressurePolicy();

        for (let i = 0; i < 6; i++) {
            // signalMs=13, targetFrameMs≈16.67 → 13 > 16.67*0.7=11.67 → tier 2
            policy.update(13, 16);
        }

        expect(qualityManager.setRuntimeRenderingOverride).toHaveBeenCalledWith(
            expect.objectContaining({
                bloom: false,
            }),
        );
        expect(scene.userData.postProcessing.outline.enabled).toBe(false);
        expect(renderer.updatePostProcessingFromScene).toHaveBeenCalled();
    });
});
