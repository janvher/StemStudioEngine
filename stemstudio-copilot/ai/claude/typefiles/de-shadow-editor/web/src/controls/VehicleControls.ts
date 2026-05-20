import * as THREE from "three";
import {AnimationAction, AnimationMixer, Box3, Camera, Object3D, Quaternion, Scene, Vector3} from "three";

import Ammo from "../../assets/js/ammo/ammo.wasm";
import EventBus from "../behaviors/event/EventBus";
import GameManager, {IControl} from "../behaviors/game/GameManager";
import {GAME_GRAVITY_DEFAULT} from "../constants/game";
import {EffectsManager} from "../editor/effects/EffectsManager";
import global from "../global";
import {CameraControl} from "./CameraControl";
import {CollisionFlag, IPhysics, SphereData} from "../physics/common/types";
import ConvexHullGenerator from "../physics/ConvexHullGenerator";
import {PhysicsUtil} from "../physics/PhysicsUtil";
import {
    // OBJECT_TYPES,
    CAMERA_TYPES,
} from "../types/editor";
import {setManagedTimeout} from "../utils/ModeExitCleaner";

//TODO needs to be re-factored and most of this will be moved to character behavior
//but it has special requirements for physics integration for suspension, engine, tires etc.

const keysMapping: Record<number, string> = {
    87: "acceleration",
    83: "braking",
    65: "left",
    68: "right",
    27: "Escape",
};

export default class VehicleControls implements IControl {
    chatActivated: boolean;
    physics: IPhysics;
    scene: Scene;
    camera: Camera;
    domElement: HTMLElement;
    player: Object3D;
    animations: any[] = [];
    mixer: AnimationMixer | null = null;
    actions: any;
    currentAction: string | undefined;
    game?: GameManager;
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuarternion = new THREE.Quaternion();
    private requestAnimationFrameId: number;
    isPhysicsEnabled = false;

    bbox = new Box3();
    vec = new Vector3();

    updateVehicle: () => void;
    time: number;

    keysPressed: Record<string, boolean> = {
        acceleration: false,
        braking: false,
        left: false,
        right: false,
        Escape: false,
    };

    gamePaused = true;

    CameraControl: CameraControl | null;

    jumpCount = 0;
    lastJumpTime = 0;

    jump_strength: number;
    jump_duration: number;
    jumpStrength: number;
    playerGravity: number;

    cameraMINDistance: number;
    cameraMAXDistance: number;

    newAction: string | undefined;

    isJumping: boolean;
    spaceBarCooldown: boolean;
    isStopped: boolean = true;

    private effectsManager: any;
    muzzle_flash: boolean;
    laser_effect: boolean;

    //required for shoot or throw a throwable
    vehicle_selected_throwable: Object3D | undefined;
    vehicle_throwable_weight: number | undefined;
    vehicle_throwable_powerLevel: number | undefined;
    vehicle_throwable_bounceEffect: number | undefined;
    vehicle_throwable_aimer: number | undefined;
    vehicle_throwable_aimerGuide: string | undefined;
    vehicle_throwableVisible: string | undefined;
    vehicle_throwable_scale: number | undefined;
    vehicle_throwableMass: string | undefined;
    vehicle_throwableSpeed: number | undefined;
    vehicle_throwableLife: number | undefined;
    vehicle_throwableFriction: number | undefined;
    vehicle_throwableRestitution: number | undefined;
    vehicle_throwableInertia: number | undefined;

    throwables: THREE.Object3D[] = [];
    throwableRigidBodies = [];

    playerFallingBack: boolean;
    playerIsDead: boolean;

    private ammo: any = null;
    private DISABLE_DEACTIVATION: number = 4;
    private TRANSFORM_AUX: Ammo.btTransform | null = null;
    private ZERO_QUATERNION: THREE.Quaternion = new THREE.Quaternion(0, 0, 0, 1);

    private leftFrontWheel: string;
    private rightFrontWheel: string;
    private leftRearWheel: string;
    private rightRearWheel: string;
    private steeringWheel: string | undefined;
    private acceleration: number | undefined;
    private maxSpeed: number | undefined;
    private trackModel: string;
    private trackSurface: string | undefined;
    private trackBoundary: string | undefined;
    private engineHorsepower: number | undefined;
    private tireFriction: number | undefined;
    private brakeForce: number;
    private clock: THREE.Clock;
    private materialDynamic: THREE.Material | undefined;
    private materialStatic: THREE.Material | undefined;
    private materialRamp: THREE.Material | undefined;
    private materialInteractive: THREE.Material | undefined;
    private physicsWorld: Ammo.btDiscreteDynamicsWorld | null = null;
    private wheelMeshes: any[];
    private syncList: any[];
    private wheelsFound: boolean;

