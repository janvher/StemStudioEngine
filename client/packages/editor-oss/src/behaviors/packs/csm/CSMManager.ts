import { DirectionalLight, Group, Mesh, Object3D, Vector3 } from "three";
import { CSMShadowNode } from "three/examples/jsm/csm/CSMShadowNode.js";

import CSMBehavior, { CSMParams } from "./CSMBehavior";
import global from "@stem/editor-oss/global";
import {getOrCreateDynamicRoot} from "@stem/editor-oss/scene/dynamicRoots";

const RESERVED_TEXTURE_SLOTS = 12;

// Temp variables for updateBefore — avoids per-frame allocations
const _savedPos = /*@__PURE__*/ new Vector3();
const _savedTargetPos = /*@__PURE__*/ new Vector3();

class ExtendedCSMShadowNode extends CSMShadowNode {
    private _disposed = false;

    _init(args: any) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error: _init exists at runtime but is not declared in the type definitions
        super._init(args);

        if (global.app && global.app.scene) {
            const parent: Object3D = getOrCreateDynamicRoot(global.app.scene);

            let csmRoot = parent.getObjectByName("CSM_Root") as Group;
            if (!csmRoot) {
                csmRoot = new Group();
                csmRoot.name = "CSM_Root";
                parent.add(csmRoot);
            }

            const lights = (this as any).lights as DirectionalLight[];
            if (lights) {
                for (const light of lights) {
                    csmRoot.add(light.target);
                    csmRoot.add(light);
                }
            }
        }
    }

    /**
     * Override updateBefore to:
     * 1. Use WORLD positions — correct for Unity-style lights and any parent transform
     * 2. Force matrixWorld update on cascade lights after positioning — upstream doesn't
     *    do this, causing stale matrixWorld when ShadowNode.renderShadow() reads it
     * @param builder
     */
    updateBefore(builder?: any): boolean | undefined {
        const light = this.light as DirectionalLight;
        if (!this.camera || !light?.parent) return undefined;

        // Upstream uses light.position / target.position (local coordinates) to derive
        // light direction and orientation. For Unity-style lights (direction from quaternion)
        // or lights under transformed parents, we need world positions.
        _savedPos.copy(light.position);
        _savedTargetPos.copy(light.target.position);

        light.getWorldPosition(light.position);
        light.target.getWorldPosition(light.target.position);

        super.updateBefore(builder);

        // Restore original local positions
        light.position.copy(_savedPos);
        light.target.position.copy(_savedTargetPos);

        // Force matrixWorld update on cascade lights — positions were set in super
        // but matrixWorld is stale (scene.updateMatrixWorld() ran before updateBefore)
        for (let i = 0; i < this.lights.length; i++) {
            const lwLight = this.lights[i] as any;
            lwLight.updateMatrixWorld(true);
            if (lwLight.target) lwLight.target.updateMatrixWorld(true);
        }

        return undefined;
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;

        const lights = (this as any).lights as DirectionalLight[];
        if (lights) {
            for (const light of lights) {
                if (light.parent) {
                    light.parent.remove(light.target);
                    light.parent.remove(light);
                }
            }
        }

        this.lights.length = 0;
        this.frustums.length = 0;

        super.dispose();
    }
}

/**
 * CSMManager: Ensures only one DirectionalLight in the scene has CSM enabled at a time.
 *
 * With the engine's dynamic shadowNode support, switching is simply:
 *   light.shadow.shadowNode = csmNode;   // enable CSM
 *   light.shadow.shadowNode = undefined;  // revert to default shadow
 *
 * The engine detects the change, cleans up the old shadow pipeline (without
 * disposing user-provided nodes), and rebuilds automatically on the next
 * setup() pass — which is triggered by invalidating materials.
 */
export class CSMManager {
    private static _instance: CSMManager;
    private currentBehavior: CSMBehavior | null = null;
    private currentLight: DirectionalLight | null = null;
    private currentParams: CSMParams | undefined;
    private csm: ExtendedCSMShadowNode | null = null;

    private constructor() {}

    static get instance(): CSMManager {
        if (!CSMManager._instance) {
            CSMManager._instance = new CSMManager();
        }
        return CSMManager._instance;
    }

    enableCSM(light: DirectionalLight, params?: CSMParams) {
        if (this.currentLight && this.currentLight !== light) {
            this.disableCSM();
        }

        if (this.currentLight !== light) {
            this.currentLight = light;
        }

        if (params) {
            this.currentParams = params;
        }

        if (this.csm && this.currentLight === light && params) {
            this.createInternalCSMNode();
        } else {
            this.updateCSMNodeState();
        }
    }

    private updateCSMNodeState() {
        if (!this.currentLight || !global.app || !global.app.camera) return;

        if (this.currentLight.castShadow) {
            if (!this.csm) {
                this.createInternalCSMNode();
            }
        } else {
            if (this.csm) {
                this.removeInternalCSMNode();
            }
        }
    }

