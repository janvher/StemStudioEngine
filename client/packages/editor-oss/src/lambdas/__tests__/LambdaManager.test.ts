import {Object3D} from "three";
import {describe, it, expect, vi, beforeEach} from "vitest";

import type GameManager from "@stem/editor-oss/behaviors/game/GameManager";
import {createForeignLambdaView, type LambdaConfig, type LambdaOptions} from "../Lambda";
import {LambdaBase} from "../LambdaBase";
import {LambdaManager} from "../LambdaManager";

class MockLambda extends LambdaBase {
    public initCalled = false;
    public disposeCalled = false;

    init(game: GameManager): void {
        this.initCalled = true;
        this._game = game;
    }

    dispose(): void {
        this.disposeCalled = true;
        super.dispose();
    }
}

class FailingInitLambda extends LambdaBase {
    init(): void {
        throw new Error("Init failed");
    }
}

class FailingDisposeLambda extends LambdaBase {
    dispose(): void {
        throw new Error("Dispose failed");
    }
}

class RecordingLambda extends LambdaBase {
    static callOrder: string[] = [];

    update(): void {
        RecordingLambda.callOrder.push(this.id);
    }
}

class ReloadedLambda extends LambdaBase {
    public runtimeTag = "reloaded";
}

const mockConfig: LambdaConfig = {
    id: "test-lambda",
    name: "Test Lambda",
    version: "1.0.0",
    main: "TestLambda.ts",
    attributes: {strength: {name: "Strength", type: "number", default: 10}},
    componentSchema: {
        mass: {name: "Mass", type: "number", default: 1.0},
        drag: {name: "Drag", type: "number", default: 0.1},
    },
};

const createMockGameManager = (): GameManager => ({
    scene: {
        userData: {},
    },
} as GameManager);

