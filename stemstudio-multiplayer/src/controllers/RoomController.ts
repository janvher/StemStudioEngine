import Ammo from "../assets/js/libs/ammojs3/builds/ammo.js";
import type { Client, Room } from "@colyseus/core";
import PhysicsWorld from "../physics/PhysicsWorld.js";
import type {
    BoxData,
    CapsuleData,
    ConcaveHullData,
    ConvexHullData,
    IDispatcher,
    IPhysics,
    Object3D,
    ObjectMotionState,
    Quaternion,
    SphereData,
    Vector3
} from "../physics/common/types.js";
import { requestNextFrame } from "../physics/common/utils.js";
import { PHYSICS_EVENTS } from "../physics/common/events.js";
import GameApi from "../api/GameApi.js";
import BehaviorManager from "../behaviors/BehaviorManager.js";
import CollisionDetector from "../collisions/CollisionDetector.js";
import type { RoomCreateOptions } from "../rooms/GameRoom.js";
import type { GameRoomState, Player} from "../rooms/schema/GameRoomState.js";
import { GameObject, ObjectMotionStateSchema, SpawnPoint } from "../rooms/schema/GameRoomState.js";
import type IRoomController from "./IRoomController.js";

export default class RoomController implements IRoomController {
    room: Room;
    physics!: IPhysics;
    collisionDetector?: CollisionDetector;
    behaviourManager!: BehaviorManager;

    options: RoomCreateOptions;

    precision = 1000; //3 FP decimal places

    constructor(room: Room<GameRoomState>, options: RoomCreateOptions) {
        this.room = room;
        this.options = options;
    }

    onPlayerJoined(): void {
        //throw new Error("Method not implemented.");
    }

    start() {
        const round = (value: number) => {
            return Math.round(value * this.precision) / this.precision;
        };

        const dispatcher: IDispatcher = {
            onReady: () => {
            },
            onBodyUpdate: (uuid: string, position: Vector3, rotation: Quaternion, dt: number, motionState?: ObjectMotionState) => {
                //update room state
                const obj: GameObject | undefined = this.room.state.objects.get(uuid);
                if (obj === null) {
                    console.warn("onBodyUpdate: object is missing from the state: "+uuid);
                    return;
                }
                //avoid sending extra data
                const distance = Math.sqrt(Math.pow(obj.position.x - position.x, 2 ) + Math.pow(obj.position.y - position.y, 2) + Math.pow(obj.position.z - position.z, 2));
                if (distance > 0.01) { //TODO: make configurable
                    [obj.prevPosition.x, obj.prevPosition.y, obj.prevPosition.z] = [obj.position.x, obj.position.y, obj.position.z];
                    [obj.position.x, obj.position.y, obj.position.z] = [round(position.x), round(position.y), round(position.z)];
                    if (motionState !== null) {
                        if (obj.motionState === null) obj.motionState = new ObjectMotionStateSchema();
                        obj.motionState.onGround = motionState.onGround;
                        obj.motionState.linearVelocity.x = motionState.linearVelocity.x;
                        obj.motionState.linearVelocity.y = motionState.linearVelocity.y;
                        obj.motionState.linearVelocity.z = motionState.linearVelocity.z;
                    }
                }
                const dRot = Math.sqrt(Math.pow(obj.quaternion.x - rotation.x, 2 ) + Math.pow(obj.quaternion.y - rotation.y, 2) + Math.pow(obj.quaternion.z - rotation.z, 2) + Math.pow(obj.quaternion.w - rotation.w, 2));
                if (dRot > 0.01) {  //TODO: make configurable
                    [obj.prevQuaternion.x, obj.prevQuaternion.y, obj.prevQuaternion.z, obj.prevQuaternion.w] = [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w];
                    [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w] = [round(rotation.x), round(rotation.y), round(rotation.z), round(rotation.w)];
                }
            },
            onCollision: (uuid: string, listenerId: string) => {
                this.collisionDetector?.onCollisionViaPhysics({uuid, listenerId});
            }
        };

        //create world
        this.initPhysics(dispatcher, this.options.gravity ?? 0).then((physics) => {
            this.physics = physics;
            this.collisionDetector = new CollisionDetector(this.physics);
            this.behaviourManager = new BehaviorManager(this.physics, this.collisionDetector);
            //load scene data and add objects to the world
            this.addObjects().then(() => {
                this.room.state.ready = true;
                this.update();
            }).catch(() => {
                console.error("Add objects to physics failed. Room is unusable: "+this.room.roomName);
            });
        }).catch(err => {
            console.error("initPhysics failed", err);
        });
    }

