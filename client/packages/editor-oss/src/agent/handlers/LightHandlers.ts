import * as THREE from "three";

import EngineRuntime from "../../EngineRuntime";
import * as Commands from "../../command/Commands";
import {CommandResult} from "../types/ACPTypes";

/**
 * Light property command handlers for CommandsRegistry
 */
export class LightHandlers {
    constructor(private engine: EngineRuntime) {}

    handleSetLightProperties({
        target,
        intensity,
        color,
        castShadow,
        shadowMapSize,
        shadowBias,
        shadowNormalBias,
        shadowRadius,
    }: {
        target: string;
        intensity?: number;
        color?: string;
        castShadow?: boolean;
        shadowMapSize?: number;
        shadowBias?: number;
        shadowNormalBias?: number;
        shadowRadius?: number;
    }): CommandResult {
        const object = this.findObject(target);
        if (!object) {
            return {status: "failed", message: `Object not found: ${target}`, data: null};
        }
        if (!(object as any).isLight) {
            return {status: "failed", message: `"${target}" is not a light object.`, data: null};
        }

        if (color !== undefined) {
            new Commands.SetColorCommand(object, "color", new THREE.Color(color).getHex()).execute();
        }
        if (intensity !== undefined) {
            new Commands.SetValueCommand(object, "intensity", intensity).execute();
        }
        if (castShadow !== undefined) {
            new Commands.SetValueCommand(object, "castShadow", castShadow).execute();
        }

        // Shadow properties — only if light supports shadows
        if (shadowMapSize !== undefined && (object as any).shadow) {
            (object as any).shadow.mapSize.set(shadowMapSize, shadowMapSize);
            (object as any).shadow.needsUpdate = true;
        }
        if (shadowBias !== undefined && (object as any).shadow) {
            (object as any).shadow.bias = shadowBias;
        }
        if (shadowNormalBias !== undefined && (object as any).shadow) {
            (object as any).shadow.normalBias = shadowNormalBias;
        }
        if (shadowRadius !== undefined && (object as any).shadow) {
            (object as any).shadow.radius = shadowRadius;
        }

        this.engine.call("objectChanged", this.engine.editor, object);

        return {
            status: "success",
            message: `Light properties updated on "${object.name}"`,
            data: {
                uuid: object.uuid,
                name: object.name,
                type: object.type,
                intensity: (object as any).intensity,
                color: `#${(object as any).color?.getHexString?.() ?? "ffffff"}`,
                castShadow: (object as any).castShadow,
            },
        };
    }

    handleGetLightSettings({target}: {target: string}): CommandResult {
        const object = this.findObject(target);
        if (!object) {
            return {status: "failed", message: `Object not found: ${target}`, data: null};
        }
        if (!(object as any).isLight) {
            return {status: "failed", message: `"${target}" is not a light object.`, data: null};
        }

        const light = object as THREE.Light & {
            shadow?: THREE.LightShadow;
            intensity?: number;
            color?: THREE.Color;
            castShadow?: boolean;
        };

        return {
            status: "success",
            message: `Light settings for "${object.name || target}" retrieved successfully`,
            data: {
                uuid: object.uuid,
                name: object.name,
                type: object.type,
                intensity: light.intensity,
                color: `#${light.color?.getHexString?.() ?? "ffffff"}`,
                castShadow: light.castShadow,
                transform: {
                    position: {x: object.position.x, y: object.position.y, z: object.position.z},
                    rotation: {x: object.rotation.x, y: object.rotation.y, z: object.rotation.z, order: object.rotation.order},
                    scale: {x: object.scale.x, y: object.scale.y, z: object.scale.z},
                },
                shadow: light.shadow
                    ? {
                        mapSize: {
                            width: light.shadow.mapSize.width,
                            height: light.shadow.mapSize.height,
                        },
                        bias: light.shadow.bias,
                        normalBias: light.shadow.normalBias,
                        radius: light.shadow.radius,
                    }
                    : null,
            },
        };
    }

    private findObject(identifier: string): THREE.Object3D | null {
        let object = this.engine.scene.getObjectByProperty("uuid", identifier);
        if (!object) {
            object = this.engine.scene.getObjectByName(identifier);
        }
        if (!object) {
            const lower = identifier.toLowerCase();
            const expectedType = `${lower}light`;
            this.engine.scene.traverse(candidate => {
                if (object) return;
                if (!(candidate as any).isLight) return;
                const candidateType = (candidate.type || "").toLowerCase();
                if (candidateType === expectedType || candidateType.startsWith(lower)) {
                    object = candidate;
                }
            });
        }
        return object || null;
    }
}