describe("LambdaManager", () => {
    let manager: LambdaManager;
    let game: GameManager;

    beforeEach(() => {
        game = createMockGameManager();
        manager = new LambdaManager(game);
        (game as any).lambdaManager = manager;
    });

    describe("registerLambdaClass", () => {
        it("should store class and config", () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            expect(manager.hasLambdaClass("test-lambda")).toBe(true);
            expect(manager.getConfig("test-lambda")).toEqual(mockConfig);
        });

        it("should reject duplicates with error", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("already registered"),
            );
            errorSpy.mockRestore();
        });
    });

    describe("unregisterLambdaClass", () => {
        it("should remove class and config", () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            manager.unregisterLambdaClass("test-lambda");

            expect(manager.hasLambdaClass("test-lambda")).toBe(false);
            expect(manager.getConfig("test-lambda")).toBeNull();
        });
    });

    describe("createInstance", () => {
        it("should return instance with correct id", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            const instance = await manager.createInstance("test-lambda");

            expect(instance).not.toBeNull();
            expect(instance!.id).toBe("test-lambda");
        });

        it("should use provided uuid", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            const instance = await manager.createInstance("test-lambda", {
                uuid: "custom-uuid",
            });

            expect(instance!.uuid).toBe("custom-uuid");
        });

        it("should call init", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            const instance = (await manager.createInstance("test-lambda")) as MockLambda;

            expect(instance.initCalled).toBe(true);
        });

        it("should return null for unknown lambdaId", async () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const instance = await manager.createInstance("unknown");

            expect(instance).toBeNull();
            errorSpy.mockRestore();
        });

        it("should return null and dispose on init failure", async () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            manager.registerLambdaClass("failing", {...mockConfig, id: "failing"}, FailingInitLambda);

            const instance = await manager.createInstance("failing");

            expect(instance).toBeNull();
            errorSpy.mockRestore();
        });

        it("should be retrievable after creation", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);

            const instance = await manager.createInstance("test-lambda");
            const retrieved = manager.getInstance(instance!.uuid);

            expect(retrieved).toBe(instance);
        });
    });

    describe("destroyInstance", () => {
        it("should call dispose and remove from instances", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = (await manager.createInstance("test-lambda")) as MockLambda;

            manager.destroyInstance(instance.uuid);

            expect(instance.disposeCalled).toBe(true);
            expect(manager.getInstance(instance.uuid)).toBeNull();
        });

        it("should deregister all objects from instance", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();
            manager.registerObject(instance!.uuid, obj, {mass: 5});

            manager.destroyInstance(instance!.uuid);

            expect(manager.getObjectLambdas(obj)).toHaveLength(0);
        });

        it("should handle dispose errors gracefully", async () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            manager.registerLambdaClass("failing", {...mockConfig, id: "failing"}, FailingDisposeLambda);
            const instance = await manager.createInstance("failing");

            manager.destroyInstance(instance!.uuid);

            expect(manager.getInstance(instance!.uuid)).toBeNull();
            errorSpy.mockRestore();
        });

        it("should no-op for unknown instanceId", () => {
            // Should not throw
            manager.destroyInstance("unknown-id");
        });
    });

    describe("reloadLambdaClass", () => {
        it("preserves instance ids, attributes, and object registrations across class reload", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda", {
                uuid: "instance-1",
                attributes: {strength: 42},
            });
            const obj = new Object3D();
            manager.registerObject("instance-1", obj, {mass: 5, drag: 0.25});

            await manager.reloadLambdaClass("test-lambda", {
                ...mockConfig,
                description: "Reloaded",
            }, ReloadedLambda);

            const reloaded = manager.getInstance("instance-1") as ReloadedLambda | null;
            expect(reloaded).not.toBeNull();
            expect(reloaded).not.toBe(instance);
            expect(reloaded).toBeInstanceOf(ReloadedLambda);
            expect(reloaded!.runtimeTag).toBe("reloaded");
            expect(reloaded!.attributes).toEqual({strength: 42});
            expect(reloaded!.getComponentData(obj)).toEqual(expect.objectContaining({mass: 5, drag: 0.25}));
            expect(manager.getObjectLambdas(obj)).toEqual([reloaded]);
            expect(manager.getConfig("test-lambda")?.description).toBe("Reloaded");
        });
    });

    describe("getInstancesByType", () => {
        it("should return instances matching type", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            await manager.createInstance("test-lambda");
            await manager.createInstance("test-lambda");

            const instances = manager.getInstancesByType("test-lambda");
            expect(instances).toHaveLength(2);
        });

        it("should return empty for unknown type", () => {
            expect(manager.getInstancesByType("unknown")).toHaveLength(0);
        });
    });

    describe("attribute requests and foreign views", () => {
        it("updates lambda attributes through requestAttributeChange and persists to scene data", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            (game.scene.userData as any).lambdaInstances = [{
                lambdaId: "test-lambda",
                instanceId: "lambda-1",
                enabled: true,
                attributes: {strength: 10},
            }];

            const instance = await manager.createInstance("test-lambda", {
                uuid: "lambda-1",
                attributes: {strength: 10},
            });

            const result = instance!.requestAttributeChange("strength", 42, {sync: true});
            expect(result).toEqual({
                accepted: true,
                key: "strength",
                value: 42,
                previousValue: 10,
            });
            expect(instance!.attributes.strength).toBe(42);
            expect((game.scene.userData as any).lambdaInstances[0].attributes).toEqual({strength: 42});
        });

        it("blocks direct foreign attribute mutation while allowing requestAttributeChange", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda", {
                attributes: {strength: 10},
            });
            const foreign = createForeignLambdaView(instance!);

            (foreign.attributes).strength = 99;
            expect(instance!.attributes.strength).toBe(10);

            const result = foreign.requestAttributeChange("strength", 25, {sync: true});
            expect(result).toEqual({
                accepted: true,
                key: "strength",
                value: 25,
                previousValue: 10,
            });
            expect(instance!.attributes.strength).toBe(25);
        });
    });

    describe("dependency wave cache", () => {
        it("should reuse cached waves when instances have not changed", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            await manager.createInstance("test-lambda");

            const first = (manager as any).buildWaves();
            const second = (manager as any).buildWaves();

            expect(second).toBe(first);
        });

        it("should rebuild dependency waves after updateConfig changes read/write metadata", async () => {
            const lambdaAConfig: LambdaConfig = {
                id: "lambda-a",
                name: "Lambda A",
                version: "1.0.0",
                main: "LambdaA.ts",
                attributes: {},
                componentSchema: {},
            };
            const lambdaBConfig: LambdaConfig = {
                id: "lambda-b",
                name: "Lambda B",
                version: "1.0.0",
                main: "LambdaB.ts",
                attributes: {},
                componentSchema: {},
            };

            manager.registerLambdaClass("lambda-b", lambdaBConfig, RecordingLambda);
            manager.registerLambdaClass("lambda-a", lambdaAConfig, RecordingLambda);
            await manager.createInstance("lambda-b");
            await manager.createInstance("lambda-a");

            RecordingLambda.callOrder = [];
            manager.update(0.016);
            expect(RecordingLambda.callOrder).toEqual(["lambda-b", "lambda-a"]);

            manager.updateConfig("lambda-a", {
                ...lambdaAConfig,
                writeComponents: ["transform"],
            });
            manager.updateConfig("lambda-b", {
                ...lambdaBConfig,
                readComponents: ["transform"],
            });

            RecordingLambda.callOrder = [];
            manager.update(0.016);
            expect(RecordingLambda.callOrder).toEqual(["lambda-a", "lambda-b"]);
        });
    });

    describe("update", () => {
        it("does not tick adaptive scheduling when no lambda instances exist", () => {
            const beginFrameSpy = vi.spyOn(manager.scheduler, "beginFrame");

            manager.update(0.016);

            expect(beginFrameSpy).not.toHaveBeenCalled();
        });

        it("ticks adaptive scheduling when lambda instances exist", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            await manager.createInstance("test-lambda");
            const beginFrameSpy = vi.spyOn(manager.scheduler, "beginFrame");

            manager.update(0.016);

            expect(beginFrameSpy).toHaveBeenCalledOnce();
        });
    });

    describe("registerObject", () => {
        it("should add object to instance and reverse lookup", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();

            const result = manager.registerObject(instance!.uuid, obj, {mass: 5});

            expect(result).toBe(true);
            expect(instance!.entityCount).toBe(1);
            expect(instance!.getComponentData(obj)).toEqual(expect.objectContaining({mass: 5}));
            expect(manager.getObjectLambdas(obj)).toHaveLength(1);
        });

        it("should use default component data if none provided", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();

            manager.registerObject(instance!.uuid, obj);

            expect(instance!.getComponentData(obj)).toEqual(expect.objectContaining({mass: 1.0, drag: 0.1}));
        });

        it("should return false for unknown instance", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const obj = new Object3D();

            const result = manager.registerObject("unknown", obj, {});

            expect(result).toBe(false);
            errorSpy.mockRestore();
        });
    });

    describe("deregisterObject", () => {
        it("should remove from instance and reverse lookup", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();
            manager.registerObject(instance!.uuid, obj, {mass: 5});

            manager.deregisterObject(instance!.uuid, obj);

            expect(instance!.entityCount).toBe(0);
            expect(manager.getObjectLambdas(obj)).toHaveLength(0);
        });

        it("should no-op for unknown instance", () => {
            const obj = new Object3D();
            // Should not throw
            manager.deregisterObject("unknown", obj);
        });
    });

    describe("deregisterObjectFromAll", () => {
        it("should remove object from all lambda instances", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance1 = await manager.createInstance("test-lambda");
            const instance2 = await manager.createInstance("test-lambda");
            const obj = new Object3D();
            manager.registerObject(instance1!.uuid, obj, {mass: 1});
            manager.registerObject(instance2!.uuid, obj, {mass: 2});

            expect(manager.getObjectLambdas(obj)).toHaveLength(2);

            manager.deregisterObjectFromAll(obj);

            expect(manager.getObjectLambdas(obj)).toHaveLength(0);
            expect(instance1!.entityCount).toBe(0);
            expect(instance2!.entityCount).toBe(0);
        });
    });

    describe("getObjectLambdas", () => {
        it("should return correct instances for object", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();
            manager.registerObject(instance!.uuid, obj, {});

            const lambdas = manager.getObjectLambdas(obj);

            expect(lambdas).toHaveLength(1);
            expect(lambdas[0]).toBe(instance);
        });

        it("should return empty for unregistered object", () => {
            expect(manager.getObjectLambdas(new Object3D())).toHaveLength(0);
        });
    });

    describe("dispose", () => {
        it("should destroy all instances but keep registered classes", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = (await manager.createInstance("test-lambda")) as MockLambda;

            manager.dispose();

            expect(instance.disposeCalled).toBe(true);
            expect(manager.getInstance(instance.uuid)).toBeNull();
            // Classes should be preserved for reuse between play cycles
            expect(manager.hasLambdaClass("test-lambda")).toBe(true);
        });
    });

    describe("fullDispose", () => {
        it("should destroy all instances and clear registries", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = (await manager.createInstance("test-lambda")) as MockLambda;

            manager.fullDispose();

            expect(instance.disposeCalled).toBe(true);
            expect(manager.getInstance(instance.uuid)).toBeNull();
            expect(manager.hasLambdaClass("test-lambda")).toBe(false);
        });
    });

    describe("query", () => {
        const configA: LambdaConfig = {
            ...mockConfig,
            id: "velocity",
            name: "Velocity",
        };
        const configB: LambdaConfig = {
            ...mockConfig,
            id: "collider",
            name: "Collider",
        };

        it("should find objects matching required lambda types", async () => {
            manager.registerLambdaClass("velocity", configA, MockLambda);
            manager.registerLambdaClass("collider", configB, MockLambda);
            const instA = await manager.createInstance("velocity");
            const instB = await manager.createInstance("collider");

            const obj1 = new Object3D();
            const obj2 = new Object3D();
            manager.registerObject(instA!.uuid, obj1, {});
            manager.registerObject(instB!.uuid, obj1, {});
            manager.registerObject(instA!.uuid, obj2, {}); // only velocity

            const results = manager.query({required: ["velocity", "collider"]});
            expect(results).toHaveLength(1);
            expect(results[0]).toBe(obj1);
        });

        it("should exclude objects with excluded lambda types", async () => {
            manager.registerLambdaClass("velocity", configA, MockLambda);
            manager.registerLambdaClass("collider", configB, MockLambda);
            const instA = await manager.createInstance("velocity");
            const instB = await manager.createInstance("collider");

            const obj1 = new Object3D();
            const obj2 = new Object3D();
            manager.registerObject(instA!.uuid, obj1, {});
            manager.registerObject(instA!.uuid, obj2, {});
            manager.registerObject(instB!.uuid, obj2, {}); // has collider → excluded

            const results = manager.query({
                required: ["velocity"],
                excluded: ["collider"],
            });
            expect(results).toHaveLength(1);
            expect(results[0]).toBe(obj1);
        });

        it("should update archetype after deregisterObject", async () => {
            manager.registerLambdaClass("velocity", configA, MockLambda);
            manager.registerLambdaClass("collider", configB, MockLambda);
            const instA = await manager.createInstance("velocity");
            const instB = await manager.createInstance("collider");

            const obj = new Object3D();
            manager.registerObject(instA!.uuid, obj, {});
            manager.registerObject(instB!.uuid, obj, {});

            expect(manager.query({required: ["velocity", "collider"]})).toHaveLength(1);

            manager.deregisterObject(instB!.uuid, obj);

            expect(manager.query({required: ["velocity", "collider"]})).toHaveLength(0);
            expect(manager.query({required: ["velocity"]})).toHaveLength(1);
        });

        it("should update archetype after destroyInstance", async () => {
            manager.registerLambdaClass("velocity", configA, MockLambda);
            const inst = await manager.createInstance("velocity");
            const obj = new Object3D();
            manager.registerObject(inst!.uuid, obj, {});

            expect(manager.query({required: ["velocity"]})).toHaveLength(1);

            manager.destroyInstance(inst!.uuid);

            expect(manager.query({required: ["velocity"]})).toHaveLength(0);
        });

        it("should clear archetypes on dispose", async () => {
            manager.registerLambdaClass("velocity", configA, MockLambda);
            const inst = await manager.createInstance("velocity");
            const obj = new Object3D();
            manager.registerObject(inst!.uuid, obj, {});

            manager.dispose();

            expect(manager.query({})).toHaveLength(0);
        });
    });

    describe("sendEventToObjectLambdas", () => {
        it("should send events to all lambdas associated with an object", async () => {
            manager.registerLambdaClass("test-lambda", mockConfig, MockLambda);
            const instance = await manager.createInstance("test-lambda");
            const obj = new Object3D();
            manager.registerObject(instance!.uuid, obj, {});

            const eventSpy = vi.spyOn(instance!, "onEvent");
            manager.sendEventToObjectLambdas(obj, "trigger", {type: "activate"});

            expect(eventSpy).toHaveBeenCalledWith("trigger", {type: "activate"});
        });

        it("should handle event errors gracefully", async () => {
            class ErrorEventLambda extends LambdaBase {
                onEvent(): void {
                    throw new Error("Event error");
                }
            }

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            manager.registerLambdaClass("error-lambda", {...mockConfig, id: "error-lambda"}, ErrorEventLambda);
            const instance = await manager.createInstance("error-lambda");
            const obj = new Object3D();
            manager.registerObject(instance!.uuid, obj, {});

            // Should not throw
            manager.sendEventToObjectLambdas(obj, "trigger", {});
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });
});
