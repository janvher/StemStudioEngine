import * as THREE from "three";

import { ObjectSettings } from "./BehaviorConfig";
import global from "@stem/editor-oss/global";
import { BodyShapeType } from "../../physics/common/types";
import { PhysicsUtil } from "../../physics/PhysicsUtil";
import ShadowUtils from "@stem/editor-oss/utils/ShadowUtils";
import { CollisionType } from "../assets/v2/types/physics";

/**
 * Class for applying object settings from the behavior configuration
 */
class BehaviorObjectSettingsApplier {
    private static readonly PRIMITIVE_GEOMETRY_TO_COLLIDER: Record<string, BodyShapeType> = {
        BoxGeometry: BodyShapeType.BOX,
        SphereGeometry: BodyShapeType.SPHERE,
        CapsuleGeometry: BodyShapeType.CAPSULE,
        PlaneGeometry: BodyShapeType.BOX,
        CylinderGeometry: BodyShapeType.BOX,
        ConeGeometry: BodyShapeType.BOX,
        TetrahedronGeometry: BodyShapeType.BOX,
        TorusGeometry: BodyShapeType.BOX,
        TorusKnotGeometry: BodyShapeType.BOX,
        IcosahedronGeometry: BodyShapeType.BOX,
        OctahedronGeometry: BodyShapeType.BOX,
        DodecahedronGeometry: BodyShapeType.BOX,
        RingGeometry: BodyShapeType.BOX,
    };
    
    static applyObjectSettings(object: THREE.Object3D, objectSettings?: ObjectSettings): void {
        if (!objectSettings) {
            return;
        }

        if (objectSettings.visibility) {
            this.applyVisibilitySettings(object, objectSettings.visibility);
        }

        if (objectSettings.physics) {
            this.applyPhysicsSettings(object, objectSettings.physics);
        }

        if (objectSettings.lighting) {
            this.applyLightingSettings(object, objectSettings.lighting);
        }

        global.app?.call("objectChanged", this, object);
    }

    private static applyVisibilitySettings(object: THREE.Object3D, visibilitySettings: ObjectSettings['visibility']): void {
        if (!visibilitySettings) return;
        
        if (visibilitySettings.visible !== undefined) {
            object.visible = visibilitySettings.visible;
        }
        
        if (visibilitySettings.backfaceCulling !== undefined) {
            if (object instanceof THREE.Mesh) {
                object.material.side = visibilitySettings.backfaceCulling ? THREE.FrontSide : THREE.DoubleSide;
            }
        }
    }

    private static applyPhysicsSettings(object: THREE.Object3D, physicsSettings: ObjectSettings['physics']): void {
        if (!physicsSettings) return;

        if (!object.userData.physics) {
            object.userData.physics = {
                enabled: false,
            };
        }

        if (physicsSettings.enabled !== undefined) {
            object.userData.physics.enabled = physicsSettings.enabled;
        }
        
        if (physicsSettings.mass !== undefined) {
            object.userData.physics.mass = physicsSettings.mass;
        }
        
        if (physicsSettings.type !== undefined) {
            const typeMap: Record<string, CollisionType> = {
                'dynamic': CollisionType.Dynamic,
                'static': CollisionType.Static,
                'kinematic': CollisionType.Kinematic,
            };
            object.userData.physics.ctype = typeMap[physicsSettings.type];
        }
        
        if (physicsSettings.shape !== undefined) {
            const shapeMap: Record<string, BodyShapeType> = {
                'box': BodyShapeType.BOX,
                'sphere': BodyShapeType.SPHERE,
                'capsule': BodyShapeType.CAPSULE,
                'convex': BodyShapeType.CONVEX_HULL,
                'concave': BodyShapeType.CONCAVE_HULL,
            };
            const requestedShape = shapeMap[physicsSettings.shape];
            const inferredPrimitiveShape =
                requestedShape === BodyShapeType.CAPSULE
                    ? this.getPrimitiveColliderShape(object)
                    : null;

            object.userData.physics.shape = inferredPrimitiveShape ?? requestedShape;
            PhysicsUtil.updateShapeOffsetAndScale(object);
        }
    }

    private static getPrimitiveColliderShape(object: THREE.Object3D): BodyShapeType | null {
        const meshWithGeometry = this.findFirstMeshWithGeometry(object);
        if (!meshWithGeometry) {
            return null;
        }

        return this.PRIMITIVE_GEOMETRY_TO_COLLIDER[meshWithGeometry.geometry.type] ?? null;
    }

    private static findFirstMeshWithGeometry(object: THREE.Object3D): THREE.Mesh | null {
        if (object instanceof THREE.Mesh && object.geometry) {
            return object;
        }

        let foundMesh: THREE.Mesh | null = null;
        object.traverse(child => {
            if (!foundMesh && child instanceof THREE.Mesh && child.geometry) {
                foundMesh = child;
            }
        });

        return foundMesh;
    }

    private static applyLightingSettings(object: THREE.Object3D, lightingSettings: ObjectSettings['lighting']): void {
        if (!lightingSettings) return;
        
        if (object instanceof THREE.Mesh) {
            if (lightingSettings.castShadows !== undefined) {
                ShadowUtils.applyCastShadow(object, lightingSettings.castShadows, true);
            }
            
            if (lightingSettings.receiveShadows !== undefined) {
                ShadowUtils.applyReceiveShadow(object, lightingSettings.receiveShadows, true);
            }
        }
    }
}

export default BehaviorObjectSettingsApplier;