    constructor(
        physics: IPhysics,
        scene: Scene,
        camera: Camera,
        domElement: HTMLElement,
        model: Object3D,
        animations: any[],
    ) {
        this.actions = {};
        this.physics = physics;
        this.scene = scene;
        this.camera = camera;

        this.domElement = domElement;
        this.player = model;
        this.animations = animations;

        this.isPhysicsEnabled = PhysicsUtil.isPhysicsEnabled(this.player);

        this.isJumping = false;
        this.spaceBarCooldown = false;

        this.chatActivated = false;

        const cameraData = this.camera.userData.cameraData;

        this.jump_strength = cameraData.VehicleOptions.jump_strength;
        this.jump_duration = cameraData.VehicleOptions.jump_duration;
        this.jumpStrength = cameraData.VehicleOptions.jumpStrength;
        this.playerGravity = cameraData.VehicleOptions.playerGravity;

        this.cameraMAXDistance = cameraData.VehicleOptions.cameraMAXDistance;
        this.cameraMINDistance = cameraData.VehicleOptions.cameraMINDistance;

        this.playerFallingBack = false;
        this.playerIsDead = false;

        this.CameraControl = null;

        this.wheelMeshes = [];
        this.syncList = [];

        this.wheelsFound = false;
        this.brakeForce = 100;

        global.app!.on("gameStarted.VehicleControls", this.handleGameStarted);
        global.app!.on("gameEnded.VehicleControls", this.handleGameEnded);
        global.app!.on("pauseGame.VehicleControls", this.handleGamePaused);
        global.app!.on("chatActivated.VehicleControls", this.handleActiveChat);
        global.app!.on("chatDeactivated.VehicleControls", this.handleDeactivatedChat);

        this.effectsManager = EffectsManager.reset(this.scene, this.camera);
        this.muzzle_flash = false;
        this.laser_effect = false;

        this.leftFrontWheel = "Tire_LF";
        this.rightFrontWheel = "Tire_RF";
        this.leftRearWheel = "Tire_LR";
        this.rightRearWheel = "Tire_LR";

        this.clock = new THREE.Clock();
        this.time = 0;
        this.requestAnimationFrameId = -1;

        this.trackModel = "";

        // scene.traverse((currentThrowable: any) => {
        //     if (currentThrowable && currentThrowable.userData && currentThrowable.userData.behaviors) {
        //         const throwableBehavior = currentThrowable.userData.behaviors.find(
        //             (behavior: any) => behavior.type === OBJECT_TYPES.THROWABLE,
        //         );
        //         if (throwableBehavior) {
        //             this.vehicle_selected_throwable = currentThrowable;
        //             this.vehicle_throwable_weight = throwableBehavior.weight;
        //             this.vehicle_throwable_powerLevel = throwableBehavior.powerLevel;
        //             this.vehicle_throwable_bounceEffect = throwableBehavior.bounceEffect;
        //             this.vehicle_throwable_aimer = throwableBehavior.aimer;
        //             this.vehicle_throwable_aimerGuide = throwableBehavior.aimerGuide;
        //             this.vehicle_throwableVisible = throwableBehavior.throwableVisible;
        //             this.vehicle_throwableMass = throwableBehavior.throwableMass;
        //             this.vehicle_throwableSpeed = throwableBehavior.throwableSpeed;
        //             this.vehicle_throwableLife = throwableBehavior.throwableLife;
        //             this.vehicle_throwableFriction = throwableBehavior.throwableFriction;
        //             this.vehicle_throwableRestitution = throwableBehavior.throwableRestitution;
        //             this.vehicle_throwableInertia = throwableBehavior.throwableInertia;
        //             this.muzzle_flash = throwableBehavior.muzzle_flash;
        //             this.laser_effect = throwableBehavior.laser_effect;

        //             if ((global?.app as any)?.storage?.debug) {
        //                 console.log("Vehicle Character Throwable Behavior Details: " + this.vehicle_selected_throwable);
        //                 for (const key in throwableBehavior) {
        //                     console.log(`${key}:`, throwableBehavior[key]);
        //                 }
        //             }
        //         }
        //     }
        // });

        if (global && global.app) {
            global.app.on("playerFallBack", this.setPlayerFallBack.bind(this));
            global.app.on("playerDead", this.setPlayerIsDead.bind(this));
        }

        this.updateVehicle = () => {};

        this.animate();
    }

    create(): Promise<VehicleControls> {
        return new Promise((resolve, reject) => {
            if (this.isPhysicsEnabled) {
                this.physics
                    ?.addPlayerObject(this.player.uuid, true, {
                        playerGravity: this.playerGravity,
                        jumpHeight: this.jumpSpeed,
                    })
                    .then(playerObject => {
                        this.player = playerObject ? playerObject : this.player;
                        this.animations =
                            this.player._obj && this.player._obj.animations ? this.player._obj.animations : [];
                        this.init()
                            .then(() => {
                                resolve(this);
                            })
                            .catch(err => {
                                reject(err);
                            });
                    });
            } else {
                reject("Physics is not enabled for this vehicle object");
            }
        });
    }

