import {Object3D, Quaternion, Vector3} from "three";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";

import {PhysicsEngineType} from "../../physics/common/types";
import {PhysicsEngineFactory} from "../../physics/PhysicsEngineFactory";

vi.mock("./PlayerComponent", () => ({
    default: class PlayerComponent {
        app: unknown;

        constructor(app: unknown) {
            this.app = app;
        }
    },
}));

vi.mock("./PlayerLoadMask", () => ({
    default: class PlayerLoadMask {
        show() {}
        hide() {}
    },
}));

vi.mock("../../global", () => ({
    default: {app: null},
}));

vi.mock("../../multiplayer/MultiplayerProxy", () => ({
    default: class MultiplayerProxy {},
}));

vi.mock("../../physics/common/processInBatches", () => ({
    processInBatches: vi.fn(),
}));

vi.mock("../../physics/PhysicsEngineFactory", () => ({
    PhysicsEngineFactory: {
        createLegacyPhysicsAdapter: vi.fn(),
    },
}));

// Force the main-thread (non-worker) physics path so the gravity assertion
// runs through `createLegacyPhysicsAdapter`. The default in jsdom would pick
// the worker path because `Worker` is defined.
vi.mock("../../physics/preloadPhysics", () => ({
    shouldUsePhysicsWorker: () => false,
    preloadPhysics: vi.fn(),
}));

vi.mock("../../physics/PhysicsUtil", () => ({
    PhysicsUtil: {
        updateObjectTransformFromPhysics(object: Object3D, position: {x: number; y: number; z: number}, rotation: {x: number; y: number; z: number; w: number}, scale: {x: number; y: number; z: number}) {
            object.position.set(position.x, position.y, position.z);
            object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
            object.scale.set(scale.x, scale.y, scale.z);
        },
    },
}));

vi.mock("../../physics/simple/PhysicsWrapper", () => ({
    PhysicsWrapper: class PhysicsWrapper {},
}));

vi.mock("../../physics/worker/GeometryComputePool", () => ({
    setGeometryWorkerPoolSize: vi.fn(),
}));

vi.mock("../../scheduler/debug/frameRuntimeTrace.js", () => ({
    recordFrameRuntimeTrace: vi.fn(),
}));

vi.mock("../../userManagement/playerProfile/game-service-controllers", () => ({
    DiscordController: {
        isInDiscord: () => false,
    },
}));

vi.mock("../../utils/DetectDevice", () => ({
    DetectDevice: {
        isMobile: () => false,
        getOS: () => "macOS",
    },
}));

vi.mock("../../utils/ObjectUtils", () => ({
    cloneObject: vi.fn(),
    getObjectTemplateFromScene: vi.fn(),
    setObjectTemplate: vi.fn(),
}));

let PlayerPhysics2: typeof import("./PlayerPhysics2").default;

function createSubject() {
    const object = new Object3D();
    type SubjectType = {
        updates: Map<string, unknown>;
        physics: { getDynamicBodyObject(uuid: string): Object3D | undefined };
        positionAuxA: Vector3;
        scaleAuxA: Vector3;
        quaternionAuxA: Quaternion;
        quaternionAuxB: Quaternion;
        getPendingUpdateCount(): number;
        pushUpdateData(...args: unknown[]): void;
        updateObjects(interpolateDynamicObjects: boolean, frameNow: number): { appliedCount: number };
    };
    const subject = Object.create(PlayerPhysics2.prototype) as unknown as SubjectType;

    subject.updates = new Map();
    subject.physics = {
        getDynamicBodyObject(uuid: string) {
            return uuid === object.uuid ? object : undefined;
        },
    };
    subject.positionAuxA = new Vector3();
    subject.scaleAuxA = new Vector3();
    subject.quaternionAuxA = new Quaternion();
    subject.quaternionAuxB = new Quaternion();

    return {subject, object};
}

describe("PlayerPhysics2 interpolation buffer", () => {
    beforeAll(async () => {
        ({default: PlayerPhysics2} = await import("./PlayerPhysics2"));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("retains the last applied sample so the next update can keep interpolating", () => {
        const {subject, object} = createSubject();
        let now = 0;

        vi.spyOn(performance, "now").mockImplementation(() => now);

        subject.pushUpdateData(object.uuid, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 1}, 0.1, undefined);

        now = 100;
        subject.pushUpdateData(object.uuid, {x: 10, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 1}, 0.1, undefined);

        now = 150;
        subject.updateObjects(true, now);
        expect(object.position.x).toBeCloseTo(5, 5);
        expect(subject.getPendingUpdateCount()).toBe(1);

        now = 220;
        subject.updateObjects(true, now);
        expect(object.position.x).toBeCloseTo(10, 5);
        expect(subject.getPendingUpdateCount()).toBe(1);

        now = 320;
        subject.pushUpdateData(object.uuid, {x: 20, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 1}, 0.1, undefined);

        now = 370;
        subject.updateObjects(true, now);
        expect(object.position.x).toBeCloseTo(15, 5);
        expect(subject.getPendingUpdateCount()).toBe(1);
    });

    it("uses the physics step dt instead of the arrival gap to compute interpolation progress", () => {
        const {subject, object} = createSubject();
        let now = 0;

        vi.spyOn(performance, "now").mockImplementation(() => now);

        subject.pushUpdateData(object.uuid, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 1}, 0.1, undefined);

        now = 10;
        subject.pushUpdateData(object.uuid, {x: 10, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 1}, 0.1, undefined);

        now = 60;
        subject.updateObjects(true, now);

        expect(object.position.x).toBeCloseTo(5, 5);
    });

    it("passes scene gravity into main-thread physics initialization", async () => {
        const physics = {
            start: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(PhysicsEngineFactory.createLegacyPhysicsAdapter).mockResolvedValue(physics as never);

        type SubjectType2 = {
            isMultiplayer: boolean;
            useMultiplayerPhysicsEngine: boolean;
            useWorker: boolean;
            mask: {hide: () => void};
            initPhysics(sceneId: string, scene: unknown, dispatcher: unknown): Promise<unknown>;
        };
        const subject = Object.create(PlayerPhysics2.prototype) as unknown as SubjectType2;

        subject.isMultiplayer = false;
        subject.useMultiplayerPhysicsEngine = false;
        subject.useWorker = false;
        subject.mask = {hide: vi.fn()};

        const dispatcher = {
            onReady: vi.fn(),
            onBodyUpdate: vi.fn(),
            onCollision: vi.fn(),
        };
        const scene = {
            userData: {
                physics: {
                    engine: PhysicsEngineType.Jolt,
                    gravity: -24,
                },
            },
        } as never;

        const result = await subject.initPhysics("scene-id", scene, dispatcher);

        expect(result).toBe(physics);
        expect(PhysicsEngineFactory.createLegacyPhysicsAdapter).toHaveBeenCalledWith(
            PhysicsEngineType.Jolt,
            dispatcher,
            {gravity: -24},
        );
        expect(physics.start).toHaveBeenCalledOnce();
    });
});
