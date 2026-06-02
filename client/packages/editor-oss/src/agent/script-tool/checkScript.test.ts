import {describe, expect, it, vi} from "vitest";

import {deriveCheckPlan, deriveCheckProbes, isReadOnlyCommand, runScriptCheck} from "./checkScript";
import {ScriptExecutor} from "./ScriptExecutor";

describe("isReadOnlyCommand", () => {
    it("classifies get_/list_/search_ prefixes and player/select as read-only", () => {
        for (const cmd of ["get_scene_objects", "get_light_settings", "list_behaviors", "list_lambdas", "search_external_assets", "player", "select"]) {
            expect(isReadOnlyCommand(cmd), cmd).toBe(true);
        }
    });

    it("classifies mutating commands as not read-only", () => {
        for (const cmd of ["modify_object", "create_primitive", "set_light_properties", "delete_object", "attach_behavior", "import", "save"]) {
            expect(isReadOnlyCommand(cmd), cmd).toBe(false);
        }
    });
});

describe("checkScript probe derivation", () => {
    it("derives an object getter probe for primitive creation", () => {
        const lines = ScriptExecutor.parseScript('add box name="Crate" position=1,2,3 color=#ff0000');

        const probes = deriveCheckProbes(lines);

        expect(probes).toHaveLength(1);
        expect(probes[0]).toMatchObject({
            lineNumber: 1,
            sourceCommand: "create_primitive",
            getterCommand: "get_object_settings",
            getterParams: {target: "Crate", kind: "box"},
        });
        expect(probes[0]!.assertions).toContainEqual({path: "transform.position", expected: {x: 1, y: 2, z: 3}});
        expect(probes[0]!.assertions).toContainEqual({path: "material.color", expected: "#ff0000"});
    });

    it("derives scene setting probes for post-processing sub-effects", () => {
        const lines = ScriptExecutor.parseScript(
            "scene postprocessing outline={enabled:true,edgeStrength:3} bloom={enabled:true,strength:0.5}",
        );

        const probes = deriveCheckProbes(lines);

        expect(probes.map(probe => probe.getterParams)).toEqual([
            {category: "bloom"},
            {category: "outline"},
        ]);
    });

    it("derives shadow assertions for light settings", () => {
        const lines = ScriptExecutor.parseScript(
            "light Sun intensity=2 castShadow=true shadowMapSize=2048 shadowBias=-0.001 shadowNormalBias=0.02 shadowRadius=4",
        );

        const probes = deriveCheckProbes(lines);

        expect(probes).toHaveLength(1);
        expect(probes[0]!.getterCommand).toBe("get_light_settings");
        expect(probes[0]!.assertions).toEqual(expect.arrayContaining([
            {path: "intensity", expected: 2},
            {path: "castShadow", expected: true},
            {path: "shadow.mapSize.width", expected: 2048},
            {path: "shadow.mapSize.height", expected: 2048},
            {path: "shadow.bias", expected: -0.001},
            {path: "shadow.normalBias", expected: 0.02},
            {path: "shadow.radius", expected: 4},
        ]));
    });

    it("derives direct physics field assertions", () => {
        const lines = ScriptExecutor.parseScript(
            "physics set Player shape=capsule ctype=dynamic mass=1 friction=0.5 restitution=0.1",
        );

        const probes = deriveCheckProbes(lines);

        expect(probes).toHaveLength(1);
        expect(probes[0]!.getterCommand).toBe("get_physics_settings");
        expect(probes[0]!.assertions).toEqual(expect.arrayContaining([
            {path: "physics.shape", expected: "capsule"},
            {path: "physics.ctype", expected: "dynamic"},
            {path: "physics.mass", expected: 1},
            {path: "physics.friction", expected: 0.5},
            {path: "physics.restitution", expected: 0.1},
        ]));
    });

    it("skips getters, builtins, and unsupported commands", () => {
        const lines = ScriptExecutor.parseScript(`get box Crate
check
generate model prompt=tree name=Tree`);

        const plan = deriveCheckPlan(lines);

        expect(plan.probes).toHaveLength(0);
        expect(plan.skipped.map(skip => skip.reason)).toEqual([
            "read-only command",
            "built-in command",
            "no deterministic getter probe available",
        ]);
    });
});