    private createInternalCSMNode() {
        if (!this.currentLight) return;

        // Dispose old CSM instance if switching params
        if (this.csm) {
            this.csm.dispose();
            this.csm = null;
        }

        const params = this.currentParams;
        const light = this.currentLight;

        let cascades = params?.cascades ?? 3;
        const maxCascades = this.getMaxCascadesForRenderer();
        if (cascades > maxCascades) {
            cascades = maxCascades;
        }

        // maxFar = view-space forward distance from camera that CSM covers.
        // Non-CSM uses a light-aligned ortho box (±top), CSM uses a view-aligned
        // frustum clipped at maxFar.  The 1.2× factor compensates for the geometry
        // difference so CSM roughly matches non-CSM forward reach.
        // Must match what update() syncs each frame.
        const cam = light.shadow.camera;
        const maxFar = (Math.abs(cam.top) || 100) * 1.3;

        this.csm = new ExtendedCSMShadowNode(light, {
            cascades,
            maxFar,
            mode: params?.mode ?? 'practical',
            lightMargin: params?.lightMargin ?? 200,
            customSplitsCallback: params?.customSplitsCallback,
        } as any);

        // The engine detects this change and rebuilds the shadow pipeline
        light.shadow.shadowNode = this.csm;

        if (global.app) global.app.call(`objectChanged`, light, light);

        // Trigger pipeline rebuild so AnalyticLightNode.setup() picks up the new shadowNode
        this.invalidateSceneMaterials();
    }

    private removeInternalCSMNode() {
        const light = this.currentLight;
        if (!light) return;

        const csmToDispose = this.csm;

        if (csmToDispose) {
            csmToDispose.dispose();
            if (this.csm === csmToDispose) {
                this.csm = null;
            }
        }

        light.shadow.shadowNode = undefined;

        // Clean up CSM_Root
        if (global.app && global.app.scene) {
            const parent: Object3D = getOrCreateDynamicRoot(global.app.scene);

            const csmRoot = parent.getObjectByName("CSM_Root");
            if (csmRoot) {
                csmRoot.removeFromParent();
            }
        }

        if (global.app) global.app.call(`objectChanged`, light, light);

        // Trigger pipeline rebuild so AnalyticLightNode.setup() picks up the change
        this.invalidateSceneMaterials();
    }

    disableCSM() {
        if (this.currentLight) {
            this.removeInternalCSMNode();
        }

        this.currentBehavior = null;
        this.currentLight = null;
        this.currentParams = undefined;
    }

    getCurrentLight(): DirectionalLight | null {
        return this.currentLight;
    }

    isCSMEnabled(): boolean {
        return !!this.csm && !!this.currentLight;
    }

    update() {
        this.updateCSMNodeState();

        if (this.csm && this.currentLight) {
            if (this.csm.mainFrustum && global.app && global.app.camera && this.csm.camera !== global.app.camera) {
                this.csm.camera = global.app.camera;
            }

            const lights = this.csm.lights as DirectionalLight[];
            if (lights) {
                const mainShadow = this.currentLight.shadow;

                // maxFar = top * 1.2: matches non-CSM forward reach.
                // Must match createInternalCSMNode() logic.
                const desiredMaxFar = (Math.abs(mainShadow.camera.top) || 100) * 1.2;
                if (this.csm.maxFar !== desiredMaxFar) {
                    this.csm.maxFar = desiredMaxFar;
                }

                for (let i = 0; i < lights.length; i++) {
                    const cascadeLight = lights[i];
                    if (!cascadeLight) continue;
                    const shadow = cascadeLight.shadow;

                    if (shadow.mapSize.width !== mainShadow.mapSize.width || shadow.mapSize.height !== mainShadow.mapSize.height) {
                        shadow.mapSize.copy(mainShadow.mapSize);
                        shadow.map = null;
                        shadow.needsUpdate = true;
                    }

                    if (shadow.bias !== mainShadow.bias * (i + 1)) {
                        shadow.bias = mainShadow.bias * (i + 1);
                    }
                    if (shadow.normalBias !== mainShadow.normalBias * (i + 1)) {
                        shadow.normalBias = mainShadow.normalBias * (i + 1);
                    }
                    if (shadow.radius !== mainShadow.radius) {
                        shadow.radius = mainShadow.radius;
                    }
                    if (shadow.blurSamples !== mainShadow.blurSamples) {
                        shadow.blurSamples = mainShadow.blurSamples;
                    }
                }
            }

            if (this.csm.updateFrustums && this.csm.mainFrustum) {
                this.csm.updateFrustums();
            }
        }
    }

    updateCSMParams(params: CSMParams) {
        if (!this.currentLight) return;

        if (this.currentParams) {
            this.currentParams = { ...this.currentParams, ...params };
        } else {
            this.currentParams = params;
        }

        if (!this.csm) return;

        this.enableCSM(this.currentLight, this.currentParams);
    }

    private getMaxCascadesForRenderer(): number {
        const renderer = global.app?.renderer as any;
        if (!renderer) return 8;

        const backend = renderer.backend;
        if (backend?.isWebGPUBackend && backend.device) {
            const maxTextures = backend.device.limits.maxSampledTexturesPerShaderStage ?? 16;
            return Math.max(1, maxTextures - RESERVED_TEXTURE_SLOTS);
        }

        return 8;
    }

    private invalidateSceneMaterials() {
        if (!global.app || !global.app.scene) return;

        global.app.scene.traverse((object: Object3D) => {
            const mesh = object as Mesh;
            if (mesh.isMesh && mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.needsUpdate = true);
                } else {
                    mesh.material.needsUpdate = true;
                }
            }
        });
    }
}
