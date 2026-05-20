import * as THREE from "three";
// Replaced custom Sky shader with three.js SkyMesh (WebGPU-ready atmospheric scattering)
// If your three version lacks SkyMesh, ensure three >= r179 or adjust import path.
// Type declarations are provided in a local d.ts shim.
import {SkyMesh} from "three/addons/objects/SkyMesh.js";

import global from "@stem/editor-oss/global";
import {ExtendedDirectionalLight} from "@stem/editor-oss/light/ExtendedDirectionalLight";
import {getOrCreateDynamicRoot} from "@stem/editor-oss/scene/dynamicRoots";
import {isDirectionalLight, isExtendedDirectionalLight} from "@stem/editor-oss/utils/LightUtils";
import EventBus, {BEHAVIOR_EVENTS} from "../../event/EventBus";

// Temp variable to avoid per-frame allocations
const _camWorldPos = /*@__PURE__*/ new THREE.Vector3();

class DayNightCycle {
    private target?: THREE.Object3D;
    private id: number = Math.floor(Math.random() * 1_000_000);
    terrainModels: THREE.Object3D[] = [];
    private static instance: DayNightCycle | null = null;
    private static refCount: number = 0; // number of active users (behaviors/editors) retaining the instance
    public sky?: SkyMesh;
    private sun!: THREE.Vector3;
    private startTime: number = Date.now();
    private dayLength: number = 300;
    private elapsedPauseTime: number = 0;
    private scene: THREE.Scene;
    public enableDayNightCycle: boolean = false;
    private dayDuration = this.dayLength * 1000;
    //private baseSpeed = 0.00000001; //5 minute day
    private baseSpeed = 0.000000005; //slower sunrise for testing and demo
    private speedRatio = this.dayDuration / 1000;
    private adjustedTime = this.dayLength * 1000;
    private time: number = 0;
    private angle: number = 0;
    private isPaused: boolean = false;
    private speedMultiplier: number = 1.0;
    previousIsPlaying = false;
    private previousSceneID: string | null = null;
    private effectController = {
        turbidity: 20,
        rayleigh: 0.558,
        mieCoefficient: 0.009,
        mieDirectionalG: 0.999998,
        elevation: 0,
        azimuth: 180,
        exposure: 1.5,
    };
    private camera: THREE.Camera;
    private previousBackground: THREE.Color | THREE.Texture | THREE.CubeTexture | null | undefined = undefined;
    private previousBackgroundNode: any = undefined;

    //save this for more golden sky example not as much blue mid day
    //private effectController = {
    //    turbidity: 10,
    //    rayleigh: 3,
    //    mieCoefficient: 0.007,
    //    mieDirectionalG: 1,
    //    elevation: 0,
    //    azimuth: 180,
    //    exposure: 0.75
    //};
    constructor(target: THREE.Object3D, scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.target = target;
        this.camera = camera;
        if (!this.sky) {
            this.createSky();
        }
    }

    // CHECK: if this is used anywhere
    private generateWeatherID(): string {
        return Math.random().toString(36).substring(2, 12);
    }

    public resetSun() {
        this.clearSky();
        this.startTime = Date.now();
        this.adjustedTime = (Date.now() - this.startTime - this.elapsedPauseTime) * this.baseSpeed * this.speedRatio;

        const smallOffset = 0.01;
        this.time = (this.adjustedTime % 1 + 1 + smallOffset) % 1;
        this.angle = this.time * Math.PI * 2;

        this.sun = new THREE.Vector3(0, 1, -1000);
        this.sun.x = Math.sin(this.angle) * 4000;
        this.sun.z = Math.cos(this.angle) * 4000;
        this.sun.y = Math.sin(this.angle) * 4000;
    }

    static getInstance(target: THREE.Object3D, scene: THREE.Scene, camera: THREE.Camera) {
        if (!DayNightCycle.instance) {
            DayNightCycle.instance = new DayNightCycle(target, scene, camera);
            DayNightCycle.refCount++;
        } else {
            DayNightCycle.instance.scene = scene;
            DayNightCycle.instance.target = target;
            DayNightCycle.instance.camera = camera;
            DayNightCycle.instance.startTime = Date.now();
            DayNightCycle.refCount++;
        }
        return DayNightCycle.instance;
    }

