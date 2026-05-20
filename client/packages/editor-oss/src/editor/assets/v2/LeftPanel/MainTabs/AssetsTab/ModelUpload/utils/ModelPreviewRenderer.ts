import type { SparkWebGpuRenderer } from '@querielo/spark';
import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { gaussianBlur } from "three/examples/jsm/tsl/display/GaussianBlurNode.js";
import { depth, float, pass, texture, uniform, uv, vec3, vec4 } from "three/tsl";
import {
    AmbientLight,
    Color,
    DirectionalLight,
    EquirectangularReflectionMapping,
    Group,
    Mesh,
    MeshBasicNodeMaterial,
    Object3D,
    OrthographicCamera,
    PCFShadowMap,
    PerspectiveCamera,
    PlaneGeometry,
    RenderPipeline,
    RenderTarget,
    Scene,
    Texture,
    Vector3,
    WebGPURenderer,
} from 'three/webgpu';

import { getObjectBoundingBox, isGaussianSplatObject } from '@stem/editor-oss/model/gaussianSplats';
import { disposeSparkComposite, ensureSparkComposite } from '../../../../../../../../render/SparkCompositeBridge';
import { positionCameraForModel } from "../../../../../utils/positionCameraForModel";

export class ModelPreviewRenderer {
    renderer: WebGPURenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    postProcessing?: RenderPipeline;
    shadowState: {
        shadowGroup: Group;
        shadowCamera: OrthographicCamera;
        renderTarget: RenderTarget;
        shadowPlane: Mesh;
        fillPlane: Mesh;
        depthMaterial: MeshBasicNodeMaterial;
    };
    directionalLight: DirectionalLight;
    private sparkComposite: SparkWebGpuRenderer | null;

    private model?: Object3D;
    private isGaussianSplatModel = false;
    private cameraWarmupFramesRemaining = 0;
    private isRunning = false;
    private width = 100;
    private height = 100;