    dispose() {
        if (this.physics !== null) {
            this.physics.terminate();
        }
        this.physics = null as unknown as IPhysics;
    }

    onBaseMessage(client: Client, type: string, message:  { uuid: string; data: unknown }): void {
        this.onMessage(client, type, message);
    }

    onMessage(client: Client, messageType: string, message: { uuid: string; data: unknown }) {
        //console.log("onMessage: ", client.id, messageType, message);
        switch (messageType) {
            case PHYSICS_EVENTS.ADD.BOX: {
                const data = message.data as BoxData & { template: string; name: string; position: Vector3; rotation: Quaternion };
                this.addGameObject(message.uuid, data.template, data.name, data.position, data.rotation);
                this.physics.addBox(null as unknown as Object3D, data);
                break;
            }
            case PHYSICS_EVENTS.ADD.CONVEXHULL: {
                const data = message.data as ConvexHullData & { template: string; name: string; position: Vector3; rotation: Quaternion };
                this.addGameObject(message.uuid, data.template, data.name, data.position, data.rotation);
                this.physics.addConvexHull(null as unknown as Object3D, data);
                break;
            }
            case PHYSICS_EVENTS.ADD.CAPSULE: {
                const data = message.data as CapsuleData & { template: string; name: string; position: Vector3; rotation: Quaternion };
                this.addGameObject(message.uuid, data.template, data.name, data.position, data.rotation);
                this.physics.addCapsuleShape(null as unknown as Object3D, data);
                break;
            }
            case PHYSICS_EVENTS.ADD.CONCAVEHULL: {
                const data = message.data as ConcaveHullData & { template: string; name: string; position: Vector3; rotation: Quaternion };
                this.addGameObject(message.uuid, data.template, data.name, data.position, data.rotation);
                this.physics.addConcaveHull(null as unknown as Object3D, data);
                break;
            }
            case PHYSICS_EVENTS.ADD.SPHERE: {
                const data = message.data as SphereData & { template: string; name: string; position: Vector3; rotation: Quaternion };
                this.addGameObject(message.uuid, data.template, data.name, data.position, data.rotation);
                this.physics.addSphere(null as unknown as Object3D, data);
                break;
            }
            case PHYSICS_EVENTS.REMOVE.RIGID_BODY: {
                this.physics.remove(message.uuid);
                const msgData = message as { uuid: string; physics_only?: boolean };
                if (!msgData.physics_only) {
                    this.room.state.objects.delete(msgData.uuid);
                }
                break;
            }
            case PHYSICS_EVENTS.SET.ORIGIN:
                this.physics.setOrigin(message.uuid, (message as any).position as Vector3);
                break;
            case PHYSICS_EVENTS.SET.ROTATION:
                this.physics.setRotation(message.uuid, (message as any).rotation as Quaternion);
                break;
            case PHYSICS_EVENTS.SET.LINEAR_VELOCITY:
                this.physics.setLinearVelocity(message.uuid, (message as any).velocity as Vector3);
                break;
            case PHYSICS_EVENTS.PLAYER.APPLY_IMPULSE:
                this.physics.applyCentralImpulse(message.uuid, (message as any).impulse as Vector3);
                break;
            case PHYSICS_EVENTS.PLAYER.SET_POSITION: // TODO: same as SET.ORIGIN, remove this?
                this.physics.setOrigin(message.uuid, (message as any).position as Vector3);
                break;
            case PHYSICS_EVENTS.PLAYER.ADD: {
                this.physics.addPlayerObject(message.uuid, (message as any).controller, (message as any).options);
                const player: Player | undefined = this.room.state.players.get(client.sessionId);
                if (player) {
                    player.uuid = message.uuid;
                    player.origin = (message as any).origin;

                    // get random spawn point
                    const spawnPoint = this.getRandomSpawnPoint();
                    if (spawnPoint) {
                        this.physics.setOrigin(message.uuid, spawnPoint.position);
                        this.physics.setRotation(message.uuid, spawnPoint.quaternion);
                    }
                } else {
                    console.warn("RC.onMessage.PLAYER.ADD: can't locate player state: " + client.id);
                }
                break;
            }
            case PHYSICS_EVENTS.PLAYER.REMOVE: {
                this.physics.removePlayerObject(message.uuid);
                break;
            }
            case PHYSICS_EVENTS.PLAYER.MOVE:
                this.physics.movePlayerObject(message.uuid, (message as any).direction as Vector3, (message as any).jump);
                break;
            case PHYSICS_EVENTS.ANIMATION.SET: {
                const player = this.findPlayerByProperty("uuid", message.uuid);
                if (player) {
                    player.animation = (message as any).animation;
                }
                break;
            }
            default:
                console.warn("Unsupported room message: "+messageType);
        }
    }