    static retain(): DayNightCycle | null {
        if (!DayNightCycle.instance) return null;
        DayNightCycle.refCount++;
        return DayNightCycle.instance;
    }

    static release(): void {
        if (!DayNightCycle.instance) return;
        if (DayNightCycle.refCount > 0) {
            DayNightCycle.refCount--;
        }
        if (DayNightCycle.refCount === 0) {
            DayNightCycle.instance.destroy();
            DayNightCycle.instance = null;
        }
    }

    static getUserCount(): number {
        return DayNightCycle.refCount;
    }

    static updateContext(target: THREE.Object3D, scene: THREE.Scene, camera: THREE.Camera): void {
        if (!DayNightCycle.instance) return;
        DayNightCycle.instance.target = target;
        DayNightCycle.instance.scene = scene;
        DayNightCycle.instance.camera = camera;
    }

    private destroy(): void {
        this.clearSky();

        this.target = undefined;
        this.enableDayNightCycle = false;
        EventBus.instance.send(BEHAVIOR_EVENTS.DAY_NIGHT_CYCLE, {
            enableDayNightCycle: false,
        });
    }

    createSky() {
        if (this.scene) {
            this.previousBackground = this.scene.background;
            this.previousBackgroundNode = (this.scene as any).backgroundNode;
            this.scene.background = null;
            (this.scene as any).backgroundNode = null;
        }

        this.sky = new SkyMesh();
        this.sky.name = `[DayNightCycle_SkyMesh]`;
        this.sky.scale.setScalar(450000);

        this.sky.onBeforeRender = (_renderer, _scene, camera) => {
            this.sky?.position.copy(camera.position);
            this.sky?.updateMatrixWorld(true);
        };

        // Initialize scattering parameters
        this.sky.turbidity.value = this.effectController.turbidity;
        this.sky.rayleigh.value = this.effectController.rayleigh;
        this.sky.mieCoefficient.value = this.effectController.mieCoefficient;
        this.sky.mieDirectionalG.value = this.effectController.mieDirectionalG;

        // Setup initial sun position
        this.sun = new THREE.Vector3(0, 1, -1000);
        this.sun.x = Math.sin(this.angle) * 4000;
        this.sun.z = Math.cos(this.angle) * 4000;
        this.sun.y = Math.sin(this.angle) * 4000;

        this.sky.sunPosition.value.copy(this.sun);
        this.sky.frustumCulled = false; // Sky dome should always render
        this.sky.renderOrder = 0;
        this.sky.userData.isRuntimeOnly = true;
        this.sky.userData.isSelectable = false;

        const root = getOrCreateDynamicRoot(this.scene);
        root.add(this.sky);
    }

    update(): void {
        const currentSceneID = global.app?.editor?.sceneID ?? null;
        if (this.previousSceneID !== null && currentSceneID === null) {
            this.clearSky();
        }

        this.previousSceneID = currentSceneID;

        if (this.sky) {
            if (this.scene.background !== null) {
                this.previousBackground = this.scene.background;
                this.scene.background = null;
            }
            if ((this.scene as any).backgroundNode !== null) {
                this.previousBackgroundNode = (this.scene as any).backgroundNode;
                (this.scene as any).backgroundNode = null;
            }
        }

        if (!this.target) {
            return;
        }

        const currentIsPlaying = global.app?.isPlaying ?? false;

        this.previousIsPlaying = currentIsPlaying;

        if (this.enableDayNightCycle && global.app?.isPlaying && !this.isPaused) {
            this.adjustedTime =
                (Date.now() - this.startTime - this.elapsedPauseTime) *
                this.baseSpeed *
                this.speedRatio *
                this.speedMultiplier;
            this.time = (this.adjustedTime % 1 + 1) % 1;
            this.angle = this.time * Math.PI * 2;

            const adjustedTime =
                (Date.now() - this.startTime - this.elapsedPauseTime) *
                this.baseSpeed *
                this.speedRatio *
                this.speedMultiplier;
            const time = (adjustedTime % 1 + 1) % 1;

            if (this.sun) {
                const angle = time * Math.PI * 2;

                this.sun.x = Math.sin(angle) * 4000;
                this.sun.z = Math.cos(angle) * 4000;
                this.sun.y = Math.sin(angle) * 4000;

                // Place the target (if DirectionalLight) at the sun position
                if (
                    !isExtendedDirectionalLight(this.target) && isDirectionalLight(this.target) ||
                    !(this.target as ExtendedDirectionalLight).isUnityStyle
                ) {
                    const shadow = (this.target as THREE.DirectionalLight).shadow;
                    const cameraFar = shadow.camera.far;
                    const cameraNear = shadow.camera.near;
                    // Use world position — camera may be under a transformed parent
                    this.camera.getWorldPosition(_camWorldPos);
                    this.target.position
                        .copy(this.sun)
                        .setLength((cameraFar - cameraNear) / 2)
                        .add(_camWorldPos);
                } else if (isExtendedDirectionalLight(this.target) && this.target.isUnityStyle) {
                    // lookAt(sun) makes -Z point toward the sun, so
                    // getWorldDirection() (+Z) points AWAY from sun = toward scene ✓
                    this.target.lookAt(this.sun);
                    // Recompute shadow camera placement for the new direction
                    this.target.updateLight();
                }

                // Update SkyMesh sun position
                if (this.sky) this.sky.sunPosition.value.copy(this.sun);

                // (Optional) could compute isDay or transition for ambient adjustments
                // const isDay = time < 0.5;
            }
        }
    }

