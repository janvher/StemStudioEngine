import * as THREE from "three";

import {DetectDevice} from "@stem/editor-oss/utils/DetectDevice";
import {getRuntimeBudgetCoordinatorFromEngine, type RuntimeBudgetPressure} from "./RuntimeBudgetCoordinator";
import type {IQualitySettings} from "../quality/interfaces/IQualityManager";

export type PlotBudgetState = "near" | "mid" | "far" | "culled";

export interface PlotBudgetStats {
    triangles: number;
    drawCalls: number;
    bounds: THREE.Vector3;
    textureBytes: number;
    textureCount: number;
}

export interface PlotBudgetMetadata {
    enabled?: boolean;
    state?: PlotBudgetState;
    stats?: PlotBudgetStats;
    visibilityManaged?: boolean;
    previousVisible?: boolean;
    lastDecision?: PlotBudgetDecision;
}

export interface PlotBudgetDecision {
    state: PlotBudgetState;
    distanceSq: number;
    visible: boolean;
    shouldRender: boolean;
    reason: string;
}

export interface PlotBudgetPolicyOptions {
    runtimePressure?: RuntimeBudgetPressure;
    runtimeDistanceScale?: number;
    runtimeLodDistanceScale?: number;
    isMobile?: boolean;
    nearDistance?: number;
    midDistance?: number;
    farDistance?: number;
    cullDistance?: number;
    offscreenCullDistance?: number;
    lodDistanceMultiplier?: number;
    batchSize?: number;
    heavyTriangleLimit?: number;
    heavyDrawCallLimit?: number;
    heavyTextureBytesLimit?: number;
}

type TextureSlot =
    | "alphaMap"
    | "aoMap"
    | "bumpMap"
    | "clearcoatMap"
    | "clearcoatNormalMap"
    | "clearcoatRoughnessMap"
    | "displacementMap"
    | "emissiveMap"
    | "envMap"
    | "iridescenceMap"
    | "iridescenceThicknessMap"
    | "lightMap"
    | "map"
    | "metalnessMap"
    | "normalMap"
    | "roughnessMap"
    | "sheenColorMap"
    | "sheenRoughnessMap"
    | "specularColorMap"
    | "specularIntensityMap"
    | "thicknessMap"
    | "transmissionMap";

interface ManagedLod {
    lod: THREE.LOD;
    baseDistances: number[];
    originalAutoUpdate?: boolean;
}

interface ManagedPlot {
    root: THREE.Object3D;
    lods: ManagedLod[];
}

const TEXTURE_SLOTS: TextureSlot[] = [
    "alphaMap",
    "aoMap",
    "bumpMap",
    "clearcoatMap",
    "clearcoatNormalMap",
    "clearcoatRoughnessMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "iridescenceMap",
    "iridescenceThicknessMap",
    "lightMap",
    "map",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
    "sheenColorMap",
    "sheenRoughnessMap",
    "specularColorMap",
    "specularIntensityMap",
    "thicknessMap",
    "transmissionMap",
];

const BYTES_PER_RGBA_PIXEL = 4;
const MIP_CHAIN_MULTIPLIER = 4 / 3;
const DEFAULT_BOUNDS_RADIUS = 2;

export class PlotBudgetPolicy {
    private options: Required<PlotBudgetPolicyOptions>;
    private configuredOverrides: PlotBudgetPolicyOptions;
    private readonly frustum = new THREE.Frustum();
    private readonly frustumMatrix = new THREE.Matrix4();
    private readonly objectWorldPosition = new THREE.Vector3();
    private readonly cameraWorldPosition = new THREE.Vector3();
    private readonly visibilitySphere = new THREE.Sphere();

    constructor(options: PlotBudgetPolicyOptions = {}) {
        this.configuredOverrides = {...options};
        this.options = PlotBudgetPolicy.resolveOptions(options);
    }