    init(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.mixer = this.animations.length > 0 ? new THREE.AnimationMixer(this.player) : null;
            this.actions = this.initializeActions();
            this.currentAction = this.camera.userData.cameraData.VehicleOptions.idleAnimation;
            if (this.currentAction && this.actions[this.currentAction]) {
                this.playCurrentAnimation();
            }

            if (this.player.userData && this.player.userData.behaviors) {
                const characterBehavior = this.player.userData.behaviors.find(
                    (behavior: any) => behavior.id === "character" && behavior.controlType === CAMERA_TYPES.VEHICLE,
                );

                if (characterBehavior) {
                    this.CameraControl = null;
                    switch (characterBehavior.controlType) {
                        case CAMERA_TYPES.VEHICLE:
                            if ((global?.app as any)?.storage?.debug) {
                                console.log("Character type:" + CAMERA_TYPES.VEHICLE);
                            }
                            this.setOptionsFromCamera();
                            this.CameraControl = CameraControl.reset(
                                this.scene,
                                this.camera as THREE.PerspectiveCamera,
                                this.player,
                                true,
                                false,
                                this.cameraMINDistance,
                                this.cameraMAXDistance,
                            );
                            break;
                    }
                } else {
                    console.log("Character type not found");
                    reject("Character type not found");
                    return;
                }
            } else {
                console.log("Player userData or behaviors not defined");
                reject("Player userData or behaviors not defined");
                return;
            }
            resolve();
        });
    }

    private playCurrentAnimation(previousAction: AnimationAction | null = null) {
        if (!this.currentAction || !this.actions[this.currentAction]) {
            /*console.warn(
                "FPS.playCurrentAnimation: current action is not set correctly: ",
                this.currentAction,
                this.actions[this.currentAction!],
                this.actions,
            );*/
            return;
        }
        this.physics.setCurrentAnimation(this.player.uuid, this.actions[this.currentAction].getClip().name);
        if (previousAction) {
            previousAction.fadeOut(0.5); //TODO add to props
            this.actions[this.currentAction].reset().fadeIn(0.5).play(); //TODO add to props
        } else {
            this.actions[this.currentAction].play();
        }
    }

    // IControl

    getPlayerObject(): Object3D {
        return this.player;
    }

    private fireThrowable = () => {
        //TODO move to physics fps and 3pc

        if (!this.physics && !this.vehicle_selected_throwable) {
            return;
        }

        let throwableSize = Number(this.vehicle_throwable_scale);
        let throwableMass = Number(this.vehicle_throwableMass);
        let throwableSpeed = Number(this.vehicle_throwableSpeed);
        let throwableLife = this.vehicle_throwableLife;

        let playerPosition = this.player.position.clone();
        let playerRotation = this.player.quaternion.clone();

        let direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion).normalize();

        let throwableMesh = this.createThrowableAndAddToPhysics(
            throwableSize,
            playerPosition,
            playerRotation,
            direction,
            throwableMass,
            throwableSpeed,
        );

        if (!throwableMesh!.userData) {
            throwableMesh!.userData = {};
        }

        throwableMesh!.userData.direction = direction;
        throwableMesh!.userData.speed = throwableSpeed;
        throwableMesh!.userData.life = throwableLife;

        this.throwables.push(throwableMesh!);

        setManagedTimeout(() => {
            this.disposeThrowable(throwableMesh);
        }, throwableLife! * 1000);
    };

    private updateThrowable(delta: number) {
        //TODO move to physics fps and 3pc
        for (let i = 0; i < this.throwables.length; i++) {
            let throwableMesh = this.throwables[i];

            let currentDirection = throwableMesh.userData.direction;
            let currentSpeed = throwableMesh.userData.speed;

            let previousDirection = throwableMesh.userData.previousDirection;
            let previousSpeed = throwableMesh.userData.previousSpeed;

            if (
                currentDirection &&
                currentSpeed &&
                (currentDirection !== previousDirection || currentSpeed !== previousSpeed)
            ) {
                throwableMesh.userData.previousDirection = currentDirection;
                throwableMesh.userData.previousSpeed = currentSpeed;

                this.physics.setLinearVelocity(throwableMesh.uuid, {
                    x: currentDirection.x * currentSpeed,
                    y: currentDirection.y * currentSpeed,
                    z: currentDirection.z * currentSpeed,
                } as Vector3);
            }

            if (this.laser_effect) {
                this.effectsManager.createThrowableLaserEffect(1, 10, throwableMesh);
            }
        }
    }

    private createThrowableAndAddToPhysics(
        position: Vector3,
        rotation: Quaternion,
        direction: Vector3,
        mass: number,
        throwableSpeed: number,
    ): Object3D | null {
        const offsetDistance = 1 + 1 / 2;
        let startPosition = new THREE.Vector3().copy(position);
        startPosition.addScaledVector(direction, offsetDistance);

        if (this.muzzle_flash) {
            this.effectsManager.createMuzzleFlash(startPosition, this.camera);
        }

        //create throwable and add tothis.scene
        let throwableObject;
        if (this.vehicle_selected_throwable) {
            //throw something
            throwableObject = this.vehicle_selected_throwable;
        }
        if (throwableObject) {
            let clonedThrowable = throwableObject.clone();

            clonedThrowable.position.copy(this.player.position);
            let angle = Math.atan2(direction.x, direction.z);
            clonedThrowable.rotation.set(0, angle, 0);
            clonedThrowable.visible = true;
            this.scene.add(clonedThrowable);

            //add to physics
            this.bbox.setFromObject(clonedThrowable);
            let radius = this.bbox.getSize(this.vec).length() * 0.2;
            let sphereData: SphereData = {
                uuid: clonedThrowable.uuid,
                radius: radius,
                position: {
                    x: startPosition.x,
                    y: startPosition.y,
                    z: startPosition.z,
                },
                quaternion: {
                    x: rotation.x,
                    y: rotation.y,
                    z: rotation.z,
                    w: rotation.w,
                },
                mass: mass,
                friction: this.vehicle_throwableFriction,
                restitution: this.vehicle_throwableRestitution,
                collision_flag: CollisionFlag.DYNAMIC,
                template: throwableObject.uuid,
            } as SphereData;

            this.physics.addSphere(clonedThrowable, sphereData);
            this.physics.addCollidableObject(clonedThrowable.uuid);
            this.physics.setLinearVelocity(clonedThrowable.uuid, {
                x: direction.x * throwableSpeed,
                y: direction.y * throwableSpeed,
                z: direction.z * throwableSpeed,
            } as Vector3);

            return clonedThrowable;
        } else {
            if ((global?.app as any)?.storage?.debug) {
                console.error("Object selected throwable not found in the scene.");
            }
        }

        return null;
    }

    disposeThrowable(throwableMesh: any) {
        if (this.scene && throwableMesh && this.physics) {
            this.scene.remove(throwableMesh);
            try {
                //investigate
                this.physics.remove(throwableMesh.uuid);
            } catch {}
            this.throwables = this.throwables.filter(o => o.uuid !== throwableMesh.uuid);
        }
    }

    initializeActions(): {} {
        const actions: any = {};
        if (!this.mixer) return actions;

        const actionNames = this.camera.userData.cameraData.VehicleOptions.animationNames || {};

        for (const actionName in actionNames) {
            const clip =
                THREE.AnimationClip.findByName(this.animations, actionNames[actionName]) ||
                THREE.AnimationClip.findByName(this.animations, actionNames[actionName.toLowerCase()]);
            if (clip) {
                actions[actionName] = this.mixer.clipAction(clip);
                actions[actionName].clampWhenFinished = true;
            }
        }
        return actions;
    }

    private bindEventListeners = () => {
        document.addEventListener("keydown", this.handleKeyDown);
        document.addEventListener("keyup", this.handleKeyUp);
        document.addEventListener("mousedown", this.handleMouseDown);
    };

    private unbindEventListeners = () => {
        document.removeEventListener("keydown", this.handleKeyDown);
        document.removeEventListener("keyup", this.handleKeyUp);
        document.removeEventListener("mousedown", this.handleMouseDown);
    };

    private handleKeyDown = (event: KeyboardEvent) => {
        const key = keysMapping[event.keyCode];
        if (key && this.keysPressed.hasOwnProperty(key)) {
            this.keysPressed[key] = true;
        }

        if (this.keysPressed.Escape) {
            if (!this.gamePaused) {
                global.app!.call("pauseGame");
                document.querySelectorAll("*").forEach(element => {
                    (element as HTMLElement).style.cursor = "default";
                });
            }
        }
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        const key = keysMapping[event.keyCode];
        if (key && this.keysPressed.hasOwnProperty(key)) {
            this.keysPressed[key] = false;
        }
    };

    private handleMouseDown = (event: MouseEvent) => {
        if (event.button === 0) {
            this.fireThrowable();
        }
    };

    private handleActiveChat = (): void => {
        this.chatActivated = true;
    };
    private handleDeactivatedChat = (): void => {
        this.chatActivated = false;
    };

    private handleGamePaused = () => {
        this.gamePaused = true;
        EventBus.instance.send("game.pause");
    };

    private handleGameStarted = () => {
        global.app!.call("lockEvent");
        this.gamePaused = false;
        this.checkControlType();
    };

    private handleGameEnded = (): void => {
        this.gamePaused = true;
        this.CameraControl?.unlockPointerLock();
        this.resetKeysPressed();
        this.unbindEventListeners();
        document.querySelectorAll("*").forEach(element => {
            (element as HTMLElement).style.cursor = "default";
        });
    };

    private checkControlType = () => {
        const type = this.camera.userData.cameraData.cameraType;
        if (type !== "Vehicle") {
            this.unbindEventListeners();
        } else {
            this.bindEventListeners();
        }
    };

    animate = () => {
        this.update();
        this.requestAnimationFrameId = requestNextFrame(this.animate.bind(this));
    };

    update = () => {
        if (!this.player || !this.isPhysicsEnabled || this.chatActivated) {
            return;
        }

        if (this.physicsWorld && this.ammo) {
            this.updateVehicle();
        }
    };

    stopAnimation = () => {
        cancelAnimationFrame(this.requestAnimationFrameId);
        this.requestAnimationFrameId = -1;
    };

    setPlayerFallBack() {
        this.playerFallingBack = true;
    }

    setPlayerIsDead() {
        this.playerIsDead = true;
    }

    resetKeysPressed() {
        for (const key in this.keysPressed) {
            if (this.keysPressed.hasOwnProperty(key)) {
                this.keysPressed[key] = false;
            }
        }
    }

    dispose() {
        this.unbindEventListeners();
        this.stopAnimation();
        this.requestAnimationFrameId = -1;

        if (global.app) {
            global.app.on("playerFallBack", this.setPlayerFallBack.bind(this));
            global.app.on("playerDead", this.setPlayerIsDead.bind(this));
            global.app.on("gameStarted.VehicleControls", this.handleGameStarted);
            global.app.on("gameEnded.VehicleControls", this.handleGameEnded);
            global.app.on("pauseGame.VehicleControls", this.handleGamePaused);
            global.app.on("chatActivated.VehicleControls", null);
            global.app.on("chatDeactivated.VehicleControls", null);
        }

        if (this.mixer) {
            this.mixer.stopAllAction();
        }

        for (let i = 0; i < this.throwables.length; i++) {
            const throwable = this.throwables[i];
            this.disposeThrowable(throwable);
        }
        this.throwables = [];

        this.CameraControl?.dispose();
    }

    setOptionsFromCamera() {
        if (this.camera && this.camera.userData.cameraData && this.camera.userData.cameraData.VehicleOptions) {
            const {VehicleOptions} = this.camera.userData.cameraData;

            this.leftFrontWheel = VehicleOptions.leftFrontWheel?.value || "Tire_LF";
            this.rightFrontWheel = VehicleOptions.rightFrontWheel?.value || "Tire_RF";
            this.leftRearWheel = VehicleOptions.leftRearWheel?.value || "Tire_LR";
            this.rightRearWheel = VehicleOptions.rightRearWheel?.value || "Tire_RR";
            this.steeringWheel = VehicleOptions.steeringWheel?.value || "";
            this.acceleration = VehicleOptions.acceleration || 0;
            this.maxSpeed = VehicleOptions.maxSpeed || 0;
            this.trackModel = VehicleOptions.trackModel || "";
            this.trackSurface = VehicleOptions.trackSurface || "";
            this.trackBoundary = VehicleOptions.trackBoundary;
            this.engineHorsepower = VehicleOptions.engineHorsepower || 5000;
            this.tireFriction = VehicleOptions.tireFriction || 1000;
            this.brakeForce = VehicleOptions.brakeForce || 100;

            if ((global?.app as any)?.storage?.debug) {
                console.log("Vehicle Options:");
                for (const option in VehicleOptions) {
                    console.log(`${option}:`, VehicleOptions[option].value || VehicleOptions[option]);
                }
            }

            this.initVehicle(this.leftFrontWheel, this.rightFrontWheel, this.leftRearWheel, this.rightRearWheel);
        } else {
            console.warn("Camera or VehicleOptions not found in userData.");
        }
    }

    async initVehicle(leftFront: string, rightFront: string, leftRear: string, rightRear: string) {
        this.ammo = await Ammo();
        this.TRANSFORM_AUX = new this.ammo.btTransform();

        this.leftFrontWheel = leftFront;
        this.rightFrontWheel = rightFront;
        this.leftRearWheel = leftRear;
        this.rightRearWheel = rightRear;

        var time = 0;

        const convexHullGenerator = new ConvexHullGenerator();

        const initGraphics = () => {
            this.materialDynamic = new THREE.MeshPhongMaterial({color: "red"});
            this.materialStatic = new THREE.MeshPhongMaterial({color: 0x999999});
            this.materialRamp = new THREE.MeshPhongMaterial({color: "blue"});
            this.materialInteractive = new THREE.MeshPhongMaterial({color: 0x990000});
        };

        const initPhysics = () => {
            const collisionConfiguration = new this.ammo.btDefaultCollisionConfiguration();
            const dispatcher = new this.ammo.btCollisionDispatcher(collisionConfiguration);
            const broadphase = new this.ammo.btDbvtBroadphase();
            const solver = new this.ammo.btSequentialImpulseConstraintSolver();
            this.physicsWorld = new this.ammo.btDiscreteDynamicsWorld(
                dispatcher,
                broadphase,
                solver,
                collisionConfiguration,
            );
            this.physicsWorld!.setGravity(new this.ammo.btVector3(0, GAME_GRAVITY_DEFAULT, 0));
        };

        this.updateVehicle = () => {
            if (this.gamePaused) {
                return;
            }

            // Update the player's position and rotation in the physics world
            const currentPosition = this.player.position.clone();
            const currentRotation = this.player.quaternion.clone();
            this.physics.setOrigin(this.player.uuid, currentPosition);
            this.physics.setRotation(this.player.uuid, currentRotation);

            //sync vehicle with physics
            var dt = this.clock.getDelta();
            for (var i = 0; i < this.syncList.length; i++) this.syncList[i](dt);
            this.physicsWorld!.stepSimulation(dt, 10);
            time += dt;

            //stop game if vehicle flips over
            //eventually do some cool stuff here like play car
            //blows up animation and sounds
            if (isUpsideDown(this.player)) {
                if ((global?.app as any)?.storage?.debug) {
                    console.log("Vehicle is upside down...");
                }
                setManagedTimeout(() => {
                    global.app!.call("pauseGame");
                }, 2000);
            }
        };

        const getUpVectorFromQuaternion = (quaternion: THREE.Quaternion): THREE.Vector3 => {
            const up = new THREE.Vector3(0, 1, 0);
            // Global up vector
            return up.applyQuaternion(quaternion);
            // Apply the quaternion to get the object's up vector
        };

        const isUpsideDown = (object: any): boolean => {
            const globalUp = new THREE.Vector3(0, 1, 0); // Global up vector
            const objectUp = getUpVectorFromQuaternion(object.quaternion);
            // Get the object's up vector
            // Calculate the angle between the object's up vector and the global up vector
            const angle = objectUp.angleTo(globalUp);
            // Angle in radians// Define a threshold angle, e.g., 90 degrees
            const threshold = Math.PI / 2;
            // 90 degrees in radians
            // Check if the angle is within the threshold (i.e., object is flipped)
            return angle > threshold;
        };

        const createGroundPlane = (
            pos: THREE.Vector3,
            quat: THREE.Quaternion,
            w: number,
            l: number,
            h: number,
            mass: number,
            friction: number,
        ) => {
            const shape = new THREE.PlaneGeometry(w, l);
            const mesh = new THREE.Mesh(shape);

            mesh.position.copy(pos);
            mesh.visible = false;
            this.scene.add(mesh);

            const transform = new this.ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new this.ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

            const motionState = new this.ammo.btDefaultMotionState(transform);

            const localInertia = new this.ammo.btVector3(0, 0, 0);

            const geometry = new this.ammo.btStaticPlaneShape(new this.ammo.btVector3(0, 1, 0), 0);

            const rbInfo = new this.ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
            const body = new this.ammo.btRigidBody(rbInfo);

            this.physicsWorld?.addRigidBody(body);
        };

        const createVehicle = (pos: THREE.Vector3, quat: THREE.Quaternion) => {
            let massVehicle = 800;

            let chassisWidth = null;
            let chassisHeight = null;
            let chassisLength = null;

            let frontAxlePosition = null;
            let rearAxlePosition = null;

            let wheelAxisPositionBack = null;
            let wheelRadiusBack = null;
            let wheelWidthBack = null;
            let wheelHalfTrackBack = null;
            let wheelAxisHeightBack = null;

            let wheelAxisFrontPosition = null;
            let wheelHalfTrackFront = null;
            let wheelAxisHeightFront = null;
            let wheelRadiusFront = null;
            let wheelWidthFront = null;

            let friction = this.tireFriction;
            let suspensionStiffness = 20.0;
            let suspensionDamping = 2.3;
            let suspensionCompression = 4.4;
            let suspensionRestLength = 0.6;
            let rollInfluence = 0.001;

            let steeringIncrement = 0.05;
            let steeringClamp = 0.25;
            let maxEngineForce = this.engineHorsepower;
            let maxBreakingForce = this.brakeForce;

            const trackModelName = this.scene.getObjectByName(this.trackModel);
            if (trackModelName) {
                //generate physics track surface body
                convexHullGenerator.createTrackBoundaryConvexHullShape(
                    trackModelName,
                    this.trackSurface,
                    this.scene,
                    this.ammo,
                    this.physicsWorld,
                    this.DISABLE_DEACTIVATION,
                );
                //generate simplified physics vehicle body additional convex hull
                convexHullGenerator.createVehicleBodyConvexHullShape(
                    this.scene,
                    this.player,
                    this.ammo,
                    this.physicsWorld,
                    this.DISABLE_DEACTIVATION,
                );
            } else {
                //generate a physics plane if no track object is selected
                createGroundPlane(new THREE.Vector3(0, -0.15, 0), this.ZERO_QUATERNION, 10000, 1, 10000, 0, 0);
            }

            var adjustTireRotation = false;

            let topOfWheelsY;
            let chassisBottomY;
            let chassisCenterY;

            let wheelLFObject = this.player.getObjectByName(this.leftFrontWheel);
            let wheelRFObject = this.player.getObjectByName(this.rightFrontWheel);
            var wheelLRObject = this.player.getObjectByName(this.leftRearWheel);
            let wheelRRObject = this.player.getObjectByName(this.rightRearWheel);

            if (wheelLFObject && wheelRFObject && wheelLRObject && wheelRRObject) {
                var frontLeftBox = new THREE.Box3().setFromObject(wheelLFObject);
                var frontRightBox = new THREE.Box3().setFromObject(wheelRFObject);
                var rearLeftBox = new THREE.Box3().setFromObject(wheelLRObject);
                var rearRightBox = new THREE.Box3().setFromObject(wheelRRObject);

                var chassisBox = new THREE.Box3()
                    .union(frontLeftBox)
                    .union(frontRightBox)
                    .union(rearLeftBox)
                    .union(rearRightBox);

                var chassisSize = new THREE.Vector3();
                chassisBox.getSize(chassisSize);

                var chassisCenter = new THREE.Vector3();
                chassisBox.getCenter(chassisCenter);

                var wheelLFSize = new THREE.Vector3();
                frontLeftBox.getSize(wheelLFSize);

                wheelRadiusFront = wheelLFSize.y / 2;
                wheelWidthFront = wheelLFSize.x;

                wheelRadiusBack = wheelLFSize.y / 2;
                wheelWidthBack = wheelLFSize.x;

                frontAxlePosition = frontLeftBox.getCenter(new THREE.Vector3()).z - chassisBox.min.z;
                rearAxlePosition = rearLeftBox.getCenter(new THREE.Vector3()).z - chassisBox.min.z;

                chassisWidth = chassisSize.x - chassisSize.x / 2;
                chassisHeight = chassisSize.y - chassisSize.y / 2;
                chassisLength = chassisSize.z - chassisSize.z / 2;
                wheelAxisFrontPosition = frontAxlePosition - chassisSize.z / 2;
                wheelHalfTrackFront = 1;
                wheelAxisHeightFront = chassisSize.y - chassisSize.y / 2;

                wheelAxisPositionBack = rearAxlePosition - chassisSize.z / 2;
                wheelHalfTrackBack = 1;
                wheelAxisHeightBack = chassisSize.y - chassisSize.y / 2;

                topOfWheelsY = wheelAxisHeightFront + wheelRadiusFront;
                chassisBottomY = topOfWheelsY;
                chassisCenterY = chassisBottomY + chassisHeight;

                //Generate chassis helper if debug mode enabled
                if ((global?.app as any)?.storage?.debug) {
                    var chassisHelper = new THREE.BoxHelper(
                        new THREE.Mesh(new THREE.BoxGeometry(chassisSize.x, chassisSize.y, chassisSize.z)),
                        0x00ff00,
                    );
                    chassisHelper.position.copy(chassisCenter);
                    this.player.add(chassisHelper);
                    console.log("Front axle position:", frontAxlePosition);
                    console.log("Rear axle position:", rearAxlePosition);
                    console.log("Chassis dimensions:", chassisSize);
                    console.log("Chassis center:", chassisCenter);
                }
            } else {
                if ((global?.app as any)?.storage?.debug) {
                    console.error("Could not find one or more of the wheel objects.");
                }

                //These are all set to static to use a random car model
                //TODO upgrade this later to use the current random vehicle size
                chassisWidth = 0.5;
                chassisHeight = 0.6;
                chassisLength = 4;

                wheelAxisPositionBack = -1;
                wheelRadiusBack = 0.4;
                wheelWidthBack = 0.3;
                wheelHalfTrackBack = 1;
                wheelAxisHeightBack = 0.3;

                wheelAxisFrontPosition = 1.7;
                wheelHalfTrackFront = 1;
                wheelAxisHeightFront = 0.3;
                wheelRadiusFront = 0.35;
                wheelWidthFront = 0.2;
            }

            // Chassis
            var geometry = new this.ammo.btBoxShape(
                new this.ammo.btVector3(chassisWidth * 5, chassisHeight * 0.5, chassisLength * 0.5),
            );
            var transform = new this.ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new this.ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            var motionState = new this.ammo.btDefaultMotionState(transform);
            var localInertia = new this.ammo.btVector3(0, 0, 0);
            geometry.calculateLocalInertia(massVehicle, localInertia);
            var body = new this.ammo.btRigidBody(
                new this.ammo.btRigidBodyConstructionInfo(massVehicle, motionState, geometry, localInertia),
            );
            body.setActivationState(this.DISABLE_DEACTIVATION);
            this.physicsWorld?.addRigidBody(body);

            // Raycast Vehicle
            var engineForce = 0;
            var vehicleSteering = 0;
            var breakingForce = 0;
            var tuning = new this.ammo.btVehicleTuning();
            var rayCaster = new this.ammo.btDefaultVehicleRaycaster(this.physicsWorld);
            var vehicle = new this.ammo.btRaycastVehicle(tuning, body, rayCaster);
            vehicle.setCoordinateSystem(0, 1, 2);

            this.physicsWorld?.addAction(vehicle);

            this.player.updateMatrixWorld(true);

            // Wheels
            let FRONT_LEFT = 0;
            let FRONT_RIGHT = 1;
            let BACK_LEFT = 2;
            let BACK_RIGHT = 3;
            var wheelDirectionCS0 = new this.ammo.btVector3(0, -1, 0);
            var wheelAxleCS = new this.ammo.btVector3(-1, 0, 0);

            const addWheel = (isFront: boolean, pos: THREE.Vector3, radius: number, width: number, index: number) => {
                var side: string;

                if ((global?.app as any)?.storage?.debug) {
                    console.log("Found Wheels = " + this.wheelsFound);
                }

                var wheelObjectName;
                switch (index) {
                    case FRONT_LEFT:
                        wheelObjectName = this.leftFrontWheel;
                        side = "left";
                        break;
                    case FRONT_RIGHT:
                        wheelObjectName = this.rightFrontWheel;
                        side = "right";
                        break;
                    case BACK_LEFT:
                        wheelObjectName = this.leftRearWheel;
                        side = "left";
                        break;
                    case BACK_RIGHT:
                        wheelObjectName = this.rightRearWheel;
                        side = "right";
                        break;
                    default:
                        console.warn(`Unknown wheel index ${index}`);
                        wheelObjectName = null;
                        break;
                }

                var wheelInfo = vehicle.addWheel(
                    pos,
                    wheelDirectionCS0,
                    wheelAxleCS,
                    suspensionRestLength,
                    radius,
                    tuning,
                    isFront,
                );

                wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
                wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
                wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
                wheelInfo.set_m_frictionSlip(friction);
                wheelInfo.set_m_rollInfluence(rollInfluence);

                side = "left";

                this.wheelMeshes[index] = createWheelMesh(radius, width, wheelObjectName, isFront, side);
            };

            const createWheelMesh = (radius: number, width: number, wheelObjectName: any, isFront: any, side: any) => {
                if (this.wheelsFound) {
                    var wheelObject = this.player.getObjectByName(wheelObjectName);

                    if (wheelObject) {
                        if (isFront) {
                            wheelObject.userData.isFrontWheel = true;
                        } else {
                            wheelObject.userData.isFrontWheel = false;
                        }

                        const wheelClone = wheelObject.clone();
                        this.scene.add(wheelClone);
                        wheelObject.visible = false;

                        //console.log(`Rotation of ${wheelObjectName}:`, wheelClone.rotation);

                        var currentRotation = new THREE.Euler().setFromQuaternion(wheelObject.quaternion);

                        if (Math.abs(currentRotation.y) > 0.1) {
                            var correctionQuat = new THREE.Quaternion();
                            correctionQuat.setFromAxisAngle(new THREE.Vector3(0, -1, 0), Math.PI / 2);
                            adjustTireRotation = true;
                        } else {
                            adjustTireRotation = false;
                        }

                        return wheelClone;
                    } else {
                        console.error(`No wheel found for the name: ${wheelObjectName}`);
                        return null;
                    }
                } else {
                    //add default physics wheels for vehicle character if none are configured
                    var t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
                    t.rotateZ(Math.PI / 2);
                    var mesh = new THREE.Mesh(t, this.materialInteractive);
                    mesh.add(
                        new THREE.Mesh(
                            new THREE.BoxGeometry(width * 1.5, radius * 1.75, radius * 0.25, 1, 1, 1),
                            this.materialInteractive,
                        ),
                    );
                    mesh.visible = false;
                    this.scene.add(mesh);
                    return mesh;
                }
            };

            if (wheelLFObject && wheelRFObject && wheelLRObject && wheelRRObject) {
                this.wheelsFound = true;

                addWheel(
                    true,
                    new this.ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition),
                    wheelRadiusFront,
                    wheelWidthFront,
                    FRONT_LEFT,
                );
                addWheel(
                    true,
                    new this.ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition),
                    wheelRadiusFront,
                    wheelWidthFront,
                    FRONT_RIGHT,
                );
                addWheel(
                    false,
                    new this.ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack),
                    wheelRadiusBack,
                    wheelWidthBack,
                    BACK_LEFT,
                );
                addWheel(
                    false,
                    new this.ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack),
                    wheelRadiusBack,
                    wheelWidthBack,
                    BACK_RIGHT,
                );
            } else {
                this.wheelsFound = false;

                if ((global?.app as any)?.storage?.debug) {
                    console.log(
                        "Error finding tires for vehicle name: " +
                            this.player.name +
                            " adding default wheels to vehicle.",
                    );
                }

                wheelAxisFrontPosition = 1.7;
                wheelHalfTrackFront = 1;
                wheelAxisHeightFront = 0.3;
                wheelRadiusFront = 0.35;
                wheelWidthFront = 0.2;

                wheelAxisPositionBack = -1;
                wheelRadiusBack = 0.4;
                wheelWidthBack = 0.3;
                wheelHalfTrackBack = 1;
                wheelAxisHeightBack = 0.3;

                //create ground plane if no wheels are configured
                createGroundPlane(new THREE.Vector3(0, -0.15, 0), this.ZERO_QUATERNION, 400, 1, 400, 0, 2);

                addWheel(
                    true,
                    new this.ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition),
                    wheelRadiusFront,
                    wheelWidthFront,
                    FRONT_LEFT,
                );
                addWheel(
                    true,
                    new this.ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition),
                    wheelRadiusFront,
                    wheelWidthFront,
                    FRONT_RIGHT,
                );
                addWheel(
                    false,
                    new this.ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack),
                    wheelRadiusBack,
                    wheelWidthBack,
                    BACK_LEFT,
                );
                addWheel(
                    false,
                    new this.ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack),
                    wheelRadiusBack,
                    wheelWidthBack,
                    BACK_RIGHT,
                );
            }

            // Sync keyboard actions and physics and graphics
            const sync = (dt: any) => {
                var speed = vehicle.getCurrentSpeedKmHour();

                breakingForce = 0;
                engineForce = 0;

                if (this.keysPressed.acceleration) {
                    if (speed < -1) breakingForce = maxBreakingForce;
                    else engineForce = maxEngineForce;
                }
                if (this.keysPressed.braking) {
                    if (speed > 1) breakingForce = maxBreakingForce;
                    else engineForce = -maxEngineForce / 2;
                }
                if (this.keysPressed.left) {
                    if (vehicleSteering < steeringClamp) vehicleSteering += steeringIncrement;
                } else {
                    if (this.keysPressed.right) {
                        if (vehicleSteering > -steeringClamp) vehicleSteering -= steeringIncrement;
                    } else {
                        if (vehicleSteering < -steeringIncrement) vehicleSteering += steeringIncrement;
                        else {
                            if (vehicleSteering > steeringIncrement) vehicleSteering -= steeringIncrement;
                            else {
                                vehicleSteering = 0;
                            }
                        }
                    }
                }

                vehicle.applyEngineForce(engineForce, BACK_LEFT);
                vehicle.applyEngineForce(engineForce, BACK_RIGHT);

                vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
                vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
                vehicle.setBrake(breakingForce, BACK_LEFT);
                vehicle.setBrake(breakingForce, BACK_RIGHT);

                vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
                vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

                /**
                 *
                 */
                function createCorrectionQuaternion() {
                    var correctionQuat = new THREE.Quaternion();
                    correctionQuat.setFromAxisAngle(new THREE.Vector3(0, -1, 0), Math.PI / 2);
                    return correctionQuat;
                }

                var correctionQuaternion = createCorrectionQuaternion();

                var tm, p, q, i;
                var n = vehicle.getNumWheels();
                for (i = 0; i < n; i++) {
                    vehicle.updateWheelTransform(i, true);
                    tm = vehicle.getWheelTransformWS(i);
                    p = tm.getOrigin();
                    q = tm.getRotation();

                    this.wheelMeshes[i].position.set(p.x(), p.y(), p.z());

                    if (adjustTireRotation) {
                        var wheelQuat = new THREE.Quaternion(q.x(), q.y(), q.z(), q.w());
                        wheelQuat.multiply(correctionQuaternion);
                        this.wheelMeshes[i].quaternion.copy(wheelQuat);
                    } else {
                        this.wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }

                    // Clean up objects returned by getters
                    Ammo.destroy(p);
                    Ammo.destroy(q);

                    // Update the orbit control simulator
                    this.CameraControl!.update(this.gamePaused);
                }

                tm = vehicle.getChassisWorldTransform();
                p = tm.getOrigin();
                q = tm.getRotation();
                this.player.position.set(p.x(), p.y(), p.z());
                this.player.quaternion.set(q.x(), q.y(), q.z(), q.w());

                // Clean up chassis transform getters
                Ammo.destroy(p);
                Ammo.destroy(q);
            };

            this.syncList.push(sync);
        };

        const createObjects = () => {
            var playerPosition = this.player.position;
            var position = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
            createVehicle(position, this.ZERO_QUATERNION);

            //TODO use this for temp convex hull physics testing then remove after vehicle controller full physics integration
            //This will convert any object named ramp or blocker to a convex hull shape
            this.scene.traverse((object: THREE.Object3D) => {
                if (
                    object.name.toLowerCase().includes("ramp") ||
                    object.name.toLowerCase().includes("boundary_objects") ||
                    object.name.toLowerCase().includes("blocker")
                ) {
                    convexHullGenerator.createLandBoundaryConvexHullShape(
                        object,
                        this.scene,
                        this.ammo,
                        this.physicsWorld,
                        this.DISABLE_DEACTIVATION,
                    );
                }
            });
        };

        initGraphics();
        initPhysics();
        createObjects();
    }

    private setInitalPlayerState() {}

    private getCollisionObjects() {}
}

const requestNextFrame = (callback: FrameRequestCallback): number => {
    return requestAnimationFrame(callback);
};

export {VehicleControls};