    clearSky() {
        if (!this.scene) return;

        if (this.previousBackground !== undefined) {
            this.scene.background = this.previousBackground;
            this.previousBackground = undefined;
        }
        if (this.previousBackgroundNode !== undefined) {
            (this.scene as any).backgroundNode = this.previousBackgroundNode;
            this.previousBackgroundNode = undefined;
        }

        const sky = this.sky;
        if (!sky) return;

        if (sky.parent) {
            sky.parent.remove(sky);
        }
        if (sky.geometry) {
            sky.geometry.dispose();
        }
        const materials = Array.isArray(sky.material) ? sky.material : [sky.material];
        materials.forEach(material => {
            material.dispose();
        });

        const disposableSky = sky as unknown as {dispose?: () => void};
        if (disposableSky.dispose) {
            disposableSky.dispose();
        }

        this.sky = undefined;
    }

    setRotationSpeed(speed: number): void {
        if (speed < 0) {
            console.warn("DayNightCycle: Rotation speed cannot be negative");
            return;
        }
        this.speedMultiplier = speed;
    }

    getRotationSpeed(): number {
        return this.speedMultiplier;
    }

    pauseRotation(): void {
        this.isPaused = true;
    }

    resumeRotation(): void {
        this.isPaused = false;
    }

    toggleRotation(): void {
        this.isPaused = !this.isPaused;
    }

    isRotationPaused(): boolean {
        return this.isPaused;
    }

    setTimeOfDay(timeOfDay: number): void {
        if (timeOfDay < 0 || timeOfDay > 1) {
            console.warn("DayNightCycle: Time of day must be between 0 and 1 (0 = midnight, 0.5 = noon)");
            return;
        }
        this.time = timeOfDay;
        this.angle = this.time * Math.PI * 2;

        // Update sun position immediately
        if (this.sun) {
            this.sun.x = Math.sin(this.angle) * 4000;
            this.sun.z = Math.cos(this.angle) * 4000;
            this.sun.y = Math.sin(this.angle) * 4000;

            // Update sky uniforms
            if (this.sky) {
                this.sky.sunPosition.value.copy(this.sun);
            }
        }

        // Reset start time to maintain the new time
        this.startTime = Date.now();
        this.elapsedPauseTime = 0;
        this.adjustedTime = this.time;
    }

    getTimeOfDay(): number {
        return this.time;
    }

    setTimeOfDayFromHours(hours: number): void {
        if (hours < 0 || hours >= 24) {
            console.warn("DayNightCycle: Hours must be between 0 and 23.99");
            return;
        }
        const timeOfDay = hours / 24;
        this.setTimeOfDay(timeOfDay);
    }

    getTimeOfDayAsHours(): number {
        return this.time * 24;
    }
}

export default DayNightCycle;