    configure(options: PlotBudgetPolicyOptions = {}): void {
        this.configuredOverrides = {...this.configuredOverrides, ...options};
        this.options = PlotBudgetPolicy.resolveOptions(this.configuredOverrides);
    }

    configureFromQuality(settings: IQualitySettings | null | undefined, overrides: PlotBudgetPolicyOptions = {}): void {
        this.options = PlotBudgetPolicy.resolveOptions(
            getPlotBudgetOptionsFromQuality(settings, {...this.configuredOverrides, ...overrides}),
        );
    }

    static resolveOptions(options: PlotBudgetPolicyOptions = {}): Required<PlotBudgetPolicyOptions> {
        const isMobile = options.isMobile ?? DetectDevice.isMobile();
        return {
            isMobile,
            nearDistance: options.nearDistance ?? (isMobile ? 35 : 80),
            midDistance: options.midDistance ?? (isMobile ? 80 : 180),
            farDistance: options.farDistance ?? (isMobile ? 140 : 360),
            cullDistance: options.cullDistance ?? (isMobile ? 220 : 700),
            offscreenCullDistance: options.offscreenCullDistance ?? (isMobile ? 90 : 220),
            lodDistanceMultiplier: options.lodDistanceMultiplier ?? (isMobile ? 0.75 : 1),
            batchSize: options.batchSize ?? (isMobile ? 24 : 64),
            heavyTriangleLimit: options.heavyTriangleLimit ?? (isMobile ? 30000 : 120000),
            heavyDrawCallLimit: options.heavyDrawCallLimit ?? (isMobile ? 24 : 80),
            heavyTextureBytesLimit: options.heavyTextureBytesLimit ?? (isMobile ? 48 : 192) * 1024 * 1024,
            runtimePressure: options.runtimePressure ?? "normal",
            runtimeDistanceScale: options.runtimeDistanceScale ?? 1,
            runtimeLodDistanceScale: options.runtimeLodDistanceScale ?? 1,
        };
    }

    getBatchSize(): number {
        return this.options.batchSize;
    }

    decide(object: THREE.Object3D, camera: THREE.Camera): PlotBudgetDecision {
        const metadata = ensurePlotBudgetMetadata(object);
        const distanceSq = this.getDistanceSq(object, camera);
        const visible = this.isVisible(object, camera);
        const thresholds = this.getCostAdjustedThresholds(object);
        const distance = Math.sqrt(distanceSq);
        let state: PlotBudgetState = "near";
        let reason = "near-visible";

        if (distance > thresholds.cullDistance || (!visible && distance > thresholds.offscreenCullDistance)) {
            state = "culled";
            reason = visible ? "distance-cull" : "offscreen-cull";
        } else if (distance > thresholds.farDistance) {
            state = "far";
            reason = "far";
        } else if (distance > thresholds.midDistance) {
            state = "mid";
            reason = "mid";
        }

        const decision: PlotBudgetDecision = {
            state,
            distanceSq,
            visible,
            shouldRender: state !== "culled",
            reason,
        };
        metadata.state = state;
        metadata.lastDecision = decision;
        object.userData.plotBudgetState = state;
        return decision;
    }

    applyVisibilityState(object: THREE.Object3D, decision: PlotBudgetDecision): void {
        const metadata = ensurePlotBudgetMetadata(object);

        if (!decision.shouldRender) {
            if (!metadata.visibilityManaged) {
                metadata.previousVisible = object.visible;
                metadata.visibilityManaged = true;
            }
            object.visible = false;
            return;
        }

        if (metadata.visibilityManaged) {
            object.visible = metadata.previousVisible ?? true;
            metadata.previousVisible = undefined;
            metadata.visibilityManaged = false;
        }
    }

    applyLods(lods: ManagedLod[], camera: THREE.Camera): void {
        for (const managed of lods) {
            const lod = managed.lod;
            for (let i = 0; i < lod.levels.length; i++) {
                const level = lod.levels[i];
                if (!level) continue;
                level.distance =
                    managed.baseDistances[i]! *
                    this.options.lodDistanceMultiplier *
                    this.options.runtimeLodDistanceScale;
            }
            lod.update(camera);
        }
    }

