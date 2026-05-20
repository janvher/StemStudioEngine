import { describe, it, expect, vi } from "vitest";

describe("Application forceWebGL logic", () => {
    describe("getRendererSettings", () => {
        it("should return correct defaults when no rendering userData exists", () => {
            const mockApp = {
                editor: { scene: { userData: {} as Record<string, unknown> } },
                getRendererSettings() {
                    const rendering = this.editor?.scene?.userData?.rendering as { forceWebGL?: boolean; forceWebGLForVFX?: boolean } | undefined;
                    return {
                        forceWebGL: rendering?.forceWebGL || false,
                        forceWebGLForVFX: rendering?.forceWebGLForVFX ?? true,
                    };
                },
            };

            const settings = mockApp.getRendererSettings();
            expect(settings.forceWebGL).toBe(false);
            expect(settings.forceWebGLForVFX).toBe(true);
        });

        it("should read forceWebGL from scene userData", () => {
            const mockApp = {
                editor: { scene: { userData: { rendering: { forceWebGL: true, forceWebGLForVFX: false } } } },
                getRendererSettings() {
                    const rendering = this.editor?.scene?.userData?.rendering as { forceWebGL?: boolean; forceWebGLForVFX?: boolean } | undefined;
                    return {
                        forceWebGL: rendering?.forceWebGL || false,
                        forceWebGLForVFX: rendering?.forceWebGLForVFX ?? true,
                    };
                },
            };

            const settings = mockApp.getRendererSettings();
            expect(settings.forceWebGL).toBe(true);
            expect(settings.forceWebGLForVFX).toBe(false);
        });
    });

    describe("checkAndRecreateRenderer", () => {
        it("should not trigger recreateRenderer on first call", () => {
            const mockRecreate = vi.fn();
            let lastSetting: boolean | undefined;

            const checkAndRecreateRenderer = (currentForceWebGL: boolean) => {
                if (lastSetting !== undefined && lastSetting !== currentForceWebGL) {
                    mockRecreate();
                }
                lastSetting = currentForceWebGL;
            };

            checkAndRecreateRenderer(false);
            expect(mockRecreate).not.toHaveBeenCalled();
        });

        it("should trigger recreateRenderer when setting changes", () => {
            const mockRecreate = vi.fn();
            let lastSetting: boolean | undefined;

            const checkAndRecreateRenderer = (currentForceWebGL: boolean) => {
                if (lastSetting !== undefined && lastSetting !== currentForceWebGL) {
                    mockRecreate();
                }
                lastSetting = currentForceWebGL;
            };

            checkAndRecreateRenderer(false);
            checkAndRecreateRenderer(true);
            expect(mockRecreate).toHaveBeenCalledOnce();
        });

        it("should not trigger recreateRenderer when setting stays the same", () => {
            const mockRecreate = vi.fn();
            let lastSetting: boolean | undefined;

            const checkAndRecreateRenderer = (currentForceWebGL: boolean) => {
                if (lastSetting !== undefined && lastSetting !== currentForceWebGL) {
                    mockRecreate();
                }
                lastSetting = currentForceWebGL;
            };

            checkAndRecreateRenderer(false);
            checkAndRecreateRenderer(false);
            checkAndRecreateRenderer(false);
            expect(mockRecreate).not.toHaveBeenCalled();
        });
    });
});
