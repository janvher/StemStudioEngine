/*
 * ESLint overrides: this file is plain JS operating on dynamic scene graph/userData structures
 * that are intentionally loosely typed. Suppress TypeScript unsafe any member access warnings.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */

import {bloom} from "three/addons/tsl/display/BloomNode.js";
import {chromaticAberration} from "three/addons/tsl/display/ChromaticAberrationNode.js";
import {dof} from "three/addons/tsl/display/DepthOfFieldNode.js";
import {film} from "three/addons/tsl/display/FilmNode.js";
import {ao} from "three/addons/tsl/display/GTAONode.js";
import {lut3D} from "three/addons/tsl/display/Lut3DNode.js";
import {ssr} from "three/addons/tsl/display/SSRNode.js";
import {
    pass,
    mrt,
    emissive,
    metalness,
    normalView,
    roughness,
    uniform,
    time,
    oscSine,
    toneMapping,
    builtinAOContext,
    screenUV,
    perspectiveDepthToViewZ,
    orthographicDepthToViewZ,
    positionView,
    float,
    vec2,
    vec4,
    texture,
} from "three/tsl";
import {Color, RenderPipeline, NoToneMapping} from "three/webgpu";

import BaseRenderer from "./BaseRenderer";
import {POST_PROCESSING_DEFAULTS as PP_DEFAULTS} from "./postprocessing/defaults";
import {patchPassNode} from "./postprocessing/patchPassNode";
import {patchShadowNode} from "./postprocessing/patchShadowNode";
import {outline} from "./postprocessing/SharedDepthOutlineNode";
import {disposeSparkComposite, ensureSparkComposite} from "./SparkCompositeBridge";
// TODO(@stem/editor-oss migration): these subsystems still live in
// @web-shared. They will move into editor-oss in a follow-up sub-step; the
// @web-shared alias is allowed during the migration window.
import {QualityManager} from "@web-shared/core/quality/QualityManager";
import PackageManager from "../package/PackageManager";
import BatchManager from "@web-shared/utils/BatchManager";
import {isBatchManagerSupported} from "@web-shared/utils/BatchManagerSupport";
import SceneTraverser from "@web-shared/utils/SceneTraverser";

// Guard against Three.js ShadowNode accessing a null shadowMap during updateBefore.
patchShadowNode();

/**
 * Reapply a small view-space bias to OutlineNode's private prepare-mask material.
 * OutlineNode.setup() rebuilds this material before rendering, so the override must
 * be installed after each setup call.
 * @param {any} outlinePass
 */
function applyOutlineMaskBias(outlinePass) {
    const prepareMaskMaterial = outlinePass._prepareMaskMaterial;
    if (!prepareMaskMaterial) return;

    const prepareMask = () => {
        const depth = outlinePass._depthTextureUniform.sample(screenUV);

        const viewZNode = outlinePass.camera.isPerspectiveCamera
            ? perspectiveDepthToViewZ(depth, outlinePass._cameraNear, outlinePass._cameraFar)
            : orthographicDepthToViewZ(depth, outlinePass._cameraNear, outlinePass._cameraFar);

        const biasedPositionViewZ = positionView.z.add(float(0.01));
        const depthTest = biasedPositionViewZ.lessThanEqual(viewZNode).select(1, 0);

        return vec4(0.0, depthTest, 1.0, 1.0);
    };

    prepareMaskMaterial.fragmentNode = prepareMask();
    prepareMaskMaterial.needsUpdate = true;
}

/**
 * Supports: GTAO, bloom, SSR, DoF, outline
 */
class EffectRenderer extends BaseRenderer {
    constructor() {
        super();

        this.packageManager = new PackageManager();
        this.require = this.packageManager.require.bind(this.packageManager);

        this.ready = false;

        // Runtime bits
        this.scene = null;
        this.helperRoot = null;
        this.camera = null;
        this.renderer = null;
        this.rendererCSS = null;

        // Node-based post-processing
        this.renderPipeline = null;

        // Node handles so we can tweak at runtime
        this.nodes = {
            scenePass: null,
            sceneColor: null,
            sceneDepth: null,
            sceneNormal: null,
            sceneSSRMask: null,
            sceneRoughness: null,
            sceneEmissive: null,

            aoPass: null,

            bloomPass: null,

            ssrPass: null,

            dofPass: null,
            dofFocusDistance: null,
            dofFocalLength: null,
            dofBokehScale: null,

            outlinePass: null,
            outlinePulse: null,

            // LUT color grading — loadedLut is {texture, size, source}
            // set by setLUT(); lutIntensity is a TSL uniform updated by the
            // settings sync so intensity changes don't rebuild the pipeline.
            loadedLut: null,
            lutIntensity: uniform(1.0),

            // Film grain + chromatic aberration — pass-enable flags separate
            // from the uniform so intensity can animate (e.g. damage flash)
            // without rebuilding the pipeline.
            filmEnabled: false,
            filmIntensity: uniform(0.35),
            chromaticAberrationEnabled: false,
            chromaticAberrationStrength: uniform(0.005),

            // SSR (screen-space reflections) — `ssrEnabled` toggles the pass
            // and the pass instance state. The uniform-bearing fields
            // (opacity, etc.) live on the existing ssrPass instance once
            // constructed.
            ssrEnabled: false,
        };

        // Outline state
        this.selectedObjects = [];

        // Batching (preserved)
        this.batchManager = null;
        this.batchEnabled = isBatchManagerSupported();

        // Cached canvas CSS size (updated via ResizeObserver)
        this._canvasSize = { w: 0, h: 0 };
        this._resizeObserver = null;

        // Quality (pixelRatio, on/off)
        this.qualityManager = QualityManager.getInstance();
        this.qualityManager.on("qualityChanged", this.onQualityChanged);

        this.sceneTraverser = null;
        this.meshHandler = null;
        this.primitivesHandler = null;
        this.cssHandler = null;

        // Dimensions
        this.width = 0;
        this.height = 0;
        this.pixelRatio = 1;
        this.sparkComposite = null;
    }

    /**
     * Enable or disable batching.
     * @param enabled
     */
    setBatchingEnabled(enabled) {
        this.batchEnabled = enabled && isBatchManagerSupported();
        console.log("[EffectRenderer] Batching enabled:", this.batchEnabled);
    }