    private getDistanceSq(object: THREE.Object3D, camera: THREE.Camera): number {
        object.getWorldPosition(this.objectWorldPosition);
        camera.getWorldPosition(this.cameraWorldPosition);
        return this.objectWorldPosition.distanceToSquared(this.cameraWorldPosition);
    }

    private isVisible(object: THREE.Object3D, camera: THREE.Camera): boolean {
        const metadata = ensurePlotBudgetMetadata(object);
        if (!object.visible && !metadata.visibilityManaged) return false;

        camera.updateMatrixWorld();
        this.frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.frustumMatrix);

        object.getWorldPosition(this.objectWorldPosition);
        this.visibilitySphere.center.copy(this.objectWorldPosition);
        this.visibilitySphere.radius = getPlotBoundsRadius(object);
        return this.frustum.intersectsSphere(this.visibilitySphere);
    }

    private getCostAdjustedThresholds(object: THREE.Object3D) {
        const stats = getPlotBudgetMetadata(object)?.stats;
        const isHeavy =
            !!stats &&
            (stats.triangles > this.options.heavyTriangleLimit ||
                stats.drawCalls > this.options.heavyDrawCallLimit ||
                stats.textureBytes > this.options.heavyTextureBytesLimit);
        const multiplier = isHeavy ? 0.85 : 1;
        const runtimeScale = THREE.MathUtils.clamp(this.options.runtimeDistanceScale, 0.3, 1.25);
        const midDistance = Math.max(this.options.nearDistance, this.options.midDistance * multiplier * runtimeScale);
        const farDistance = Math.max(midDistance + 1, this.options.farDistance * multiplier * runtimeScale);
        const cullDistance = Math.max(farDistance + 1, this.options.cullDistance * (isHeavy ? 0.9 : 1) * runtimeScale);
        const offscreenCullDistance = Math.max(
            this.options.nearDistance,
            this.options.offscreenCullDistance * (isHeavy ? 0.85 : 1) * runtimeScale,
        );

        return {
            midDistance,
            farDistance,
            cullDistance,
            offscreenCullDistance,
        };
    }
}

export class PlotBudgetManager {
    private readonly policy: PlotBudgetPolicy;
    private readonly plots: ManagedPlot[] = [];
    private readonly plotIndexes = new Map<string, number>();
    private cursor = 0;

    constructor(scene?: THREE.Scene, options: PlotBudgetPolicyOptions = {}) {
        this.policy = new PlotBudgetPolicy(options);
        if (scene) {
            this.rebuild(scene);
        }
    }

    configure(options: PlotBudgetPolicyOptions = {}): void {
        this.policy.configure(options);
    }

    configureFromQuality(settings: IQualitySettings | null | undefined, overrides: PlotBudgetPolicyOptions = {}): void {
        this.policy.configureFromQuality(settings, overrides);
    }

    rebuild(scene: THREE.Scene): void {
        this.clear();
        for (const child of scene.children) {
            this.registerObjectTree(child);
        }
    }

    registerObjectTree(root: THREE.Object3D): void {
        this.walkAndRegister(root, false);
    }

    unregisterObjectTree(root: THREE.Object3D): void {
        root.traverse(object => {
            this.unregister(object);
        });
    }

    update(camera: THREE.Camera | null | undefined): void {
        if (!camera || this.plots.length === 0) return;

        const count = Math.min(this.policy.getBatchSize(), this.plots.length);
        for (let i = 0; i < count; i++) {
            const index = (this.cursor + i) % this.plots.length;
            const plot = this.plots[index];
            if (!plot) continue;
            if (!plot.root.parent) {
                this.unregister(plot.root);
                continue;
            }

            const decision = this.policy.decide(plot.root, camera);
            this.policy.applyVisibilityState(plot.root, decision);
            if (decision.shouldRender) {
                this.policy.applyLods(plot.lods, camera);
            }
        }

        if (this.plots.length > 0) {
            this.cursor = (this.cursor + count) % this.plots.length;
        } else {
            this.cursor = 0;
        }
    }