    constructor(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number, pixelRatio: number) {
        this.width = width;
        this.height = height;

        this.renderer = new WebGPURenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
        });

        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(width, height, false);
        this.renderer.setClearColor(new Color(0x27272a));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFShadowMap;

        this.scene = new Scene();
        this.scene.name = "ModelPreviewScene";
        const light = new AmbientLight(0xffffff, 5);
        light.name = "AutoLight";
        this.scene.add(light);

        this.directionalLight = new DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(5, 10, 7.5);
        this.scene.add(this.directionalLight);

        new HDRLoader().load(
            "/assets/hdr/studio.hdr",
            (loadedTexture: Texture) => {
                loadedTexture.mapping = EquirectangularReflectionMapping;
                this.scene.environment = loadedTexture;
                this.scene.environmentIntensity = 1.0;
            },
            undefined,
            (error: unknown) => {
                console.error("Failed to load HDR environment:", error);
            },
        );

        this.camera = new PerspectiveCamera(20, width / height, 0.1, 1000);
        this.controls = new OrbitControls(this.camera, canvas as unknown as HTMLElement);
        this.controls.enableDamping = true;

        const shadowGroup = new Group();
        this.scene.add(shadowGroup);

        const renderTarget = new RenderTarget(512, 512, { depthBuffer: true });
        renderTarget.texture.generateMipmaps = false;

        const planeGeometry = new PlaneGeometry(1, 1).rotateX(Math.PI / 2);

        const uBlur = uniform(5.5);
        const uDarkness = uniform(1.0);
        const uShadowOpacity = uniform(1.0);
        const uPlaneOpacity = uniform(0.9);
        const uPlaneColor = uniform(new Color(0x27272a));

        const depthMaterial = new MeshBasicNodeMaterial();
        const alphaDepth = float(1).sub(depth).mul(uDarkness);
        depthMaterial.outputNode = vec4(vec3(0), alphaDepth);
        depthMaterial.depthTest = false;
        depthMaterial.depthWrite = false;

        const shadowPlaneMaterial = new MeshBasicNodeMaterial();
        shadowPlaneMaterial.transparent = true;
        shadowPlaneMaterial.depthWrite = false;
        const blurredShadow = gaussianBlur(texture(renderTarget.texture), uBlur, 4, { premultipliedAlpha: false });
        shadowPlaneMaterial.outputNode = vec4(
            vec3(0),
            blurredShadow.a.mul(uShadowOpacity).add((bayer16(uv().mul(512)) as any).r.sub(0.5).mul(0.05)),
        );

        const shadowPlane = new Mesh(planeGeometry, shadowPlaneMaterial);
        shadowPlane.renderOrder = 1;
        shadowPlane.scale.y = -1;
        shadowPlane.scale.z = -1;
        shadowGroup.add(shadowPlane);

        const fillPlaneMaterial = new MeshBasicNodeMaterial();
        fillPlaneMaterial.transparent = true;
        fillPlaneMaterial.depthWrite = false;
        fillPlaneMaterial.outputNode = vec4(vec3(uPlaneColor as any), uPlaneOpacity);
        const fillPlane = new Mesh(planeGeometry, fillPlaneMaterial);
        fillPlane.rotateX(Math.PI);
        shadowGroup.add(fillPlane);

        const shadowCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
        shadowCamera.rotation.x = Math.PI / 2;
        shadowGroup.add(shadowCamera);

        this.shadowState = {
            shadowGroup,
            shadowCamera,
            renderTarget,
            shadowPlane,
            fillPlane,
            depthMaterial,
        };

        this.sparkComposite = ensureSparkComposite(this.scene, this.renderer);
    }

    async init() {
        await this.renderer.init();

        const scenePass = pass(this.scene, this.camera);
        const colorTex = scenePass.getTextureNode("output");

        const pp = new RenderPipeline(this.renderer);
        pp.outputNode = colorTex;

        this.postProcessing = pp;
        this.isRunning = true;
        this.animate();
    }

    updateModel(model: Object3D) {
        if (this.model) {
            this.scene.remove(this.model);
            this.disposeModel(this.model);
        }

        this.model = model;
        this.model.name = "PreviewMesh";
        this.scene.add(this.model);
        this.model.updateMatrixWorld(true);
        this.isGaussianSplatModel = isGaussianSplatObject(this.model);
        this.cameraWarmupFramesRemaining = this.isGaussianSplatModel ? 45 : 0;

        positionCameraForModel(this.model, this.camera, this.controls);
        this.updateShadowBounds();
    }

    updateShadowBounds() {
        if (!this.model) return;

        const { shadowGroup, shadowCamera, shadowPlane, fillPlane } = this.shadowState;

        if (this.isGaussianSplatModel) {
            shadowPlane.visible = false;
            fillPlane.visible = false;
            return;
        }

        const bbox = getObjectBoundingBox(this.model);
        const sizeVec = bbox.getSize(new Vector3());
        const center = bbox.getCenter(new Vector3());
        const hasFiniteBounds =
            Number.isFinite(sizeVec.x) && Number.isFinite(sizeVec.y) && Number.isFinite(sizeVec.z) &&
            Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z);

        if (!hasFiniteBounds || bbox.isEmpty()) {
            shadowPlane.visible = false;
            fillPlane.visible = false;
            return;
        }

        shadowPlane.visible = true;
        fillPlane.visible = true;

        const maxExtent = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const planeY = bbox.min.y - 0.01;

        const lightDistance = maxExtent * 1.5;
        this.directionalLight.position.set(
            center.x + lightDistance,
            center.y + lightDistance,
            center.z + lightDistance,
        );
        this.directionalLight.lookAt(center);

        shadowGroup.position.y = planeY;

        const planeSize = Math.max(0.5, maxExtent * 1.5);
        const cameraHeight = Math.max(0.1, sizeVec.y + 0.5);

        shadowPlane.scale.set(planeSize, -1, -planeSize);
        fillPlane.scale.set(planeSize, 1, planeSize);

        shadowCamera.left = -planeSize / 2;
        shadowCamera.right = planeSize / 2;
        shadowCamera.top = planeSize / 2;
        shadowCamera.bottom = -planeSize / 2;
        shadowCamera.far = cameraHeight;
        shadowCamera.updateProjectionMatrix();
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    animate = () => {
        if (!this.isRunning) return;
        requestAnimationFrame(this.animate);

        this.controls.update();

        if (this.model && this.cameraWarmupFramesRemaining > 0) {
            this.model.updateMatrixWorld(true);
            positionCameraForModel(this.model, this.camera, this.controls);
            this.updateShadowBounds();
            this.cameraWarmupFramesRemaining--;
        }

        if (!this.postProcessing) return;

        try {
            const { shadowCamera, renderTarget, shadowPlane, fillPlane, depthMaterial } = this.shadowState;

            if (!this.isGaussianSplatModel) {
                const prevOverride = this.scene.overrideMaterial;
                const prevAutoClear = this.renderer.autoClear;
                const hasGetClearAlpha = typeof this.renderer.getClearAlpha === "function";
                const prevClearAlpha = hasGetClearAlpha ? this.renderer.getClearAlpha() : undefined;

                shadowPlane.visible = false;
                fillPlane.visible = false;

                this.scene.overrideMaterial = depthMaterial;
                this.renderer.autoClear = true;
                if (hasGetClearAlpha && prevClearAlpha !== undefined && this.renderer.setClearAlpha) {
                    this.renderer.setClearAlpha(0);
                }

                this.renderer.setRenderTarget(renderTarget);
                this.renderer.clear();
                this.renderer.render(this.scene, shadowCamera);

                this.scene.overrideMaterial = prevOverride;
                this.renderer.setRenderTarget(null);
                this.renderer.autoClear = prevAutoClear;
                if (hasGetClearAlpha && prevClearAlpha !== undefined && this.renderer.setClearAlpha) {
                    this.renderer.setClearAlpha(prevClearAlpha);
                }

                shadowPlane.visible = true;
                fillPlane.visible = true;
            }

            this.postProcessing.render();
        } catch (error) {
            console.error(error);
        }
    };

    dispose() {
        this.isRunning = false;
        if (this.model) {
            this.disposeModel(this.model);
            this.model = undefined;
        }
        disposeSparkComposite(this.sparkComposite);
        this.renderer.dispose();
        this.scene.clear();
        this.controls.dispose();
        this.shadowState.renderTarget.dispose();
    }

    private disposeModel(model: Object3D) {
        if (model.userData?.skipPreviewDispose) {
            return;
        }

        model.traverse((child) => {
            if (child instanceof Mesh) {
                child.geometry?.dispose();
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of materials) {
                    if (!mat) continue;
                    for (const key of Object.keys(mat)) {
                        const value = (mat)[key];
                        if (value instanceof Texture) {
                            value.dispose();
                        }
                    }
                    mat.dispose();
                }
            }
        });

        const disposable = model as Object3D & { dispose?: () => void };
        if (typeof disposable.dispose === 'function') {
            disposable.dispose();
        }
    }
}