    /**
     * @param {Scene} scene
     * @param {Camera} camera
     * @param {WebGLRenderer} renderer
     * @param {*} rendererCSS - legacy external CSS3DRenderer or HTMLElement
     * @param {Object3D|null} helperRoot
     */
    create(scene, camera, renderer, rendererCSS, helperRoot = null) {
        // Core refs — set these first so _standardRender() works even without post-processing
        this.scene = scene;
        this.helperRoot = helperRoot;
        this.camera = camera;
        this.renderer = renderer;
        /** @type {any} */
        this.rendererCSS = rendererCSS; // Kept for backwards compatibility

        // Post-processing requires WebGPU; skip pipeline setup on WebGL fallback
        const isWebGPU = renderer && (renderer.isWebGPURenderer || renderer.constructor?.name === "WebGPURenderer");
        if (!isWebGPU) {
            console.warn("[EffectRenderer] WebGPU not available — post-processing disabled, using standard rendering.");
            this.ready = false;
            return;
        }

        // Initialize cached canvas size synchronously before the first render
        const canvas = this.renderer && this.renderer.domElement ? this.renderer.domElement : renderer?.domElement;
        this.sparkComposite = ensureSparkComposite(scene, renderer, helperRoot || scene);
        try {
            const splatSettings = this.scene?.userData?.rendering?.splat || {};
            if (typeof this.sparkComposite?.setSparkOptions === "function") {
                this.sparkComposite.setSparkOptions({
                    maxStdDev: Number.isFinite(splatSettings.maxStdDev) ? splatSettings.maxStdDev : Math.sqrt(8),
                    minPixelRadius: Number.isFinite(splatSettings.minPixelRadius) ? splatSettings.minPixelRadius : 2,
                    maxPixelRadius: Number.isFinite(splatSettings.maxPixelRadius) ? splatSettings.maxPixelRadius : 512,
                    sortRadial: typeof splatSettings.sortRadial === "boolean" ? splatSettings.sortRadial : true,
                    minSortIntervalMs: Number.isFinite(splatSettings.minSortIntervalMs) ? splatSettings.minSortIntervalMs : 0,
                    enableLod: typeof splatSettings.enableLod === "boolean" ? splatSettings.enableLod : true,
                    enableDriveLod: typeof splatSettings.enableLod === "boolean" ? splatSettings.enableLod : true,
                });
                if (splatSettings.sparkOptions && typeof splatSettings.sparkOptions === "object") {
                    this.sparkComposite.setSparkOptions(splatSettings.sparkOptions);
                }
            } else if (this.sparkComposite?.spark) {
                this.sparkComposite.spark.maxStdDev = Number.isFinite(splatSettings.maxStdDev) ? splatSettings.maxStdDev : Math.sqrt(8);
                this.sparkComposite.spark.minPixelRadius = Number.isFinite(splatSettings.minPixelRadius) ? splatSettings.minPixelRadius : 2;
                this.sparkComposite.spark.maxPixelRadius = Number.isFinite(splatSettings.maxPixelRadius) ? splatSettings.maxPixelRadius : 512;
                this.sparkComposite.spark.sortRadial = typeof splatSettings.sortRadial === "boolean" ? splatSettings.sortRadial : true;
                this.sparkComposite.spark.minSortIntervalMs = Number.isFinite(splatSettings.minSortIntervalMs) ? splatSettings.minSortIntervalMs : 0;
                this.sparkComposite.spark.enableLod = typeof splatSettings.enableLod === "boolean" ? splatSettings.enableLod : true;
                this.sparkComposite.spark.enableDriveLod = this.sparkComposite.spark.enableLod;
                this.sparkComposite.spark.dirty = true;
            }

            const pixelRatioFactor = Number.isFinite(splatSettings.pixelRatioFactor)
                ? Math.min(1, Math.max(0.5, splatSettings.pixelRatioFactor))
                : 0.75;

            if (typeof this.sparkComposite?.setPixelRatioFactor === "function") {
                this.sparkComposite.setPixelRatioFactor(pixelRatioFactor);
            }
        } catch {
            // ignore
        }
        if (canvas) {
            const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
            const initialWidth = rect && rect.width ? rect.width : (canvas.clientWidth || canvas.width || 0);
            const initialHeight = rect && rect.height ? rect.height : (canvas.clientHeight || canvas.height || 0);

            if (!this._canvasSize) {
                this._canvasSize = {w: 0, h: 0};
            }
            this._canvasSize.w = Math.floor(initialWidth);
            this._canvasSize.h = Math.floor(initialHeight);
        }

        // Observe canvas CSS size changes instead of polling clientWidth/clientHeight each frame
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        this._resizeObserver = new ResizeObserver(([entry]) => {
            if (!entry || !entry.contentRect) {
                return;
            }
            const { width, height } = entry.contentRect;
            if (!this._canvasSize) {
                this._canvasSize = {w: 0, h: 0};
            }
            this._canvasSize.w = Math.floor(width);
            this._canvasSize.h = Math.floor(height);
        });
        if (canvas) {
            this._resizeObserver.observe(canvas);
        }

        // Honor scene flag for batching (default true)
        try {
            const enableDynamic = !(this.scene?.userData?.rendering?.batching?.enableDynamic === false);
            this.setBatchingEnabled(!!enableDynamic);
        } catch {
            // ignore
        }

        // Initialize BatchManager if requested
        if (this.batchEnabled && this.scene && (!this.batchManager || this.batchManager.scene !== this.scene)) {
            this.initializeBatchManager(this.scene);
        }

        // Initialize SceneTraverser for the main scene
        try {
            const mainScene = this.scene;
            this.sceneTraverser = new SceneTraverser(mainScene);

            // Skip batch root during traversal
            if (this.batchManager && this.batchManager.getBatchRoot()) {
                this.sceneTraverser.addSkipRoot(this.batchManager.getBatchRoot());
            }

            // Mesh handler — collects all visible meshes for BatchManager
            this.meshHandler = {
                test: (obj) => !!obj.isMesh,
                results: [],
            };
            this.sceneTraverser.addHandler(this.meshHandler);

            // Primitives handler — collects Lines and Points for SSAOPass
            this.primitivesHandler = {
                test: (obj) => obj.isLine === true || obj.isPoints === true,
                results: [],
            };
            this.sceneTraverser.addHandler(this.primitivesHandler);

            // CSS3D handler — collects CSS3DObject nodes for CSS renderer
            this.cssHandler = {
                test: (obj) => obj.isCSS3DObject === true,
                results: [],
            };
            this.sceneTraverser.addHandler(this.cssHandler);
        } catch (e) {
            console.warn("EffectRenderer: failed to initialize SceneTraverser", e);
        }

        // Build node post-processing pipeline
        this._createNodePipeline();

        this.ready = true;
    }

    /**
     * Initialize internal BatchManager
     * @param scene
     */
    initializeBatchManager(scene) {
        if (this.batchManager) this.batchManager.dispose();
        this.batchManager = new BatchManager(scene);
        this.batchManager.isWebGPU = this.renderer.isWebGPURenderer && this.renderer.backend.isWebGPUBackend;
        console.log("[EffectRenderer] Internal BatchManager initialized");
        // const batchedCount = this.batchManager.batchSceneMeshes();
        // console.log(`[EffectRenderer] Automatically batched ${batchedCount} existing meshes`);
    }