    getRegisteredCount(): number {
        return this.plots.length;
    }

    clear(): void {
        for (const plot of this.plots) {
            for (const managed of plot.lods) {
                restoreLodAutoUpdate(managed);
            }
        }
        this.plots.length = 0;
        this.plotIndexes.clear();
        this.cursor = 0;
    }

    dispose(): void {
        this.clear();
    }

    private walkAndRegister(object: THREE.Object3D, _insideManagedRoot: boolean): void {
        if (isPlotBudgetExplicitlyDisabled(object)) return;

        if (!_insideManagedRoot && isPlotBudgetCandidate(object)) {
            this.register(object);
            return;
        }

        for (const child of object.children) {
            this.walkAndRegister(child, _insideManagedRoot);
        }
    }

    private register(root: THREE.Object3D): void {
        if (this.plotIndexes.has(root.uuid)) return;
        markObjectForPlotBudget(root, {enabled: true});

        const managed: ManagedPlot = {
            root,
            lods: collectManagedLods(root),
        };
        for (const lod of managed.lods) {
            (lod.lod as THREE.LOD & {autoUpdate?: boolean}).autoUpdate = false;
        }

        this.plotIndexes.set(root.uuid, this.plots.length);
        this.plots.push(managed);
    }

    private unregister(root: THREE.Object3D): void {
        const index = this.plotIndexes.get(root.uuid);
        if (index === undefined) return;

        const [removed] = this.plots.splice(index, 1);
        if (removed) {
            for (const managed of removed.lods) {
                restoreLodAutoUpdate(managed);
            }
        }

        this.plotIndexes.clear();
        for (let i = 0; i < this.plots.length; i++) {
            this.plotIndexes.set(this.plots[i]!.root.uuid, i);
        }
        this.cursor = this.plots.length > 0 ? this.cursor % this.plots.length : 0;
    }
}

export function configurePlotBudgetManagerFromEngine(manager: PlotBudgetManager, engine: unknown): void {
    const qualityManager = (engine as {qualityManager?: {getCurrentSettings?: () => IQualitySettings}} | null | undefined)
        ?.qualityManager;
    manager.configureFromQuality(
        qualityManager?.getCurrentSettings?.(),
        getRuntimeBudgetCoordinatorFromEngine(engine)?.getPlotBudgetOverrides?.(),
    );
}

export function getPlotBudgetOptionsFromQuality(
    settings: IQualitySettings | null | undefined,
    overrides: PlotBudgetPolicyOptions = {},
): PlotBudgetPolicyOptions {
    const isMobile = overrides.isMobile ?? DetectDevice.isMobile();
    if (!settings) {
        return {...overrides, isMobile};
    }

    const base = PlotBudgetPolicy.resolveOptions({isMobile});
    const scene = settings.scene;
    const lodDistances = scene?.lodDistances ?? [];
    const pressure = getQualityPressure(settings, isMobile);
    const distanceScale = THREE.MathUtils.clamp(1 - pressure * 0.45, 0.45, 1.05);
    const viewDistance = scene?.viewDistance && scene.viewDistance > 0 ? scene.viewDistance : base.cullDistance;

    return {
        isMobile,
        nearDistance: Math.max(8, Math.round((lodDistances[0] ?? base.nearDistance) * distanceScale)),
        midDistance: Math.max(16, Math.round((lodDistances[1] ?? base.midDistance) * distanceScale)),
        farDistance: Math.max(32, Math.round((lodDistances[2] ?? base.farDistance) * distanceScale)),
        cullDistance: Math.max(48, Math.round(viewDistance * distanceScale)),
        offscreenCullDistance: Math.max(24, Math.round(base.offscreenCullDistance * distanceScale)),
        lodDistanceMultiplier: THREE.MathUtils.clamp(1 - pressure * 0.5, 0.4, 1),
        batchSize: isMobile ? 16 : 48,
        heavyTriangleLimit: Math.floor(base.heavyTriangleLimit * (1 - pressure * 0.25)),
        heavyDrawCallLimit: Math.max(8, Math.floor(base.heavyDrawCallLimit * (1 - pressure * 0.25))),
        heavyTextureBytesLimit: Math.floor(base.heavyTextureBytesLimit * (1 - pressure * 0.35)),
        ...overrides,
    };
}