describe("runScriptCheck", () => {
    it("passes when getter data matches derived assertions", async () => {
        const executeGetter = vi.fn().mockResolvedValue({
            success: true,
            data: {
                name: "Crate",
                kind: "box",
                transform: {
                    position: {x: 1, y: 2, z: 3},
                    rotation: {x: 0, y: 0, z: 0, order: "XYZ"},
                    scale: {x: 1, y: 1, z: 1},
                },
                material: {color: "#ff0000"},
                geometry: {parameters: {}},
            },
        });

        const report = await runScriptCheck('add box name="Crate" position=1,2,3 color=#ff0000', executeGetter);

        expect(report.passed).toBe(1);
        expect(report.failed).toBe(0);
        expect(executeGetter).toHaveBeenCalledWith("get_object_settings", {target: "Crate", kind: "box"});
    });

    it("reports mismatches with line and getter context", async () => {
        const report = await runScriptCheck(
            'camera "DefaultCamera" near=0.01 far=500',
            vi.fn().mockResolvedValue({
                success: true,
                data: {near: 1, far: 500},
            }),
        );

        expect(report.failed).toBe(1);
        expect(report.results[0]!.mismatches[0]).toMatchObject({
            lineNumber: 1,
            path: "near",
            expected: 0.01,
            actual: 1,
            getterCommand: "get_camera_settings",
        });
    });

    it("uses numeric tolerance for derived comparisons", async () => {
        const report = await runScriptCheck(
            'camera "DefaultCamera" near=0.01',
            vi.fn().mockResolvedValue({
                success: true,
                data: {near: 0.01005},
            }),
        );

        expect(report.passed).toBe(1);
        expect(report.failed).toBe(0);
    });

    it("normalizes enum-like and color values during comparisons", async () => {
        const cameraReport = await runScriptCheck(
            'camera "DefaultCamera" cameraType="Third Person"',
            vi.fn().mockResolvedValue({
                success: true,
                data: {cameraType: "third_person"},
            }),
        );
        const colorReport = await runScriptCheck(
            "scene fog type=linear color=#AABBCC",
            vi.fn().mockResolvedValue({
                success: true,
                data: {type: "linear", color: "#aabbcc"},
            }),
        );
        const physicsReport = await runScriptCheck(
            "physics set Player shape=capsule ctype=dynamic",
            vi.fn().mockResolvedValue({
                success: true,
                data: {physics: {shape: "btCapsuleShape", ctype: "Dynamic"}},
            }),
        );

        expect(cameraReport.failed).toBe(0);
        expect(colorReport.failed).toBe(0);
        expect(physicsReport.failed).toBe(0);
    });

    it("allows partial object comparisons for nested configs", async () => {
        const report = await runScriptCheck(
            "scene postprocessing outline={enabled:true,edgeStrength:2}",
            vi.fn().mockResolvedValue({
                success: true,
                data: {
                    enabled: true,
                    edgeStrength: 2,
                    edgeGlow: 0.25,
                },
            }),
        );

        expect(report.passed).toBe(1);
        expect(report.failed).toBe(0);
    });

    it("reports missing vector axes as nested object mismatches", async () => {
        const report = await runScriptCheck(
            'add box name="Crate" position=1,2,3',
            vi.fn().mockResolvedValue({
                success: true,
                data: {
                    name: "Crate",
                    kind: "box",
                    transform: {position: {x: 1, y: 2}},
                    geometry: {parameters: {}},
                    material: {},
                },
            }),
        );

        expect(report.failed).toBe(1);
        expect(report.results[0]!.mismatches[0]).toMatchObject({
            path: "transform.position",
            reason: "value mismatch",
        });
    });

    it("reports getter failures as check mismatches", async () => {
        const report = await runScriptCheck(
            'add box name="Crate"',
            vi.fn().mockResolvedValue({
                success: false,
                error: "Object not found",
            }),
        );

        expect(report.failed).toBe(1);
        expect(report.results[0]!.mismatches[0]).toMatchObject({
            path: "(getter)",
            actual: "Object not found",
            reason: "getter failed",
        });
    });
});