    /**
     * Build the node-based pipeline for AO (GTAO), Bloom, Outline
     */
    _createNodePipeline() {
        if (this.nodes?.ssrPass && typeof this.nodes.ssrPass.dispose === "function") {
            try {
                this.nodes.ssrPass.dispose();
            } catch {
                // ignore
            }
        }

        // Dispose previous post-processing resources (render targets, textures)
        if (this.renderPipeline && typeof this.renderPipeline.dispose === "function") {
            try {
                this.renderPipeline.dispose();
            } catch {
                // ignore
            }
        }

        try {
            if (
                this.nodes &&
                this.nodes.scenePass &&
                this.nodes.scenePass.renderTarget &&
                typeof this.nodes.scenePass.renderTarget.dispose === "function"
            ) {
                try {
                    this.nodes.scenePass.renderTarget.dispose();
                } catch {
                    // ignore
                }
            }
        } catch {
            // ignore
        }

        // Clear previous PostProcessing reference so new pipeline can be created cleanly
        this.renderPipeline = null;

        const scene = this.scene;
        const camera = this.camera;

        // When multiple scenes are provided, create a Pass for each and reuse
        // the primary pass' renderTarget to avoid extra GPU allocations.
        // Combine (add) color outputs from all scenes into a single color node.
        const postProcessing = scene && scene.userData && scene.userData.postProcessing || {};
        // Merge defaults with scene overrides; deep-merge for ao/bloom/outline so missing values use defaults
        const mergedPP = {
            ...PP_DEFAULTS,
            ...postProcessing,
            ao: {
                ...PP_DEFAULTS.ao,
                ...postProcessing.ao ?? postProcessing.ssao ?? {},
            },
            bloom: {
                ...PP_DEFAULTS.bloom,
                ...postProcessing.bloom ?? {},
            },
            ssr: {
                ...PP_DEFAULTS.ssr,
                ...postProcessing.ssr ?? {},
            },
            outline: {
                ...PP_DEFAULTS.outline,
                ...postProcessing.outline ?? {},
            },
            dof: {
                ...PP_DEFAULTS.dof,
                ...postProcessing.dof ?? {},
            },
            lut: {
                ...PP_DEFAULTS.lut,
                ...postProcessing.lut ?? {},
            },
            film: {
                ...PP_DEFAULTS.film,
                ...postProcessing.film ?? {},
            },
            chromaticAberration: {
                ...PP_DEFAULTS.chromaticAberration,
                ...postProcessing.chromaticAberration ?? {},
            },
        };

        // Seed the enable flags + uniforms from scene-persisted settings so
        // a freshly-loaded scene renders with the saved post config.
        this.nodes.filmEnabled = mergedPP.film.enabled;
        this.nodes.filmIntensity.value = mergedPP.film.intensity;
        this.nodes.chromaticAberrationEnabled = mergedPP.chromaticAberration.enabled;
        this.nodes.chromaticAberrationStrength.value = mergedPP.chromaticAberration.strength;
        this.nodes.ssrEnabled = mergedPP.ssr.enabled;
        this.nodes.lutIntensity.value = mergedPP.lut.intensity;
        // Asynchronously load the LUT texture if a source is set and we
        // don't already have it cached for this URL. The pipeline will
        // pick up the loaded texture on its next rebuild.
        if (mergedPP.lut.enabled && (mergedPP.lut.assetId || mergedPP.lut.source)) {
            this._ensureLutLoaded({
                assetId: mergedPP.lut.assetId || "",
                source: mergedPP.lut.source || "",
            });
        } else if (!mergedPP.lut.enabled) {
            this.nodes.loadedLut = null;
        }
        // FIXME: implement emissive handling if PP settings require it
        const includeEmissive = !true;

        // Pre-pass for AO (opaque only, main scene)
        const prePass = pass(scene, camera);
        patchPassNode(prePass, false, true, true, true, false, {
            shouldHideObject: object => object.isLine === true || object.isPoints === true || object.isSprite === true,
        });

        const mrtDesc = {
            output: vec4(0, 0, 0, 0),
            normal: normalView, // view-space normals
            // Feed SSR a scalar reflectance mask instead of pure metalness.
            // Metals stay near 1.0 while dielectrics get a small smoothness-weighted
            // base reflectance so polished non-metals can contribute to SSR too.
            ssrMask: metalness.oneMinus().mul(roughness.oneMinus().mul(float(0.04))).add(metalness),
            roughness,
        };
        if (includeEmissive) mrtDesc.emissive = emissive;
        prePass.setMRT(mrt(mrtDesc));

        const primaryPass = pass(scene, camera);
        patchPassNode(primaryPass, true, true, false, true);

        const firstSceneColor = primaryPass.getTextureNode("output");

        // Use firstSceneColor for post-processing effects
        let sceneColor = firstSceneColor;

        // Use depth/normal/emissive from the prePass for AO/bloom/outline
        const sceneDepth = prePass.getTextureNode("depth");
        const sceneNormal = prePass.getTextureNode("normal");
        const sceneSSRMask = prePass.getTextureNode("ssrMask");
        const sceneRoughness = prePass.getTextureNode("roughness");
        // If emissive was disabled in postProcessing, primaryPass may not expose an emissive texture
        let sceneEmissive = null;
        try {
            if (includeEmissive) sceneEmissive = prePass.getTextureNode("emissive");
        } catch {
            sceneEmissive = null;
        }

        this.nodes.sceneRoughness = sceneRoughness;

        // --- AO --------------------------------------------------------
        // Prefer `postProcessing.ao`, fall back to older `ssao` key only for compatibility
        const aoCfg = mergedPP.ao;
        let aoPass = null;

        if (aoCfg.enabled) {
            aoPass = ao(sceneDepth, sceneNormal, camera);

            // Map old parameters when present
            // Original (WebGL AO) had: kernelRadius, minDistance, maxDistance.
            // GTAO Node expects: distanceExponent, distanceFallOff, radius, scale, thickness.
            // We'll do a light mapping—fallbacks chosen to be sensible:
            aoPass.distanceExponent.value = aoCfg.distanceExponent;
            aoPass.distanceFallOff.value = aoCfg.distanceFallOff;
            // Use kernelRadius as the canonical radius parameter (map legacy radius if present elsewhere)
            aoPass.radius.value = aoCfg.kernelRadius;
            aoPass.scale.value = aoCfg.scale;
            aoPass.thickness.value = aoCfg.thickness;

            // Run AO at half res if requested
            aoPass.resolutionScale = aoCfg.resolutionScale;

            try {
                if (aoPass.samples) {
                    if (typeof aoCfg.samples === "number") {
                        aoPass.samples.value = Math.max(1, Math.round(aoCfg.samples));
                    }
                }
            } catch {
                // ignore
            }

            const aoOutputNode = aoPass.getTextureNode();
            primaryPass.contextNode = builtinAOContext(aoOutputNode.sample(screenUV).r);

            // colorAfterAO = vec4(sceneColor.rgb.mul(aoPass.r), sceneColor.a);
        }

        // --- SSR --------------------------------------------------------
        const ssrCfg = mergedPP.ssr;
        let ssrPass = null;

        if (ssrCfg.enabled) {
            const roughnessNode = ssrCfg.blur === false ? null : sceneRoughness.sample(screenUV).r;

            ssrPass = ssr(
                sceneColor,
                sceneDepth,
                sceneNormal,
                sceneSSRMask.sample(screenUV).r,
                roughnessNode,
                camera,
            );
        }

        // --- Bloom --------------------------------------------------------------
        const bloomCfg = mergedPP.bloom;
        let bloomPass = null;

        if (bloomCfg.enabled) {
            const strength = bloomCfg.strength;
            const radius = bloomCfg.radius;

            // WebGPU example blooms emissive; this avoids thresholding the beauty
            // const bloomInput = sceneEmissive; // or use sceneColor for "full" bloom
            const bloomInput = sceneColor;
            bloomPass = bloom(bloomInput, strength, radius);

            // If the bloom node exposes a threshold or similar uniform, apply it.
            try {
                if (bloomPass.threshold && typeof bloomPass.threshold === "object") {
                    bloomPass.threshold.value = bloomCfg.threshold;
                } else if ("threshold" in bloomPass) {
                    bloomPass.threshold = bloomCfg.threshold;
                }
            } catch {
                // Non-critical if bloom node doesn't expose threshold.
            }

            try {
                if (bloomPass.strength && typeof bloomPass.strength === "object") bloomPass.strength.value = strength;
                if (bloomPass.radius && typeof bloomPass.radius === "object") bloomPass.radius.value = radius;
            } catch { /* empty */ }

        }

        const dofInput = bloomPass
            ? (ssrPass ? sceneColor.add(ssrPass.getTextureNode()) : sceneColor).add(bloomPass)
            : (ssrPass ? sceneColor.add(ssrPass.getTextureNode()) : sceneColor);

        // --- DoF --------------------------------------------------------------
        const dofCfg = mergedPP.dof;
        const dofFocusDistance = uniform(dofCfg.focusDistance);
        const dofFocalLength = uniform(dofCfg.focalLength);
        const dofBokehScale = uniform(dofCfg.bokehScale);

        let dofPass = null;
        if (dofCfg.enabled) {
            const depth = sceneDepth.sample(screenUV);
            const viewZNode = camera.isPerspectiveCamera
                ? perspectiveDepthToViewZ(depth, camera.near, camera.far)
                : orthographicDepthToViewZ(depth, camera.near, camera.far);

            dofPass = dof(dofInput, viewZNode, dofFocusDistance, dofFocalLength, dofBokehScale);
        }

        // --- Outline ------------------------------------------------------------
        const outlineCfg = mergedPP.outline;
        let outlinePass = null;
        let outlinePulse = null;

        // Uniform controls to mirror your old API
        const edgeStrength = uniform(outlineCfg.edgeStrength);
        const edgeGlow = uniform(outlineCfg.edgeGlow);
        const edgeThickness = uniform(outlineCfg.edgeThickness);
        const pulsePeriod = uniform(outlineCfg.pulsePeriod);
        const visibleEdgeCol = uniform(new Color(outlineCfg.visibleEdgeColor));
        const hiddenEdgeCol = uniform(new Color(outlineCfg.hiddenEdgeColor));

        if (outlineCfg.enabled) {
            outlinePass = outline(scene, camera, {
                selectedObjects: this.selectedObjects,
                edgeGlow,
                edgeThickness,
                depthNode: sceneDepth,
                depthTexture: prePass.renderTarget?.depthTexture ?? null,
            });

            const originalOutlineUpdateBefore = outlinePass.updateBefore.bind(outlinePass);
            outlinePass.updateBefore = frame => {
                const helperRoot = this.helperRoot;
                const previousHelperVisibility = helperRoot ? helperRoot.visible : undefined;

                if (helperRoot) {
                    helperRoot.visible = false;
                }

                try {
                    return originalOutlineUpdateBefore(frame);
                } finally {
                    if (helperRoot && previousHelperVisibility !== undefined) {
                        helperRoot.visible = previousHelperVisibility;
                    }
                }
            };

            const originalOutlineSetup = outlinePass.setup.bind(outlinePass);
            outlinePass.setup = (...args) => {
                const result = originalOutlineSetup(...args);
                applyOutlineMaskBias(outlinePass);
                return result;
            };

            applyOutlineMaskBias(outlinePass);

            // Recreate the demo's pulsing/strength/color mix
            const {visibleEdge, hiddenEdge} = outlinePass;
            const period = time.div(pulsePeriod).mul(2.0);
            const osc = oscSine(period).mul(0.5).add(0.5); // [0.5, 1.0]

            const outlineColor = visibleEdge.mul(visibleEdgeCol).add(hiddenEdge.mul(hiddenEdgeCol)).mul(edgeStrength);
            outlinePulse = pulsePeriod.greaterThan(0).select(outlineColor.mul(osc), outlineColor);
        }

        // Bind nodes for later updates
        this.nodes.scenePass = primaryPass;
        this.nodes.sceneColor = firstSceneColor;
        this.nodes.sceneDepth = sceneDepth;
        this.nodes.sceneNormal = sceneNormal;
        this.nodes.sceneSSRMask = sceneSSRMask;
        this.nodes.sceneRoughness = sceneRoughness;
        this.nodes.sceneEmissive = sceneEmissive;

        this.nodes.aoPass = aoPass;

        this.nodes.bloomPass = bloomPass;

        this.nodes.ssrPass = ssrPass;

        this.nodes.dofPass = dofPass;
        this.nodes.dofFocusDistance = dofFocusDistance;
        this.nodes.dofFocalLength = dofFocalLength;
        this.nodes.dofBokehScale = dofBokehScale;

        this.nodes.outlinePass = outlinePass;
        this.nodes.outlinePulse = outlinePulse;

        this.nodes.otherScenesColor = null;

        // Apply any runtime postProcessing values from scene.userData now that
        // nodes are bound so CameraPanel changes can be reflected without a
        // full pipeline rebuild. Other systems may call updatePostProcessingFromScene().
        this.updatePostProcessingFromScene(mergedPP);

        // Setup RenderPipeline and choose the output chain
        this.renderPipeline = new RenderPipeline(this.renderer);
        this.renderPipeline._quadMesh.name = "EffectRendererPostProcessing";

        // this.renderPipeline.outputColorTransform = false;
        this.updatePipelineOutput();
    }