export function markObjectForPlotBudget(object: THREE.Object3D, metadata: PlotBudgetMetadata = {}): void {
    const current = ensurePlotBudgetMetadata(object);
    Object.assign(current, metadata);
    if (metadata.enabled === undefined) {
        current.enabled = true;
    }
    current.stats = metadata.stats ?? current.stats ?? collectPlotBudgetStats(object);
}

export function getPlotBudgetMetadata(object: THREE.Object3D): PlotBudgetMetadata | undefined {
    return (object.userData as {plotBudget?: PlotBudgetMetadata}).plotBudget;
}

export function ensurePlotBudgetMetadata(object: THREE.Object3D): PlotBudgetMetadata {
    const data = object.userData as {plotBudget?: PlotBudgetMetadata};
    data.plotBudget ??= {};
    return data.plotBudget;
}

export function isPlotBudgetCandidate(object: THREE.Object3D): boolean {
    const metadata = getPlotBudgetMetadata(object);
    if (metadata?.enabled === true) return true;
    if (metadata?.enabled === false) return false;
    if (!object.userData?.isStemObject) return false;
    if (!hasRenderableDescendant(object)) return false;
    if (hasRuntimeMetadataInTree(object)) return false;
    return true;
}

export function collectPlotBudgetStats(root: THREE.Object3D): PlotBudgetStats {
    const geometries = new Set<string>();
    const textures = new Set<string>();
    const bounds = new THREE.Vector3();
    const box = new THREE.Box3();
    const stats: PlotBudgetStats = {
        triangles: 0,
        drawCalls: 0,
        bounds,
        textureBytes: 0,
        textureCount: 0,
    };

    root.traverse(child => {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;
        const material = mesh.material;

        if (geometry && !geometries.has(geometry.uuid)) {
            geometries.add(geometry.uuid);
            stats.triangles += getGeometryTriangleCount(geometry);
        }

        if (material) {
            const materials = Array.isArray(material) ? material : [material];
            stats.drawCalls += Math.max(1, materials.length);
            for (const item of materials) {
                addMaterialTextureBytes(item, textures, stats);
            }
        }
    });

    box.setFromObject(root);
    if (!box.isEmpty()) {
        box.getSize(bounds);
    }
    stats.textureCount = textures.size;
    return stats;
}

function collectManagedLods(root: THREE.Object3D): ManagedLod[] {
    const lods: ManagedLod[] = [];
    root.traverse(child => {
        if (!(child instanceof THREE.LOD)) return;
        lods.push({
            lod: child,
            baseDistances: child.levels.map(level => level.distance),
            originalAutoUpdate: (child as THREE.LOD & {autoUpdate?: boolean}).autoUpdate,
        });
    });
    return lods;
}

function restoreLodAutoUpdate(managed: ManagedLod): void {
    const lod = managed.lod as THREE.LOD & {autoUpdate?: boolean};
    if (managed.originalAutoUpdate !== undefined) {
        lod.autoUpdate = managed.originalAutoUpdate;
    }
}

function isPlotBudgetExplicitlyDisabled(object: THREE.Object3D): boolean {
    return getPlotBudgetMetadata(object)?.enabled === false;
}

function hasRenderableDescendant(root: THREE.Object3D): boolean {
    let found = false;
    root.traverse(child => {
        const renderable = child as THREE.Object3D & {isMesh?: boolean; isLOD?: boolean; isSprite?: boolean};
        if (renderable.isMesh || renderable.isLOD || renderable.isSprite) {
            found = true;
        }
    });
    return found;
}

