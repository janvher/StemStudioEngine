import * as THREE from "three";
import {AdditiveBlending, DoubleSide, MeshBasicMaterial} from "three";
import {
    ParticleEmitter,
    ParticleSystem,
    ConstantColor,
    ConstantValue,
    IntervalValue,
    type ParticleSystemParameters,
    PointEmitter,
    RenderMode,
    Vector4,
} from "three.quarks";

import {PLACEHOLDER_PREFIX, resolvePlaceholderIdentifier} from "./editor/assets/v2/CreateDashboard/GameOverview/placeholderThumbnails";
import {backendUrlFromPath} from "./utils/UrlUtils";

export const DEFAULT_PARTICLE_CONFIG: ParticleSystemParameters = {
    duration: 1,
    looping: true,
    startLife: new IntervalValue(1, 2),
    startSpeed: new IntervalValue(1, 3),
    startSize: new IntervalValue(0.1, 0.5),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
    worldSpace: false,
    emissionOverTime: new ConstantValue(10),
    emissionBursts: [
        {
            time: 0,
            count: new ConstantValue(2),
            cycle: 1,
            interval: 0.01,
            probability: 1,
        },
    ],

    shape: new PointEmitter(),
    material: new MeshBasicMaterial({
        blending: AdditiveBlending,
        transparent: true,
        side: DoubleSide,
    }),
    startTileIndex: new ConstantValue(81),
    renderMode: RenderMode.BillBoard,
    renderOrder: 2,
    autoDestroy: false,
    prewarm: false,
    onlyUsedByOther: false,
    rendererEmitterSettings: {},
    behaviors: [],
};

/**
 *
 */
export function createFreshParticleConfig(): ParticleSystemParameters {
    return {
        ...DEFAULT_PARTICLE_CONFIG,
        material: DEFAULT_PARTICLE_CONFIG.material.clone(),
        startLife: DEFAULT_PARTICLE_CONFIG.startLife!.clone(),
        startSpeed: DEFAULT_PARTICLE_CONFIG.startSpeed!.clone(),
        startSize: DEFAULT_PARTICLE_CONFIG.startSize!.clone(),
        startRotation: DEFAULT_PARTICLE_CONFIG.startRotation!.clone(),
        startColor: DEFAULT_PARTICLE_CONFIG.startColor!.clone(),
        emissionOverTime: DEFAULT_PARTICLE_CONFIG.emissionOverTime!.clone(),
        emissionBursts: DEFAULT_PARTICLE_CONFIG.emissionBursts!.map(burst => ({
            ...burst,
            count: burst.count.clone(),
        })),
        shape: DEFAULT_PARTICLE_CONFIG.shape!.clone(),
        rendererEmitterSettings: {...DEFAULT_PARTICLE_CONFIG.rendererEmitterSettings},
        behaviors: [...DEFAULT_PARTICLE_CONFIG.behaviors!],
    };
}

export const getThumbnail = (thumbnailUrl: string) => {
    if (thumbnailUrl === "null" || thumbnailUrl === "undefined" || !thumbnailUrl) return undefined;

    if (thumbnailUrl.startsWith(PLACEHOLDER_PREFIX)) {
        return resolvePlaceholderIdentifier(thumbnailUrl) ?? undefined;
    }

    return thumbnailUrl
        ? thumbnailUrl.includes("data:image") || thumbnailUrl.includes("src/editor")
            ? thumbnailUrl
            : backendUrlFromPath(thumbnailUrl)
        : undefined;
};

// VFX Related

export const isVFXParent = (object: THREE.Object3D<THREE.Object3DEventMap>) => {
    if (!object || Array.isArray(object) || !object.children || object.children.length === 0) return false;

    for (const child of object.children) {
        if (child instanceof ParticleEmitter) return true;
        if (isVFXParent(child)) return true;
    }

    return false;
};

const hasEmitterDeep = (object: THREE.Object3D): boolean => {
    for (const child of object.children) {
        if (child instanceof ParticleEmitter) return true;
        if (child instanceof ParticleSystem && (child as ParticleSystem).emitter) return true;
        if (hasEmitterDeep(child)) return true;
    }
    return false;
};

export const findTopVFXParent = (object: THREE.Object3D, scene: THREE.Scene | undefined): THREE.Object3D | null => {
    let current = object;
    let lastVFXParent: THREE.Object3D | null = null;

    while (current && current !== scene) {
        if (hasEmitterDeep(current)) {
            lastVFXParent = current; // remember last obj with emitter
        }
        current = current.parent!;
    }

    return lastVFXParent; // return top VFX parent
};

export const collectEmitters = (object: THREE.Object3D): Array<{emitter: ParticleEmitter; name: string}> => {
    const result: Array<{emitter: ParticleEmitter; name: string}> = [];

    const traverse = (obj: THREE.Object3D) => {
        if (obj instanceof ParticleEmitter) {
            result.push({emitter: obj, name: obj.name || "Unnamed Emitter"});
        }

        if (obj instanceof ParticleSystem && (obj as ParticleSystem).emitter) {
            const typeObj = obj as ParticleSystem;
            result.push({emitter: typeObj.emitter, name: typeObj.emitter.name || "Unnamed ParticleSystem Emitter"});
        }

        obj.children.forEach(child => traverse(child));
    };

    traverse(object);
    return result;
};

const parseBooleanFlag = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }
    return undefined;
};

const getAutoStartFromUserData = (userData: Record<string, unknown> | undefined): boolean | undefined => {
    if (!userData) return undefined;

    const autoStart = parseBooleanFlag(userData.autoStart);
    if (autoStart !== undefined) return autoStart;

    const autoplay = parseBooleanFlag(userData.autoplay);
    if (autoplay !== undefined) return autoplay;

    return parseBooleanFlag(userData.autoPlay);
};

export const isVFXAutoStartEnabled = (target?: THREE.Object3D | null): boolean => {
    if (!target) return false;

    const emitters = collectEmitters(target);
    if (emitters.length > 0 && !(target instanceof ParticleEmitter)) {
        return emitters.every(({emitter}) => isVFXAutoStartEnabled(emitter));
    }

    return getAutoStartFromUserData(target.userData as Record<string, unknown> | undefined) ?? true;
};

export const setVFXAutoStart = (target: THREE.Object3D | null | undefined, enabled: boolean): void => {
    if (!target) return;

    const apply = (object: THREE.Object3D) => {
        object.userData.autoStart = enabled;
        // Keep legacy key in sync so existing content continues to work.
        object.userData.autoplay = enabled;
        object.userData.autoPlay = enabled;
    };

    const emitters = collectEmitters(target);
    if (emitters.length > 0 && !(target instanceof ParticleEmitter)) {
        emitters.forEach(({emitter}) => apply(emitter));
        return;
    }

    apply(target);
};

export type ParticlePlayerActionType = "play" | "stop" | "pause";
export const allEmittersPlayer = (
    element: THREE.Object3D<THREE.Object3DEventMap>,
    action: ParticlePlayerActionType,
) => {
    if (!element) return;
    element.traverse(child => {
        if (child instanceof ParticleEmitter) {
            const system = child.system;
            if (system) {
                switch (action) {
                    case "play":
                        if (system.paused) {
                            system.play();
                        } else {
                            system.restart();
                        }
                        break;
                    case "pause":
                        system.pause();
                        break;
                    case "stop":
                        system.stop();
                        break;

                    default:
                        break;
                }
            }
        }
    });
};
