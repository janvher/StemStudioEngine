import type { BoxData, CapsuleData,
    CollisionRegistration,
    ConcaveHullData,
    ConvexHullData,
    IPhysics,
    IPlayerOptions,
    ModelData,
    Object3D,
    Quaternion,
    SphereData,
    TerrainData,
    Vector3} from "./common/types.js";
import {
    CollisionFlag
} from "./common/types.js";

export default // @ts-ignore - this is abstract class, so no need to declare all methods
abstract class PhysicsBase implements IPhysics {
    private readonly _isMultiplayer;
    private readonly _isWorker;
    private readonly _isLocal;

    private dynamicObjects = new Map<string, Object3D>();
    private kinematicObjects = new Map<string, Object3D>();

    protected constructor(isMultiplayer: boolean, isWorker: boolean, isLocal: boolean) {
        this._isMultiplayer = isMultiplayer;
        this._isWorker = isWorker;
        this._isLocal = isLocal;
    }

    getDynamicBodyObject(uuid: string): Object3D | undefined {
        return this.dynamicObjects.get(uuid);
    }

    getKinematicBodyObjects() {
        return this.kinematicObjects;
    }

    addObject(uuid: string, mass: number, collisionFlag: CollisionFlag, object: Object3D) {
        collisionFlag = this.getCollisionFlag(mass, collisionFlag);
        //map local objects for updates
        if (object) {
            if (collisionFlag === CollisionFlag.DYNAMIC) {
                this.dynamicObjects.set(uuid, object);
            } else if (collisionFlag === CollisionFlag.KINEMATIC) {
                this.kinematicObjects.set(uuid, object);
            }
        }
        return collisionFlag;
    }

    removeObject(uuid: string) {
        this.dynamicObjects.delete(uuid);
        this.kinematicObjects.delete(uuid);
    }

    isMultiplayer(): boolean {
        return this._isMultiplayer;
    }

    isWorker(): boolean {
        return this._isWorker;
    }

    isLocal(): boolean {
        return this._isLocal;
    }

    protected getCollisionFlag(mass: number, collisionFlag: CollisionFlag) {
        if (mass > 0) {
            collisionFlag = CollisionFlag.DYNAMIC;
        } else if (collisionFlag === CollisionFlag.KINEMATIC) {
            collisionFlag = CollisionFlag.KINEMATIC;
        } else {
            collisionFlag = CollisionFlag.STATIC;
        }
        return collisionFlag;
    }
}
