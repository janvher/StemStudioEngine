import * as THREE from "three";

import {CesiumTool} from "@stem/editor-oss/cesium/CesiumTool";
import Editor from "@stem/editor-oss/editor/Editor";
import global from "@stem/editor-oss/global";
import {BehaviorBase} from "../../Behavior";
import type GameManager from "../../game/GameManager";

type CesiumModule = typeof import("cesium");

class CesiumBehavior extends BehaviorBase {
    private editor: Editor | null = null;
    private game: GameManager | null = null;
    private viewer: import("cesium").Viewer | null = null;
    private container: HTMLDivElement | null = null;
    private previousBackground: THREE.Scene["background"] = null;
    private resizeHandler: (() => void) | null = null;
    private initPromise: Promise<void> | null = null;

    init(game: GameManager): void {
        this.game = game;
    }

    async onStart(): Promise<void> {
        await this.ensureViewer();
    }

    onStop(): void {
        this.disposeViewer();
    }

    dispose(): void {
        this.disposeViewer();
    }

    update(): void {
        this.viewer?.scene.requestRender();
    }

    onAttributesUpdated(): void {
        void this.restartViewer();
    }

    onEditorAdded(editor: Editor): void {
        this.editor = editor;
        this.syncCesiumSceneFlag(true);
        void this.ensureViewer();
    }

    onEditorRemoved(): void {
        this.disposeViewer();
        this.syncCesiumSceneFlag(false);
        this.editor = null;
    }

    onEditorDispose(): void {
        this.disposeViewer();
        this.syncCesiumSceneFlag(false);
        this.editor = null;
    }

    onEditorUpdate(): void {
        this.viewer?.resize();
        this.viewer?.scene.requestRender();
    }

    onEditorAttributesUpdated(): void {
        void this.restartViewer();
    }

    private async restartViewer(): Promise<void> {
        this.disposeViewer();
        await this.ensureViewer();
    }

    private async ensureViewer(): Promise<void> {
        if (this.viewer || this.initPromise) {
            return this.initPromise ?? Promise.resolve();
        }

        this.initPromise = this.createViewer().finally(() => {
            this.initPromise = null;
        });
        return this.initPromise;
    }

    private async createViewer(): Promise<void> {
        const app = (global as {app?: any}).app;
        const host = app?.rendererCSS?.domElement || app?.container;
        const scene = this.editor?.scene || app?.scene;
        if (!host || !scene) {
            return;
        }

        const apiKey = this.getStringAttribute("apiKey");
        const baseUrl = this.getStringAttribute("baseUrl");
        const Cesium = await CesiumTool.load({
            baseUrl,
            ionAccessToken: apiKey || undefined,
        });

        this.previousBackground = scene.background;
        scene.background = null;

        this.container = CesiumTool.ensureContainer(host, `cesium-viewer-${this.uuid}`, {
            pointerEvents: this.attributes.capturePointerEvents ? "auto" : "none",
        });

        const viewerOptions: Record<string, unknown> = {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            navigationHelpButton: false,
            requestRenderMode: true,
            sceneModePicker: false,
            selectionIndicator: false,
            shouldAnimate: true,
            timeline: false,
        };

        const imagerySource = this.getStringAttribute("imagerySource") || "osm";
        if (imagerySource === "none") {
            viewerOptions.baseLayer = false;
        } else if (imagerySource === "osm") {
            viewerOptions.baseLayer = new Cesium.ImageryLayer(
                new Cesium.OpenStreetMapImageryProvider({
                    url: this.getStringAttribute("imageryUrl") || "https://tile.openstreetmap.org/",
                }),
            );
        }

        if (this.attributes.useWorldTerrain) {
            viewerOptions.terrain = Cesium.Terrain.fromWorldTerrain();
        }

        this.viewer = new Cesium.Viewer(this.container, viewerOptions);
        this.viewer.scene.globe.enableLighting = !!this.attributes.enableLighting;
        if (this.viewer.scene.skyAtmosphere) {
            this.viewer.scene.skyAtmosphere.show = !!this.attributes.showAtmosphere;
        }
        this.viewer.scene.globe.depthTestAgainstTerrain = false;
        const creditContainer = this.viewer.cesiumWidget.creditContainer as HTMLElement | null;
        if (creditContainer) {
            creditContainer.style.display = this.attributes.showCredits ? "" : "none";
        }

        this.applyCamera(Cesium);
        this.bindResize();
        this.viewer.resize();
        this.viewer.scene.requestRender();
    }

    private applyCamera(Cesium: CesiumModule): void {
        if (!this.viewer) {
            return;
        }

        this.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
                Number(this.attributes.longitude ?? 0),
                Number(this.attributes.latitude ?? 20),
                Number(this.attributes.height ?? 18000000),
            ),
            orientation: {
                heading: Cesium.Math.toRadians(Number(this.attributes.heading ?? 0)),
                pitch: Cesium.Math.toRadians(Number(this.attributes.pitch ?? -45)),
                roll: Cesium.Math.toRadians(Number(this.attributes.roll ?? 0)),
            },
        });
    }

    private bindResize(): void {
        if (this.resizeHandler) {
            return;
        }

        const app = (global as {app?: any}).app;
        const resizeHandler = () => {
            this.viewer?.resize();
            this.viewer?.scene.requestRender();
        };

        this.resizeHandler = resizeHandler;
        app?.on?.(`resize.CesiumBehavior.${this.uuid}`, resizeHandler);
    }

    private unbindResize(): void {
        const app = (global as {app?: any}).app;
        if (!this.resizeHandler) {
            return;
        }

        app?.on?.(`resize.CesiumBehavior.${this.uuid}`, null);
        this.resizeHandler = null;
    }

    private disposeViewer(): void {
        this.unbindResize();
        CesiumTool.destroyViewer(this.viewer);
        this.viewer = null;

        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        const app = (global as {app?: any}).app;
        const scene = this.editor?.scene || app?.scene;
        if (scene) {
            scene.background = this.previousBackground;
        }
    }

    private syncCesiumSceneFlag(enabled: boolean): void {
        const app = (global as {app?: any}).app;
        const scene = this.editor?.scene || app?.scene;
        if (!scene) {
            return;
        }

        const previousValue = !!scene.userData?.cesium?.enabled;
        scene.userData = {
            ...scene.userData,
            cesium: {
                ...scene.userData?.cesium,
                enabled,
            },
        };

        if (previousValue !== enabled && typeof app?.recreateRenderer === "function") {
            void app.recreateRenderer();
        }
    }

    private getStringAttribute(key: string): string {
        const value = this.attributes[key];
        return typeof value === "string" ? value.trim() : "";
    }
}

export default CesiumBehavior;