    updatePipelineOutput() {
        if (!this.renderPipeline || !this.nodes.sceneColor) return;

        this._lastToneMapping = this.renderer.toneMapping;
        this._lastToneMappingExposure = this.renderer.toneMappingExposure;

        const postEnabled = this._postEnabledFromQuality();

        let finalOutput;
        let qualityAO = true;
        let qualityBloom = true;
        let qualitySSR = true;

        try {
            const r = this.qualityManager.getCurrentSettings()?.rendering;
            if (r?.ssao === false || r?.ambientOcclusion === false) qualityAO = false;
            if (r?.bloom === false) qualityBloom = false;
            // SSR gated by the quality system's `reflections` flag
            // (already in QualityPresets for all 7 tiers — low/minimal/iOS
            // have it off by default) and DeviceCapabilityDetector can
            // force it off on weak GPUs.
            if (r?.reflections === false) qualitySSR = false;
        } catch { /* use defaults */ }

        if (this.nodes.scenePass) {
            this.nodes.scenePass.contextNode = postEnabled && qualityAO && this.nodes.aoPass
                ? builtinAOContext(this.nodes.aoPass.getTextureNode().sample(screenUV).r)
                : null;
        }

        if (postEnabled) {
            let colorAfterAO = this.nodes.sceneColor;
            let colorAfterSSR = this.nodes.ssrPass && qualitySSR
                ? colorAfterAO.add(this.nodes.ssrPass.getTextureNode())
                : colorAfterAO;
            let colorAfterBloom = this.nodes.bloomPass && qualityBloom ? colorAfterSSR.add(this.nodes.bloomPass) : colorAfterSSR;
            let colorAfterDof = this.nodes.dofPass ? this.nodes.dofPass : colorAfterBloom;
            finalOutput = colorAfterDof;
            if (this.nodes.outlinePulse && this.selectedObjects.length > 0) {
                finalOutput = this.nodes.outlinePulse.add(colorAfterDof);
            }

            if (this.nodes.otherScenesColor) finalOutput = finalOutput.add(this.nodes.otherScenesColor);
        } else {
            finalOutput = this.nodes.sceneColor;
            if (this.nodes.otherScenesColor) finalOutput = finalOutput.add(this.nodes.otherScenesColor);
        }

        // LUT color grading — applied after all in-scene post-processing but
        // BEFORE tone mapping, so grading operates on linear color values
        // (the authoring convention for .cube LUTs).
        if (this.nodes.loadedLut) {
            finalOutput = lut3D(
                finalOutput,
                texture(this.nodes.loadedLut.texture),
                this.nodes.loadedLut.size,
                this.nodes.lutIntensity,
            );
        }

        // Chromatic aberration — lens-style RGB channel offset applied to
        // the already-composed chain so it doesn't discard SSR, bloom, DoF,
        // or LUT contributions. The Three helper internally converts node
        // inputs to a texture source for sampling.
        if (this.nodes.chromaticAberrationEnabled) {
            const center = vec2(0.5, 0.5);
            finalOutput = chromaticAberration(
                finalOutput,
                this.nodes.chromaticAberrationStrength,
                center,
                float(1.0),
            );
        }

        // Film grain — grain overlay applied after color grading, before
        // tone mapping. `film()` takes (inputNode, intensity) and returns
        // a graded vec4.
        if (this.nodes.filmEnabled) {
            finalOutput = film(finalOutput, this.nodes.filmIntensity);
        }

        // Apply tone mapping at the end of the chain
        if (this.renderer.toneMapping !== NoToneMapping) {
            finalOutput = toneMapping(
                this.renderer.toneMapping,
                uniform(this.renderer.toneMappingExposure),
                finalOutput,
            );
        }

        this.renderPipeline.outputNode = finalOutput;
        this.renderPipeline.needsUpdate = true;
    }