    onPlayerLeft(player: Player) {
        console.log("RC.onPlayerLeft: "+player.uuid);
        //player object is removed in GameRoom class
        this.physics.removePlayerObject(player.uuid);
        this.room.state.objects.delete(player.uuid);
    }

    findPlayerByProperty(prop: string, val: string): Player {
        for (const player of this.room.state.players.values()) {
            if (player[prop] === val) {
                return player;
            }
        }
        return null as any;
    }

    initPhysics(dispatcher: IDispatcher, gravity: number): Promise<IPhysics> {
        return new Promise<IPhysics>((resolve) => {
            Ammo().then((ammo) => {
                new PhysicsWorld(ammo, dispatcher, gravity).start().then((physics) => {
                    resolve(physics);
                });
            });
        });
    }

    addObjects() {
        return new Promise<void>((resolve, reject) => {
            GameApi.loadGame(this.room.roomName).then((result) => {
                return this.parseGameData(result.data as any[]).then(() => {
                    resolve();
                });
            }).catch(e => {
                console.error("Failed to load game: "+this.room.roomName, e);
                reject(e);
            });
        });
    }

    update = () => {
        if (!this.physics) return;
        this.physics.simulate();
        //use colesius scheduler
        requestNextFrame(this.update.bind(this));
    };

    parseGameData(jsons: any[]) {
        //add objects to the world
        const scene = jsons.filter((n: any) => n.metadata && n.metadata.generator === 'SceneSerializer')[0];

        const spawnPoints = jsons.filter((n: any) => n.userData && n.userData.isSpawnPoint === true);
        spawnPoints.forEach((spawnPoint: any) => {
            this.addSpawnPoint(spawnPoint.uuid, spawnPoint.position, spawnPoint.quaternion);
        });

        const sceneObjects = jsons.filter((n: any) => n !== scene);
        this.behaviourManager?.parseBehaviours(scene, sceneObjects, this.room.state);

        return Promise.resolve();
    }

    private addGameObject(uuid: string, template: string, name: string, position?: Vector3, quaternion?: Quaternion):GameObject {
        const gameObject = undefined as GameObject; //new GameObject(uuid, template, name, position, quaternion);

        if (position) {
            gameObject.position.x = position.x;
            gameObject.position.y = position.y;
            gameObject.position.z = position.z;
        }

        if (quaternion) {
            gameObject.quaternion.x = quaternion.x;
            gameObject.quaternion.y = quaternion.y;
            gameObject.quaternion.z = quaternion.z;
            gameObject.quaternion.w = quaternion.w;
        }

        this.room.state.objects.set(uuid, gameObject);

        return gameObject;
    }

    private addSpawnPoint(uuid: string, position: Vector3, quaternion: Quaternion) {
        const spawnPosition = {x: position.x, y: position.y, z: position.z};
        const spawnQuaternion = quaternion ? {x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w} : {x: 0, y: 0, z:0, w:1};
        const spawnPoint = new SpawnPoint(spawnPosition, spawnQuaternion);
        this.room.state.spawnPoints.set(uuid, spawnPoint);
    }

    private getRandomSpawnPoint(): SpawnPoint {
        const spawnPoints = this.room.state.spawnPoints;
        if (spawnPoints.size === 0) {
            return null;
        }
        const keys = Array.from(spawnPoints.keys());
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return spawnPoints.get(randomKey);
    }
}