function hasRuntimeMetadataInTree(root: THREE.Object3D): boolean {
    let found = false;
    root.traverse(child => {
        if (found) return;
        const data = child.userData ?? {};
        const physics = data.physics as {enabled?: boolean; type?: string} | undefined;
        found =
            data.isRuntimeOnly === true ||
            data.isBillboard === true ||
            data.avatarBudget !== undefined ||
            data.player !== undefined ||
            data.animation !== undefined ||
            Array.isArray(data.behaviors) && data.behaviors.length > 0 ||
            Array.isArray(data.lambdaComponents) && data.lambdaComponents.length > 0 ||
            !!physics && physics.enabled !== false && physics.type !== "static";
    });
    return found;
}

function getPlotBoundsRadius(object: THREE.Object3D): number {
    const metadata = ensurePlotBudgetMetadata(object);
    metadata.stats ??= collectPlotBudgetStats(object);
    const radius = metadata.stats.bounds.length() / 2;
    return radius > 0 ? radius : DEFAULT_BOUNDS_RADIUS;
}

function getGeometryTriangleCount(geometry: THREE.BufferGeometry): number {
    if (geometry.index) {
        return Math.floor(geometry.index.count / 3);
    }

    const position = geometry.getAttribute("position");
    return position ? Math.floor(position.count / 3) : 0;
}

function addMaterialTextureBytes(
    material: THREE.Material,
    textureIds: Set<string>,
    stats: PlotBudgetStats,
): void {
    const texturedMaterial = material as THREE.Material & Partial<Record<TextureSlot, THREE.Texture | null>>;

    for (const slot of TEXTURE_SLOTS) {
        const texture = texturedMaterial[slot];
        if (!texture || textureIds.has(texture.uuid)) continue;
        textureIds.add(texture.uuid);
        stats.textureBytes += estimateTextureBytes(texture);
    }
}

function estimateTextureBytes(texture: THREE.Texture): number {
    const {width, height} = getTextureDimensions(texture);
    if (width <= 0 || height <= 0) return 0;
    const baseBytes = width * height * BYTES_PER_RGBA_PIXEL;
    return Math.ceil(texture.generateMipmaps ? baseBytes * MIP_CHAIN_MULTIPLIER : baseBytes);
}

function getTextureDimensions(texture: THREE.Texture): {width: number; height: number} {
    const image = texture.image as
        | {width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number}
        | undefined;
    if (!image) return {width: 0, height: 0};

    const width = Math.max(image.videoWidth ?? 0, image.naturalWidth ?? 0, image.width ?? 0);
    const height = Math.max(image.videoHeight ?? 0, image.naturalHeight ?? 0, image.height ?? 0);
    return {width, height};
}

function getQualityPressure(settings: IQualitySettings, isMobile: boolean): number {
    const rendering = settings.rendering;
    const scene = settings.scene;
    const textureTier = getTextureQualityTier(rendering?.textureQuality);
    const lodBias = THREE.MathUtils.clamp(rendering?.lodBias ?? 0, 0, 3);
    const cullingAggressiveness = THREE.MathUtils.clamp(scene?.cullingAggressiveness ?? 0.5, 0, 1);
    let pressure = 0;

    pressure += (4 - textureTier) * 0.12;
    pressure += lodBias * 0.1;
    pressure += cullingAggressiveness * 0.08;
    if ((rendering?.pixelRatio ?? 1) <= 0.75) pressure += 0.08;
    if (isMobile) pressure += 0.12;

    return THREE.MathUtils.clamp(pressure, 0, 0.8);
}

function getTextureQualityTier(quality: IQualitySettings["rendering"]["textureQuality"] | undefined): number {
    switch (quality) {
        case "ultra":
            return 4;
        case "high":
            return 3;
        case "medium":
            return 2;
        case "low":
            return 1;
        default:
            return 2;
    }
}