    /**
     * Install a LUT for color grading. Pass `null` to disable.
     * `loaded` is the shape returned by `utils/LUTLoader.ts#loadLUT`.
     * Triggers a pipeline rebuild — call this rarely (on LUT-change events,
     * not per-frame).
     */
    setLUT(loaded) {
        this.nodes.loadedLut = loaded;
        this.updatePipelineOutput?.();
    }

    /**
     * Update LUT blend intensity 0..1 without rebuilding the pipeline.
     * Safe to call at animation frequency.
     */
    setLUTIntensity(value) {
        this.nodes.lutIntensity.value = Math.max(0, Math.min(1, value));
    }

    /**
     * Film-grain pass. `enabled=false` removes the pass from the chain
     * (rebuilds pipeline). `intensity` is a live uniform — safe to
     * animate per-frame for effects like damage flash or cinematic
     * intros.
     */
    setFilmGrain(enabled, intensity = 0.35) {
        const wantsRebuild = this.nodes.filmEnabled !== enabled;
        this.nodes.filmEnabled = enabled;
        this.nodes.filmIntensity.value = intensity;
        if (wantsRebuild) this.updatePipelineOutput?.();
    }

    /**
     * Chromatic aberration pass. Same contract as setFilmGrain —
     * `strength` is a live uniform.
     */
    setChromaticAberration(enabled, strength = 0.005) {
        const wantsRebuild = this.nodes.chromaticAberrationEnabled !== enabled;
        this.nodes.chromaticAberrationEnabled = enabled;
        this.nodes.chromaticAberrationStrength.value = strength;
        if (wantsRebuild) this.updatePipelineOutput?.();
    }

    /**
     * Trigger a time-limited flash of one of the live-uniform post-FX
     * passes. Used for gameplay feedback — damage hit, warp/teleport,
     * ability activation, etc.
     *
     *   passName: one of "film", "chromaticAberration", "lut"
     *   durationSec: total length of the flash including attack + decay
     *   peakIntensity: maximum uniform value reached mid-flash
     *
     * The pass must already be ENABLED in the scene's post-processing
     * settings for the flash to be visible. Flashing a disabled pass is
     * a safe no-op — we don't force-enable because rebuilding the
     * pipeline at a gameplay moment would be visually disruptive.
     *
     * Envelope: linear ease-in to peak over the first 20% of duration,
     * 10% hold at peak, ease-out over the remaining 70%. Lands back on
     * whatever baseline was set before the flash — so the user's "always
     * on" film grain (say, 0.15) returns to 0.15 after a 0.6 flash peak.
     *
     * Overlapping flashes on the same pass replace the previous one
     * (don't stack) — simpler model and matches what damage-indicator
     * VFX usually want.
     */
    flashPass(passName, durationSec, peakIntensity) {
        const uniformMap = {
            film: this.nodes.filmIntensity,
            chromaticAberration: this.nodes.chromaticAberrationStrength,
            lut: this.nodes.lutIntensity,
        };
        const uniform = uniformMap[passName];
        if (!uniform) {
            console.warn(`EffectRenderer.flashPass: unknown passName "${passName}" (expected: film, chromaticAberration, lut)`);
            return;
        }
        if (typeof durationSec !== "number" || durationSec <= 0) return;

        const baseline = uniform.value;
        const peak = typeof peakIntensity === "number" ? peakIntensity : 1.0;

        if (!this._flashTimers) this._flashTimers = {};
        // Cancel any in-flight flash on this pass to avoid mid-flash
        // uniform fights.
        const existing = this._flashTimers[passName];
        if (existing) {
            cancelAnimationFrame(existing.rafId);
            // Restore whatever baseline the earlier flash captured —
            // otherwise consecutive flashes could drift if they
            // captured mid-flash values as the "baseline".
            uniform.value = existing.baseline;
        }

        const startTime = performance.now();
        const capturedBaseline = uniform.value;
        const state = {baseline: capturedBaseline, rafId: 0};

        const tick = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed >= durationSec) {
                uniform.value = capturedBaseline;
                delete this._flashTimers[passName];
                return;
            }
            const t = elapsed / durationSec;
            let factor;
            if (t < 0.2) factor = t / 0.2;       // attack
            else if (t < 0.3) factor = 1;        // hold
            else factor = 1 - (t - 0.3) / 0.7;   // decay
            uniform.value = capturedBaseline + (peak - capturedBaseline) * factor;
            state.rafId = requestAnimationFrame(tick);
        };

        state.rafId = requestAnimationFrame(tick);
        this._flashTimers[passName] = state;
    }

    /**
     * Screen-space reflections. Toggling requires a FULL pipeline rebuild
      * for the current implementation. Calling this with `enabled=false`
      * drops the SSR pass on the next pipeline build.
     *
     * Settings beyond enabled are currently applied to the ssrPass
     * instance if it exposes matching uniforms; otherwise ignored. The
     * API is intentionally narrow for v1 — scene-UI + quality-tier
     * integration is a follow-up.
     */
    setSSR(enabled, settings = {}) {
        const wantsRebuild = this.nodes.ssrEnabled !== enabled;
        this.nodes.ssrEnabled = enabled;
        // Drop the cached pass so the next pipeline rebuild re-constructs
        // it with the correct input nodes (or skips it when disabled).
        this.nodes.ssrPass = null;
        if (wantsRebuild) {
            // SSR toggling uses a full pipeline rebuild so the pass graph is
            // reconstructed cleanly. setupPipeline() is the canonical
            // entry; if it's not wired at construction time we fall back
            // to updatePipelineOutput which at least rebuilds the output
            // side.
            if (typeof this.setupPipeline === "function" && this.renderer && this.scene) {
                this.setupPipeline(this.scene, this.camera);
            } else {
                this.updatePipelineOutput?.();
            }
        }
        // Apply per-pass settings best-effort. SSRNode may or may not
        // expose these as public uniforms in the current addons version.
        const ssrPass = this.nodes.ssrPass;
        if (ssrPass) {
            if (typeof settings.maxDistance === "number" && ssrPass.maxDistance) {
                ssrPass.maxDistance.value = settings.maxDistance;
            }
            if (typeof settings.thickness === "number" && ssrPass.thickness) {
                ssrPass.thickness.value = settings.thickness;
            }
            if (typeof settings.opacity === "number" && ssrPass.opacity) {
                ssrPass.opacity.value = settings.opacity;
            }
        }
    }

    onQualityChanged = () => {
        if (this.scene?.userData?.postProcessing) {
            this.updatePostProcessingFromScene(this.scene.userData.postProcessing);
        }
        this.updatePipelineOutput();
    };

    /**
     * Apply postProcessing settings (from scene.userData.postProcessing) to
     * active nodes so UI changes from CameraPanel take effect without
     * re-creating the entire node pipeline.
     * @param {object} postProcessing
     */
    updatePostProcessingFromScene(postProcessing) {
        if (!postProcessing) return;

        // AO mapping + dynamic creation/removal
        try {
            // Prefer `postProcessing.ao`, fallback to old key `ssao` for compatibility
            const aoCfg = postProcessing.ao ?? postProcessing.ssao ?? {};
            const aoEnabled = aoCfg.enabled ?? true;

            // If the requested AO enabled state doesn't match the current node
            // presence, rebuild the pipeline to guarantee removal/addition of nodes
            const currentAoPresent = !!this.nodes.aoPass;
            if (aoEnabled !== currentAoPresent) {
                if (!this._rebuildingPipeline) {
                    this._rebuildingPipeline = true;
                    // Recreate the full node pipeline to ensure nodes are wired correctly
                    try {
                        this._createNodePipeline();
                    } catch (e) {
                        console.warn("EffectRenderer: failed to recreate node pipeline", e);
                    } finally {
                        this._rebuildingPipeline = false;
                    }

                }
                // Pipeline will be rebuilt which will call updatePostProcessingFromScene again.
                // Skip the rest of this function for now.
                return;
            }

            // Apply parameter mapping if AO node exists
            const aoPass = this.nodes.aoPass;
            if (aoPass) {
                if (typeof aoCfg.distanceExponent === "number" && aoPass.distanceExponent)
                    aoPass.distanceExponent.value = aoCfg.distanceExponent;
                if (typeof aoCfg.distanceFallOff === "number" && aoPass.distanceFallOff)
                    aoPass.distanceFallOff.value = aoCfg.distanceFallOff;
                // Only accept kernelRadius; legacy min/max mapping handled below
                if (typeof aoCfg.kernelRadius === "number" && aoPass.radius) aoPass.radius.value = aoCfg.kernelRadius;
                if (typeof aoCfg.scale === "number" && aoPass.scale) aoPass.scale.value = aoCfg.scale;
                if (typeof aoCfg.thickness === "number" && aoPass.thickness) aoPass.thickness.value = aoCfg.thickness;
                if (typeof aoCfg.resolutionScale === "number") aoPass.resolutionScale = aoCfg.resolutionScale;
                if (typeof aoCfg.samples === "number" && aoPass.samples)
                    aoPass.samples.value = Math.max(1, Math.round(aoCfg.samples));

                // Map legacy min/max distance into GTAO params
                const minD = typeof aoCfg.minDistance === "number" ? aoCfg.minDistance : null;
                const maxD = typeof aoCfg.maxDistance === "number" ? aoCfg.maxDistance : null;
                if (minD !== null || maxD !== null) {
                    const mapping = this._mapMinMaxToGTAO(minD, maxD);
                    if (mapping.distanceExponent !== null && aoPass.distanceExponent)
                        aoPass.distanceExponent.value = mapping.distanceExponent;
                    if (mapping.distanceFallOff !== null && aoPass.distanceFallOff)
                        aoPass.distanceFallOff.value = mapping.distanceFallOff;
                }
            }
        } catch (e) {
            void e; // non-fatal
        }

        // SSR mapping + dynamic create/remove
        try {
            const ssrCfg = {
                ...PP_DEFAULTS.ssr,
                ...postProcessing.ssr || {},
            };
            const ssrEnabled = ssrCfg.enabled ?? false;

            const currentSSRPresent = !!this.nodes.ssrPass;
            const currentSSRBlur = !!this.nodes.ssrPass?.roughnessNode;
            const blurChanged = currentSSRPresent && currentSSRBlur !== (ssrCfg.blur !== false);

            if (ssrEnabled !== currentSSRPresent || blurChanged) {
                if (!this._rebuildingPipeline) {
                    this._rebuildingPipeline = true;
                    try {
                        this._createNodePipeline();
                    } catch (e) {
                        console.warn("EffectRenderer: failed to recreate node pipeline", e);
                    } finally {
                        this._rebuildingPipeline = false;
                    }
                }
                return;
            }

            const ssrPass = this.nodes.ssrPass;
            if (ssrPass) {
                const qualityProfile = this._getSSRQualityProfile();

                if (typeof ssrCfg.maxDistance === "number" && ssrPass.maxDistance) {
                    ssrPass.maxDistance.value = ssrCfg.maxDistance;
                }
                if (typeof ssrCfg.thickness === "number" && ssrPass.thickness) {
                    ssrPass.thickness.value = ssrCfg.thickness;
                }
                if (typeof ssrCfg.opacity === "number" && ssrPass.opacity) {
                    ssrPass.opacity.value = ssrCfg.opacity;
                }
                if (typeof ssrCfg.quality === "number" && ssrPass.quality) {
                    ssrPass.quality.value = Math.min(Math.max(ssrCfg.quality, 0), qualityProfile.maxQuality);
                }
                if (typeof ssrCfg.resolutionScale === "number") {
                    ssrPass.resolutionScale = Math.min(
                        Math.max(ssrCfg.resolutionScale, 0.1),
                        qualityProfile.maxResolutionScale,
                    );
                }
                if (typeof ssrCfg.blurQuality === "number" && ssrPass.blurQuality) {
                    ssrPass.blurQuality.value = Math.min(
                        Math.max(Math.round(ssrCfg.blurQuality), 1),
                        qualityProfile.maxBlurQuality,
                    );
                }
            }
        } catch {
            // ignore
        }

        // Bloom mapping + dynamic create/remove
        try {
            const bloomCfg = postProcessing.bloom || {};
            const bloomEnabled = bloomCfg.enabled ?? false;
            // bloom creation will be handled during pipeline rebuild when needed

            const currentBloomPresent = !!this.nodes.bloomPass;
            if (bloomEnabled !== currentBloomPresent) {
                if (!this._rebuildingPipeline) {
                    this._rebuildingPipeline = true;
                    try {
                        this._createNodePipeline();
                    } catch (e) {
                        console.warn("EffectRenderer: failed to recreate node pipeline", e);
                    } finally {
                        this._rebuildingPipeline = false;
                    }
                }
                return;
            }

            const bloomPass = this.nodes.bloomPass;
            if (bloomPass) {
                if (typeof bloomCfg.strength === "number") {
                    if (bloomPass.strength && typeof bloomPass.strength === "object")
                        bloomPass.strength.value = bloomCfg.strength;
                    else bloomPass.strength = bloomCfg.strength;
                }
                if (typeof bloomCfg.radius === "number") {
                    if (bloomPass.radius && typeof bloomPass.radius === "object")
                        bloomPass.radius.value = bloomCfg.radius;
                    else bloomPass.radius = bloomCfg.radius;
                }
                if (typeof bloomCfg.threshold === "number") {
                    if (bloomPass.threshold && typeof bloomPass.threshold === "object")
                        bloomPass.threshold.value = bloomCfg.threshold;
                    else bloomPass.threshold = bloomCfg.threshold;
                }
            }
        } catch {
            // ignore
        }

        // DoF mapping + dynamic create/remove
        try {
            const dofCfg = postProcessing.dof || {};
            const dofEnabled = dofCfg.enabled ?? false;

            const currentDofPresent = !!this.nodes.dofPass;
            if (dofEnabled !== currentDofPresent) {
                if (!this._rebuildingPipeline) {
                    this._rebuildingPipeline = true;
                    try {
                        this._createNodePipeline();
                    } catch (e) {
                        console.warn("EffectRenderer: failed to recreate node pipeline", e);
                    } finally {
                        this._rebuildingPipeline = false;
                    }
                }
                return;
            }

            if (typeof dofCfg.focusDistance === "number" && this.nodes.dofFocusDistance) {
                this.nodes.dofFocusDistance.value = dofCfg.focusDistance;
            }
            if (typeof dofCfg.focalLength === "number" && this.nodes.dofFocalLength) {
                this.nodes.dofFocalLength.value = dofCfg.focalLength;
            }
            if (typeof dofCfg.bokehScale === "number" && this.nodes.dofBokehScale) {
                this.nodes.dofBokehScale.value = dofCfg.bokehScale;
            }
        } catch {
            // ignore
        }

        // --- LUT color grading ------------------------------------------
        try {
            const lutCfg = postProcessing.lut || {};
            const lutEnabled = lutCfg.enabled ?? false;
            const currentLutPresent = !!this.nodes.loadedLut;

            if (typeof lutCfg.intensity === "number" && this.nodes.lutIntensity) {
                this.nodes.lutIntensity.value = Math.max(0, Math.min(1, lutCfg.intensity));
            }

            // LUT enablement is gated on both settings + actual texture
            // load. When the user flips enabled=true with an assetId or
            // source URL set, we kick off async load; the pipeline
            // rebuilds on completion. Asset-system path is preferred.
            if (lutEnabled && (lutCfg.assetId || lutCfg.source)) {
                this._ensureLutLoaded({
                    assetId: lutCfg.assetId || "",
                    source: lutCfg.source || "",
                });
            } else if (!lutEnabled && currentLutPresent) {
                this.nodes.loadedLut = null;
                this.updatePipelineOutput?.();
            }
        } catch {
            // ignore
        }

        // --- Film grain --------------------------------------------------
        try {
            const filmCfg = postProcessing.film || {};
            const filmEnabled = filmCfg.enabled ?? false;
            if (typeof filmCfg.intensity === "number" && this.nodes.filmIntensity) {
                this.nodes.filmIntensity.value = filmCfg.intensity;
            }
            if (filmEnabled !== this.nodes.filmEnabled) {
                this.nodes.filmEnabled = filmEnabled;
                this.updatePipelineOutput?.();
            }
        } catch {
            // ignore
        }

        // --- Chromatic aberration ---------------------------------------
        try {
            const caCfg = postProcessing.chromaticAberration || {};
            const caEnabled = caCfg.enabled ?? false;
            if (typeof caCfg.strength === "number" && this.nodes.chromaticAberrationStrength) {
                this.nodes.chromaticAberrationStrength.value = caCfg.strength;
            }
            if (caEnabled !== this.nodes.chromaticAberrationEnabled) {
                this.nodes.chromaticAberrationEnabled = caEnabled;
                this.updatePipelineOutput?.();
            }
        } catch {
            // ignore
        }

        // After updating node uniforms, ensure postProcessing output node reflects any changes
        if (this.renderPipeline) {
            this.updatePipelineOutput();
        }
    }

    _getSSRQualityProfile() {
        try {
            const reflectionQuality = this.qualityManager.getCurrentSettings()?.rendering?.reflectionQuality;

            switch (reflectionQuality) {
                case "low":
                    return {
                        maxResolutionScale: 0.5,
                        maxQuality: 0.35,
                        maxBlurQuality: 1,
                    };
                case "high":
                    return {
                        maxResolutionScale: 1.0,
                        maxQuality: 0.75,
                        maxBlurQuality: 3,
                    };
                case "medium":
                default:
                    return {
                        maxResolutionScale: 0.75,
                        maxQuality: 0.5,
                        maxBlurQuality: 2,
                    };
            }
        } catch {
            return {
                maxResolutionScale: 0.75,
                maxQuality: 0.5,
                maxBlurQuality: 2,
            };
        }
    }

    /**
     * Async LUT loader — fetches a .cube/.3dl and installs the texture
     * into the pipeline. Caches by URL so repeated settings changes don't
     * re-fetch. On completion, triggers a pipeline rebuild so the LUT
     * becomes active in the output chain.
     */
    /**
     * Resolve a LUT config (`{source, assetId}`) to a fetch-ready URL.
     * AssetId wins when both are set — the asset-system path is the
     * canonical storage for uploaded LUTs and persists across sessions /
     * collaborators. Source URL is the fallback for external CDN-hosted
     * LUTs.
     */
    async _resolveLutUrl(config) {
        if (config.assetId) {
            try {
                // Dynamic import to keep the asset-system out of the
                // renderer's cold path when LUTs aren't used.
                const {getAssetRevisionData} = await import("@web-shared/api/asset/index");
                const {resolveAssetRevisionId, getAssetResolutionContext} = await import("@web-shared/asset-management/AssetResolutionContext");
                const app = (await import("@web-shared/global")).default?.app;
                const scene = app?.editor?.scene ?? app?.scene;
                const ctx = scene ? getAssetResolutionContext(scene) : null;
                const revisionId = ctx ? resolveAssetRevisionId(config.assetId, ctx) : null;
                if (!revisionId) {
                    throw new Error(`no revision id for LUT asset ${config.assetId}`);
                }
                const blob = await getAssetRevisionData(config.assetId, revisionId, "blob");
                return {
                    url: URL.createObjectURL(blob),
                    key: `asset:${config.assetId}@${revisionId}`,
                    cleanup: true,
                };
            } catch (e) {
                console.warn("EffectRenderer: failed to resolve LUT asset, falling back to source URL", e);
                // fall through to source path below
            }
        }
        if (config.source) {
            return {url: config.source, key: `url:${config.source}`, cleanup: false};
        }
        return null;
    }

    _ensureLutLoaded(configOrSource) {
        // Accept either a string (legacy — just the URL) or a config
        // object `{source, assetId}`. Normalize to the object form.
        const config = typeof configOrSource === "string"
            ? {source: configOrSource, assetId: ""}
            : configOrSource;
        if (!config || (!config.source && !config.assetId)) return;
        // Build a cache key that's stable across equal configs so we
        // don't re-fetch on every setting tweak.
        const cacheKey = config.assetId ? `asset:${config.assetId}` : `url:${config.source}`;
        if (this.nodes.loadedLut && this.nodes.loadedLut.source === cacheKey) return;
        if (this._pendingLutKey === cacheKey) return;
        this._pendingLutKey = cacheKey;
        void (async () => {
            // Blob URLs allocated inside _resolveLutUrl MUST be revoked to
            // avoid leaking. Track the URL up front — if loadLUT throws the
            // finally block still runs. Previously we set this only after
            // load success, leaking on any load failure.
            let blobUrlToRevoke = null;
            try {
                const resolved = await this._resolveLutUrl(config);
                if (!resolved) {
                    // Couldn't resolve — asset gone, source empty, or
                    // resolution-context missing. Not a crash, just a
                    // no-op. Leave any previously-loaded LUT in place
                    // rather than flickering to disabled.
                    this._pendingLutKey = null;
                    return;
                }
                if (resolved.cleanup) blobUrlToRevoke = resolved.url;
                const {loadLUT} = await import("@web-shared/utils/LUTLoader");
                const loaded = await loadLUT(resolved.url);
                // Overwrite source field so our cache-key check above
                // matches against the stable {asset:id}/url:... string.
                loaded.source = cacheKey;
                if (this._pendingLutKey === cacheKey) {
                    // Dispose any previous LUT texture before swapping —
                    // prevents GPU memory growth as users try different LUTs.
                    const prev = this.nodes.loadedLut;
                    this.nodes.loadedLut = loaded;
                    this._pendingLutKey = null;
                    if (prev?.texture && typeof prev.texture.dispose === "function") {
                        try { prev.texture.dispose(); } catch { /* ignore */ }
                    }
                    this.updatePipelineOutput?.();
                }
            } catch (e) {
                console.warn("EffectRenderer: failed to load LUT", config, e);
                if (this._pendingLutKey === cacheKey) this._pendingLutKey = null;
                // Deliberately do NOT clear this.nodes.loadedLut here —
                // a transient failure (network blip, asset still syncing)
                // shouldn't yank the current LUT from the user's view.
            } finally {
                if (blobUrlToRevoke) {
                    try { URL.revokeObjectURL(blobUrlToRevoke); } catch { /* ignore */ }
                }
            }
        })();
    }

    _postEnabledFromQuality() {
        try {
            const q = this.qualityManager.getCurrentSettings();
            return !!q?.rendering?.postProcessing;
        } catch {
            return true;
        }
    }

    /**
     * Update outline selection at runtime
     * @param {Object3D[]} objects
     */
    setOutlinedObjects(objects) {
        const filtered = Array.isArray(objects)
            ? objects.filter(o => o !== this.scene)
            : [];
        this.selectedObjects = filtered;

        if (this.nodes.outlinePass) {
            this.nodes.outlinePass.selectedObjects = this.selectedObjects;
        }

        this.updatePipelineOutput();

        // Exclude outlined objects from batching, if used
        if (this.batchManager) {
            const set = new Set(this.selectedObjects);
            this.batchManager.setExcludedObjects(set);
        }
    }

    /**
     * Keep batches hot
     */
    updateBatches() {
        try {
            const enableDynamic =
                !(this.scene?.userData?.rendering?.batching?.enableDynamic === false) && isBatchManagerSupported();

            if (this.batchEnabled !== enableDynamic) {
                const togglingToEnabled = !!enableDynamic;

                if (!togglingToEnabled && this.batchManager) {
                    try {
                        this.batchManager.showOriginalMeshes();
                    } catch (err) {
                        console.error(`Err in updateBatched-1 ${JSON.stringify(err)} `);
                    }
                }

                this.setBatchingEnabled(!!enableDynamic);

                if (togglingToEnabled && this.scene) {
                    this.initializeBatchManager(this.scene);
                } else if (!togglingToEnabled && this.batchManager) {
                    this.batchManager.dispose();
                    this.batchManager = null;
                }
            }
        } catch (err) {
            console.error(`Err in updateBatched-2 ${JSON.stringify(err)} `);
        }

        if (!this.batchEnabled || !this.batchManager) return;

        this.batchManager.updateBatchesForSceneChanges();
        this.batchManager.updateBatchedMeshes(this.camera, this.renderer);
    }

    hideOriginalMeshes() {
        if (!this.batchEnabled || !this.batchManager) return;
        this.batchManager.hideOriginalMeshes();
    }

    showOriginalMeshes() {
        if (!this.batchEnabled || !this.batchManager) return;
        this.batchManager.showOriginalMeshes();
    }

    /**
     * Render
     */
    render() {
        if (!this.ready || !this.renderPipeline) {
            // If background is set, we need to clear buffers manually
            if (this.scene.background) {
                this.renderer.clear();
            }

            this._standardRender();
            return;
        }

        if (
            this.renderer.toneMapping !== this._lastToneMapping ||
            this.renderer.toneMappingExposure !== this._lastToneMappingExposure
        ) {
            this.updatePipelineOutput();
        }

        const effectivePixelRatio = this.renderer.getPixelRatio();

        this.sceneTraverser?.update();

        if (this.batchManager && this.meshHandler) {
            this.batchManager.setSceneMeshes(this.meshHandler.results);
        }

        // Use cached CSS size from ResizeObserver — avoids forced reflow each frame
        const cssW = this._canvasSize.w || window.innerWidth;
        const cssH = this._canvasSize.h || window.innerHeight;
        this.resize(cssW, cssH, effectivePixelRatio);

        // batching + render
        this.updateBatches();
        if (this.rendererCSS && typeof this.rendererCSS.setExternalCSSObjects === "function") {
            const externalCSSObjects = this.cssHandler ? this.cssHandler.results : [];
            this.rendererCSS.setExternalCSSObjects(externalCSSObjects);
        }
        if (this.batchEnabled) this.hideOriginalMeshes();

        // Project objects and update frustums

        // const camera = this.camera;
        // if (this.renderer._frustumArray ) {

        //     for (const scene of [this.scene]) {

        //         const frustum = camera.isArrayCamera ? this.renderer._frustumArray : this.renderer._frustum;

        //         if ( ! camera.isArrayCamera ) {

        //             this.renderer._projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
        //             frustum.setFromProjectionMatrix( this.renderer._projScreenMatrix, camera.coordinateSystem, camera.reversedDepth );

        //         }

        //         if (!this.renderer.clippingContext) this.renderer.clippingContext = new ClippingContext();
        //         this.renderer.clippingContext.updateGlobal( scene, camera );

        //         const renderList = this.renderer._renderLists.get( scene, camera );
        //         renderList.begin();

        //         this.renderer._projectObject( scene, camera, 0, renderList, this.renderer.clippingContext );

        //         renderList.finish();

        //         if ( this.renderer.sortObjects === true ) {

        //             renderList.sort( this.renderer._opaqueSort, this.renderer._transparentSort );

        //         }

        //         camera.isManualUpdateRenderList = true;
        //         scene.isManualUpdateRenderList = true;

        //     }
        // }

        try {
            // If background is set, we need to clear buffers manually or ensure autoClear is handled
            // For WebGPU post-processing, it's safer to clear before rendering if we have a background
            if (this.scene.background) {
                this.renderer.clear();
            }
            this.renderPipeline.render();
        } finally {
            if (this.batchEnabled) this.showOriginalMeshes();
        }

        if (this.rendererCSS && this.scene && this.camera) {
            this.rendererCSS.render(this.scene, this.camera);
        }
    }

    /**
     * Fallback direct render (no post)
     */
    _standardRender() {
        try {
            this.scene?.updateMatrixWorld(true);
            if (this.scene) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (e) {
            console.warn("EffectRenderer: Standard render failed", e);
        }
    }

    /**
     * Resize
     * @param width
     * @param height
     * @param pixelRatio
     */
    resize(width, height, pixelRatio) {
        const canvas = this.renderer.domElement;
        const targetW = Math.max(1, Math.floor(width));
        const targetH = Math.max(1, Math.floor(height));
        const backW = Math.floor(targetW * pixelRatio);
        const backH = Math.floor(targetH * pixelRatio);
        // If nothing changed, bail early
        if (canvas.width === backW && canvas.height === backH && this.pixelRatio === pixelRatio) return;
        this.width = targetW;
        this.height = targetH;
        this.pixelRatio = pixelRatio;
        // Important: don't re-touch CSS size each frame
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(targetW, targetH, false); // false => keep CSS size as-is
    }

    /**
     * Dispose
     */
    dispose() {
        // Try to dispose GPU resources explicitly
        try {
            if (this.renderPipeline && typeof this.renderPipeline.dispose === "function") {
                try {
                    this.renderPipeline.dispose();
                } catch {
                    // ignore
                }
            }
        } catch {
            // ignore
        }

        // Dispose all nodes
        if (this.nodes) {
            Object.values(this.nodes).forEach(node => {
                try {
                    if (node && typeof node.dispose === "function") {
                        node.dispose();
                    }
                } catch {
                    // ignore
                }
            });
        }

        // Also attempt to dispose any renderTarget on the scenePass
        try {
            if (
                this.nodes &&
                this.nodes.scenePass &&
                this.nodes.scenePass.renderTarget &&
                typeof this.nodes.scenePass.renderTarget.dispose === "function"
            ) {
                try {
                    this.nodes.scenePass.renderTarget.dispose();
                } catch {
                    // ignore
                }
            }
        } catch {
            // ignore
        }

        // Nodes are GC’d with RenderPipeline; drop refs
        this.renderPipeline = null;
        this.nodes = {
            scenePass: null,
            sceneColor: null,
            sceneDepth: null,
            sceneNormal: null,
            sceneEmissive: null,
            aoPass: null,
            bloomPass: null,
            dofPass: null,
            dofFocusDistance: null,
            dofFocalLength: null,
            dofBokehScale: null,
            outlinePass: null,
            outlinePulse: null,
            otherScenesColor: null,
        };

        // Batch manager
        if (this.batchManager) {
            this.batchManager.dispose();
            this.batchManager = null;
        }

        this.scene = null;
        this.camera = null;
        disposeSparkComposite(this.sparkComposite);
        this.sparkComposite = null;
        this.renderer = null;
        this.rendererCSS = null;

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        this.qualityManager.off("qualityChanged", this.onQualityChanged);
        this.ready = false;
    }
}

export default EffectRenderer;
