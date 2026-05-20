import * as path from "node:path";
import * as THREE from "three";
import {PCFSoftShadowMap} from "three";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    createAsset: vi.fn(),
    getAsset: vi.fn(),
    getAssets: vi.fn(),
    getAssetRevisionData: vi.fn(),
    preloadPhysicsEngine: vi.fn(),
}));

vi.mock("i18next", async importOriginal => ({
    ...await importOriginal<typeof import("i18next")>(),
    t: (key: string) => key,
}));

vi.mock("@stem/network/api/asset", () => ({
    AssetType: {
        Audio: "Audio",
        Behavior: "Behavior",
        File: "File",
        HDRI: "HDRI",
        Image: "Image",
        Model: "Model",
        Prefab: "Prefab",
        Quarks: "Quarks",
        Video: "Video",
    },
    createAssetDerivativeWithData: vi.fn(),
    getAsset: (...args: unknown[]) => hoisted.getAsset(...args),
    getAssets: (...args: unknown[]) => hoisted.getAssets(...args),
    getSceneAssets: vi.fn(),
    getAssetRevisionData: (...args: unknown[]) => hoisted.getAssetRevisionData(...args),
}));

vi.mock("@stem/network/api/scene", () => ({
    saveScene: vi.fn(),
}));

vi.mock("@stem/network/api/scene/v2", () => ({
    createSceneAssetWithData: vi.fn(),
}));

vi.mock("@stem/network/api/copilotTasks", () => ({
    createCopilotTask: vi.fn(),
    deleteCopilotTask: vi.fn(),
    listCopilotTasks: vi.fn(() => Promise.resolve([])),
    updateCopilotTask: vi.fn(),
}));

vi.mock("../../asset-management/AssetResolutionContext", () => ({
    emptyAssetResolutionContext: {assetIdToRevisionId: {}, logicalIdToAssetId: {}},
    getAssetResolutionContext: vi.fn(() => null),
    removeAssetRevision: vi.fn(),
    resolveAssetRevisionId: vi.fn(),
    setAssetRevision: vi.fn(),
}));

vi.mock("../../command/Commands", () => {
    const setVector = (target: THREE.Vector3, value: THREE.Vector3) => {
        target.set(value.x, value.y, value.z);
    };

    const firstMaterial = (object: THREE.Object3D): THREE.Material | null => {
        let material: THREE.Material | null = null;
        object.traverse(child => {
            if (material || !(child instanceof THREE.Mesh)) return;
            material = Array.isArray(child.material) ? child.material[0] ?? null : child.material;
        });
        return material;
    };

    return {
        Add3dObjectCommand: class {
            async execute() {
                return {status: "success"};
            }
        },
        AddObjectCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly parent?: THREE.Object3D,
            ) {}
            async execute() {
                const {default: global} = await import("../../global");
                const scene = (global as any).app?.editor?.scene || (global as any).app?.scene;
                (this.parent || scene)?.add(this.object);
                return {status: "success", message: `Added ${this.object.name}`};
            }
        },
        AttachBehaviorCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly behaviorId: string,
                private readonly options: Record<string, unknown>,
            ) {}
            execute() {
                const behaviors = Array.isArray(this.object.userData.behaviors)
                    ? this.object.userData.behaviors
                    : [];
                behaviors.push({
                    id: this.behaviorId,
                    enabled: true,
                    attributesData: (this.options as any).attributesData || {},
                    throttleConfig: (this.options as any).throttleConfig,
                });
                this.object.userData.behaviors = behaviors;
                return {status: "success", message: `Attached ${this.behaviorId}`};
            }
        },
        DetachBehaviorCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly _slot: string,
                private readonly behaviorId: string,
            ) {}
            execute() {
                this.object.userData.behaviors = (this.object.userData.behaviors || [])
                    .filter((behavior: Record<string, unknown>) => behavior.id !== this.behaviorId);
                return {status: "success", message: `Detached ${this.behaviorId}`};
            }
        },
        MoveObjectCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly newParent: THREE.Object3D,
            ) {}
            execute() {
                this.object.parent?.remove(this.object);
                this.newParent.add(this.object);
                this.object.updateMatrixWorld(true);
                return {status: "success", message: `Moved ${this.object.name}`};
            }
        },
        RemoveObjectCommand: class {
            constructor(private readonly object: THREE.Object3D) {}
            async execute() {
                this.object.parent?.remove(this.object);
                return {status: "success", message: `Removed ${this.object.name}`};
            }
        },
        SetColorCommand: class {
            constructor(
                private readonly object: any,
                private readonly attributeName: string,
                private readonly newValue: unknown,
            ) {}
            execute() {
                if (this.object[this.attributeName]?.setHex && typeof this.newValue === "number") {
                    this.object[this.attributeName].setHex(this.newValue);
                } else if (this.object[this.attributeName]?.set) {
                    this.object[this.attributeName].set(this.newValue);
                } else {
                    this.object[this.attributeName] = this.newValue;
                }
                return {status: "success"};
            }
        },
        SetMaterialColorCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly attributeName: string,
                private readonly newValue: unknown,
            ) {}
            execute() {
                const material = firstMaterial(this.object) as THREE.MeshStandardMaterial | null;
                const color = material?.[this.attributeName as "color"];
                if (color instanceof THREE.Color) {
                    color.set(this.newValue as THREE.ColorRepresentation);
                }
                return {status: "success"};
            }
        },
        SetMaterialTextureCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly assetId: string,
                private readonly assetType: string,
                private readonly name: string,
                private readonly provider: string,
            ) {}
            async execute() {
                this.object.userData.materialSettings = {
                    default: {
                        textures: {
                            base: this.assetId,
                        },
                        textureAsset: {
                            assetId: this.assetId,
                            assetType: this.assetType,
                            name: this.name,
                            provider: this.provider,
                        },
                    },
                };
                return {status: "success"};
            }
        },
        SetPositionCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly newPosition: THREE.Vector3,
            ) {}
            execute() {
                setVector(this.object.position, this.newPosition);
                this.object.updateMatrixWorld(true);
                return {status: "success"};
            }
        },
        SetRotationCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly newRotation: THREE.Euler,
            ) {}
            execute() {
                this.object.rotation.copy(this.newRotation);
                this.object.updateMatrixWorld(true);
                return {status: "success"};
            }
        },
        SetScaleCommand: class {
            constructor(
                private readonly object: THREE.Object3D,
                private readonly newScale: THREE.Vector3,
            ) {}
            execute() {
                setVector(this.object.scale, this.newScale);
                this.object.updateMatrixWorld(true);
                return {status: "success"};
            }
        },
        SetValueCommand: class {
            constructor(
                private readonly object: Record<string, unknown>,
                private readonly attributeName: string,
                private readonly newValue: unknown,
            ) {}
            execute() {
                this.object[this.attributeName] = this.newValue;
                return {status: "success"};
            }
        },
    };
});

vi.mock("../../controls/AiWorldController/AiWorldController", () => ({
    default: {
        getInstance: vi.fn(() => ({
            modelGeneratorProvider: {
                submitGenerationJob: vi.fn(() => Promise.resolve({jobId: "job-1"})),
            },
        })),
    },
}));

vi.mock("../../controls/AiWorldController/AiWorldController.utils", () => ({
    urlToFile: vi.fn(() => Promise.resolve(new File(["texture"], "texture.png", {type: "image/png"}))),
}));

vi.mock("../../editor/asset-management/hooks/assets", () => ({
    createAsset: (...args: unknown[]) => hoisted.createAsset(...args),
    refreshEditorAssets: vi.fn(),
    refreshSceneAssets: vi.fn(),
}));

vi.mock("../../editor/asset-management/util/scene", () => ({
    removeAssetInstancesFromScene: vi.fn(),
}));

vi.mock("../../editor/assets/v2/materials/materialUtils", () => {
    const firstMaterial = (object: THREE.Object3D): THREE.MeshStandardMaterial | null => {
        let material: THREE.MeshStandardMaterial | null = null;
        object.traverse(child => {
            if (material || !(child instanceof THREE.Mesh)) return;
            const found = Array.isArray(child.material) ? child.material[0] : child.material;
            material = found instanceof THREE.MeshStandardMaterial ? found : null;
        });
        return material;
    };

    return {
        applyMaterialValueOverridesToObject: (object: THREE.Object3D, overrides: Record<string, unknown>) => {
            const material = firstMaterial(object);
            if (material) {
                if (typeof overrides.color === "string") material.color.set(overrides.color);
                if (typeof overrides.opacity === "number") {
                    material.opacity = overrides.opacity;
                    material.transparent = overrides.opacity < 1;
                }
                if (typeof overrides.metalness === "number") material.metalness = overrides.metalness;
                if (typeof overrides.roughness === "number") material.roughness = overrides.roughness;
            }
            object.userData.materialSettings = {
                default: {
                    texturesSettings: {
                        color: overrides.color,
                        opacity: overrides.opacity,
                        metallic: overrides.metalness,
                        roughness: overrides.roughness,
                    },
                    tileAmountX: overrides.tileAmountX,
                    tileAmountY: overrides.tileAmountY,
                    panningSpeedX: overrides.panningSpeedX,
                    panningSpeedY: overrides.panningSpeedY,
                },
            };
        },
        applyTextureOverridesToObject: (object: THREE.Object3D, overrides: Record<string, unknown>) => {
            object.userData.materialSettings = {
                default: {
                    textures: {...overrides},
                },
            };
        },
    };
});

vi.mock("../../editor/assets/v2/RightPanel/sections/MaterialRenderingSection/types", () => ({}));

vi.mock("../../physics/PhysicsEngineFactory", () => ({
    PhysicsEngineFactory: {
        preload: (...args: unknown[]) => {
            hoisted.preloadPhysicsEngine(...args);
            return Promise.resolve();
        },
    },
}));

vi.mock("../../prefab/serialization", () => ({
    serializePrefab: vi.fn(() => ({
        data: "{}",
        assetResolutionContext: {assetIdToRevisionId: {}, logicalIdToAssetId: {}},
    })),
}));

vi.mock("../../prefab/util", () => ({
    loadPrefab: vi.fn(() => Promise.resolve(new THREE.Group())),
    setPrefabId: vi.fn(),
}));

vi.mock("../../queryClient", () => ({
    queryClient: {},
}));

vi.mock("../../showToast", () => ({
    showToast: vi.fn(),
}));

vi.mock("../../utils/Converter", () => ({
    default: {},
}));

vi.mock("../../utils/MeshUtils", () => ({
    default: {},
}));

vi.mock("../../utils/ModelGeneratorProvider", () => ({
    GENERATOR_TYPES: {MESHY: "meshy"},
}));

vi.mock("../../utils/ModelUtils", () => ({
    ModelUtils: {},
}));

vi.mock("../../utils/SceneUtil", () => ({
    traverseSceneDepthFirst: vi.fn(),
}));

vi.mock("../../utils/TagUtil", () => ({
    default: {
        addTag: (object: THREE.Object3D, tags: string[]) => {
            object.userData.tags = [...object.userData.tags || [], ...tags];
        },
    },
}));

vi.mock("../../v2/pages/services", () => ({
    generateUniqueName: (base: string) => base,
    getObjectNamesInScene: vi.fn(() => []),
}));

import global from "../../global";
import {CommandsExecutor} from "../CommandsExecutor";
import {CommandsRegistry} from "../CommandsRegistry";
import {normalizeCommandParameters} from "../parameterNormalization";
import {ScriptCommandParser} from "./ScriptCommandParser";
import {ScriptExecutor} from "./ScriptExecutor";
import {deriveCheckPlan} from "./checkScript";
import {ALIAS_MAP, SUPPORTED_RAW_COMMANDS} from "./aliases";
import {
    STEMSCRIPT_ALIAS_SAMPLES,
    STEMSCRIPT_BUILTIN_CONTRACT_BY_NAME,
    STEMSCRIPT_COMMAND_CONTRACT_BY_NAME,
    STEMSCRIPT_COMMAND_CONTRACTS,
    getMissingRawCommandContracts,
    isMutationContract,
} from "./commandContractMatrix";

type Harness = ReturnType<typeof createHarness>;

const IMPORTER_STEMSCRIPT_FIXTURES = import.meta.glob(
    "../../../../stemstudio-importer/**/*.stemscript",
    {query: "?raw", import: "default", eager: true},
);

function createHarness() {
    const scene = new THREE.Scene();
    scene.name = "Default Scene";
    scene.userData = {};

    const camera = new THREE.PerspectiveCamera(55, 1, 1, 100000);
    camera.name = "DefaultCamera";
    camera.userData.cameraData = {
        cameraFOV: 55,
        cameraNear: 1,
        cameraFar: 100000,
        cameraType: "Third Person",
    };

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.name = "Directional Light";
    directional.castShadow = false;
    scene.add(directional);

    const editor = {
        scene,
        sceneID: "scene-contract",
        sceneName: "Untitled Contract Scene",
        selected: null as THREE.Object3D | null,
        assetSource: {
            kind: "scene",
            getAssets: vi.fn(() => Promise.resolve({assets: []})),
        },
        behaviorAttributeConverter: {
            getAttributeConverter: vi.fn(() => ({})),
        },
        behaviorConfigRegistry: {
            getAllConfigs: vi.fn(() => []),
            getConfig: vi.fn((id: string) => ({
                id,
                name: id,
                attributes: {},
                isScript: true,
            })),
            unregisterConfig: vi.fn(),
        },
        behaviorScriptRegistry: {
            getScript: vi.fn(() => ""),
            unregisterScript: vi.fn(),
        },
        addObject: vi.fn((object: THREE.Object3D, parent?: THREE.Object3D) => {
            (parent || scene).add(object);
        }),
        cloneObjectByUuid: vi.fn(async (uuid: string, _unused: unknown, position: any, onClone: (object: THREE.Object3D) => void) => {
            const original = scene.getObjectByProperty("uuid", uuid);
            const clone = original?.clone(true) || new THREE.Group();
            clone.name = `${original?.name || "Object"} Copy`;
            if (position) clone.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
            scene.add(clone);
            onClone(clone);
        }),
        execute: vi.fn((command: {execute: () => unknown}) => command.execute()),
        history: {
            execute: vi.fn((command: {execute: () => unknown}) => command.execute()),
        },
        moveObjectToCameraClosestPoint: vi.fn((object: THREE.Object3D) => object.position.set(0, 0, -4)),
        removeObject: vi.fn((object: THREE.Object3D) => object.parent?.remove(object)),
        select: vi.fn(),
        serializeObject: vi.fn((object: THREE.Object3D) => object.toJSON()),
    };

    const app = {
        camera,
        scene,
        editor,
        environmentManager: {
            updateEnvironmentSettings: vi.fn(() => Promise.resolve()),
        },
        physics: {
            addObject: vi.fn(() => Promise.resolve()),
            removeObject: vi.fn(),
        },
        call: vi.fn(),
    };
    (global as any).app = app;

    const registry = new CommandsRegistry();
    const executor = new CommandsExecutor(registry);

    return {app, camera, editor, executor, registry, scene};
}

async function executeLine(harness: Harness, line: string) {
    const parsed = ScriptCommandParser.parse(line);
    expect(parsed.isBuiltin, line).toBe(false);
    const execution = await harness.executor.executeCommand(parsed.command, parsed.params);
    expect(execution.success, execution.error || line).toBe(true);
    expect(execution.result?.status, execution.result?.message || line).toBe("success");
    return execution.result!.data;
}

async function executeLineResult(harness: Harness, line: string) {
    const parsed = ScriptCommandParser.parse(line);
    expect(parsed.isBuiltin, line).toBe(false);
    const execution = await harness.executor.executeCommand(parsed.command, parsed.params);
    expect(execution.success, execution.error || line).toBe(true);
    expect(execution.result, line).toBeDefined();
    return execution.result!;
}

async function getLine(harness: Harness, line: string) {
    return executeLine(harness, line);
}

function valueAtPath(value: unknown, dataPath: string): unknown {
    if (!dataPath) return value;
    return dataPath.split(".").reduce<unknown>((current, key) => {
        if (current === null || current === undefined) return undefined;
        return (current as Record<string, unknown>)[key];
    }, value);
}

function expectPath(value: unknown, dataPath: string, expected: unknown): void {
    const actual = valueAtPath(value, dataPath);
    if (typeof expected === "number") {
        expect(actual).toBeCloseTo(expected);
    } else {
        expect(actual).toEqual(expected);
    }
}

describe("StemScript command contract matrix", () => {
    it("classifies every raw script command", () => {
        expect(getMissingRawCommandContracts()).toEqual([]);
    });

    it("parses every raw command sample to the contracted command", () => {
        for (const contract of STEMSCRIPT_COMMAND_CONTRACTS) {
            const parsed = ScriptCommandParser.parse(contract.sample);
            expect(parsed.command, contract.sample).toBe(contract.command);
            expect(parsed.isBuiltin, contract.sample).toBe(false);
        }
    });

    it("parses every builtin command sample as a contracted builtin", () => {
        for (const contract of STEMSCRIPT_BUILTIN_CONTRACT_BY_NAME.values()) {
            const parsed = ScriptCommandParser.parse(contract.sample);
            expect(parsed.command, contract.sample).toBe(contract.command);
            expect(parsed.isBuiltin, contract.sample).toBe(true);
        }
    });

    it("parses every alias map entry to a contracted command", () => {
        for (const [alias, mapping] of Object.entries(ALIAS_MAP)) {
            const targetSuffix = mapping.targetParam ? " ContractTarget" : "";
            const parsed = ScriptCommandParser.parse(`${alias}${targetSuffix}`);

            expect(parsed.command, alias).toBe(mapping.command);
            expect(STEMSCRIPT_COMMAND_CONTRACT_BY_NAME.has(parsed.command), alias).toBe(true);
            if (mapping.targetParam) {
                expect(parsed.params[mapping.targetParam], alias).toBe("ContractTarget");
            }
        }
    });

    it("parses every primitive shorthand sample", () => {
        for (const sample of STEMSCRIPT_ALIAS_SAMPLES) {
            const parsed = ScriptCommandParser.parse(sample.input);
            expect(parsed.command, sample.input).toBe(sample.command);
            expect(parsed.params.type, sample.input).toBeDefined();
        }
    });

    it("requires check probes or explicit skip reasons for mutating commands", () => {
        for (const contract of STEMSCRIPT_COMMAND_CONTRACTS.filter(isMutationContract)) {
            const plan = deriveCheckPlan(ScriptExecutor.parseScript(contract.sample));
            if (contract.verification === "intentional-skip") {
                expect(contract.skipReason, contract.command).toBeTruthy();
                expect(plan.probes, contract.command).toHaveLength(0);
                expect(plan.skipped[0]?.reason, contract.command).toBe("no deterministic getter probe available");
            } else {
                expect(plan.probes.length, contract.command).toBeGreaterThan(0);
                expect(plan.skipped, contract.command).toHaveLength(0);
            }
        }
    });

    it("keeps the supported raw command list free of uncontracted entries", () => {
        const contracted = new Set(STEMSCRIPT_COMMAND_CONTRACTS.map(contract => contract.command));
        const uncontracted = SUPPORTED_RAW_COMMANDS.filter(command => !contracted.has(command));

        expect(uncontracted).toEqual([]);
    });
});

describe("StemScript set/get contract harness", () => {
    let harness: Harness;

    beforeEach(() => {
        hoisted.createAsset.mockReset();
        hoisted.getAsset.mockReset();
        hoisted.getAssets.mockReset();
        hoisted.getAssetRevisionData.mockReset();
        hoisted.preloadPhysicsEngine.mockReset();

        hoisted.createAsset.mockResolvedValue({id: "asset-created", headRevisionId: "revision-created"});
        hoisted.getAsset.mockResolvedValue({
            id: "asset-prefab",
            name: "ContractPrefabAsset",
            type: "Prefab",
            headRevisionId: "revision-prefab",
            latestRelease: {revisionId: "revision-prefab"},
        });
        hoisted.getAssets.mockResolvedValue({assets: []});
        hoisted.getAssetRevisionData.mockResolvedValue(new Blob(["asset"]));

        harness = createHarness();
    });

    afterEach(() => {
        (global as any).app = null;
    });

    it("applies camera settings and reads back stored and live projection fields", async () => {
        await executeLine(harness, 'camera "DefaultCamera" cameraType=NONE fov=60 near=0.01 far=500');

        const cameraSettings = await getLine(harness, 'get camera "DefaultCamera"');

        expectPath(cameraSettings, "cameraType", "NONE");
        expectPath(cameraSettings, "fov", 60);
        expectPath(cameraSettings, "near", 0.01);
        expectPath(cameraSettings, "far", 500);
        expectPath(cameraSettings, "projection.fov", 60);
        expectPath(cameraSettings, "projection.near", 0.01);
        expectPath(cameraSettings, "projection.far", 500);
        expect(harness.camera.near).toBe(0.01);
    });

    it("applies primitive, object, move, and material settings through getters", async () => {
        await executeLine(
            harness,
            'add box name=ContractBox position=1,2,3 size=2,4,6 color=#ff0000 objectSettings={isStatic:true,isSelectable:false}',
        );
        await executeLine(harness, "add group name=ContractGroup position=0,1,0");
        await executeLine(harness, "move ContractBox parent=ContractGroup");
        await executeLine(harness, "update ContractBox position=3,4,5 scale=2,2,2 tag=Player color=#00ff00");
        await executeLine(
            harness,
            "material ContractBox color=#336699 opacity=0.5 metalness=0.2 roughness=0.7 tileAmountX=2 tileAmountY=3 panningSpeedX=0.1 panningSpeedY=0.2",
        );

        const objectSettings = await getLine(harness, "get box ContractBox");
        expectPath(objectSettings, "kind", "box");
        expectPath(objectSettings, "parent.name", "ContractGroup");
        expectPath(objectSettings, "transform.position", {x: 3, y: 4, z: 5});
        expectPath(objectSettings, "transform.scale", {x: 2, y: 2, z: 2});
        expectPath(objectSettings, "objectSettings.isStatic", true);
        expectPath(objectSettings, "objectSettings.isSelectable", false);
        expectPath(objectSettings, "tags", ["Player"]);
        expectPath(objectSettings, "material.color", "#336699");
        expectPath(objectSettings, "material.opacity", 0.5);
        expectPath(objectSettings, "material.metalness", 0.2);
        expectPath(objectSettings, "material.roughness", 0.7);
        expectPath(objectSettings, "material.tileAmountX", 2);
        expectPath(objectSettings, "material.tileAmountY", 3);
        expectPath(objectSettings, "geometry.parameters.width", 2);
        expectPath(objectSettings, "geometry.parameters.height", 4);
        expectPath(objectSettings, "geometry.parameters.depth", 6);

        const materialSettings = await getLine(harness, "get material ContractBox");
        expectPath(materialSettings, "color", "#336699");
        expectPath(materialSettings, "opacity", 0.5);
    });

    it.each([
        {
            line: "add cylinder name=ContractCylinder size=4,6,1 radialSegments=12 heightSegments=5",
            getter: "get cylinder ContractCylinder",
            expected: {
                kind: "cylinder",
                "geometry.parameters.radiusTop": 2,
                "geometry.parameters.radiusBottom": 2,
                "geometry.parameters.height": 6,
                "geometry.parameters.radialSegments": 12,
                "geometry.parameters.heightSegments": 5,
            },
        },
        {
            line: "add cone name=ContractCone size=4,6,1 radialSegments=10 heightSegments=3",
            getter: "get cone ContractCone",
            expected: {
                kind: "cone",
                "geometry.parameters.radius": 2,
                "geometry.parameters.height": 6,
                "geometry.parameters.radialSegments": 10,
                "geometry.parameters.heightSegments": 3,
            },
        },
        {
            line: "add plane name=ContractPlane size=4,1,8 widthSegments=4 heightSegments=8",
            getter: "get plane ContractPlane",
            expected: {
                kind: "plane",
                "geometry.parameters.width": 4,
                "geometry.parameters.height": 8,
                "geometry.parameters.widthSegments": 4,
                "geometry.parameters.heightSegments": 8,
            },
        },
        {
            line: "add torus name=ContractTorus size=4,1,1 radialSegments=8 tubularSegments=18",
            getter: "get torus ContractTorus",
            expected: {
                kind: "torus",
                "geometry.parameters.radius": 2,
                "geometry.parameters.tube": 0.5,
                "geometry.parameters.radialSegments": 8,
                "geometry.parameters.tubularSegments": 18,
            },
        },
        {
            line: "add torusknot name=ContractTorusKnot size=4,1,1 radialSegments=7 tubularSegments=20",
            getter: "get torusknot ContractTorusKnot",
            expected: {
                kind: "torusknot",
                "geometry.parameters.radius": 2,
                "geometry.parameters.tube": 0.5,
                "geometry.parameters.radialSegments": 7,
                "geometry.parameters.tubularSegments": 20,
            },
        },
        {
            line: "add triangle name=ContractTriangle size=4,1,1",
            getter: "get triangle ContractTriangle",
            expected: {
                kind: "triangle",
                "geometry.parameters.radius": 4,
            },
        },
        {
            line: "add capsule name=ContractCapsule size=4,6,1 radialSegments=9 capSegments=5",
            getter: "get capsule ContractCapsule",
            expected: {
                kind: "capsule",
                "geometry.parameters.radius": 2,
                "geometry.parameters.height": 6,
                "geometry.parameters.radialSegments": 9,
                "geometry.parameters.capSegments": 5,
            },
        },
        {
            line: "add icosahedron name=ContractIcosahedron size=4,1,1",
            getter: "get icosahedron ContractIcosahedron",
            expected: {
                kind: "icosahedron",
                "geometry.parameters.radius": 2,
            },
        },
        {
            line: "add octahedron name=ContractOctahedron size=4,1,1",
            getter: "get octahedron ContractOctahedron",
            expected: {
                kind: "octahedron",
                "geometry.parameters.radius": 2,
            },
        },
        {
            line: "add dodecahedron name=ContractDodecahedron size=4,1,1",
            getter: "get dodecahedron ContractDodecahedron",
            expected: {
                kind: "dodecahedron",
                "geometry.parameters.radius": 2,
            },
        },
        {
            line: "add ring name=ContractRing size=2,6,1 thetaSegments=24 phiSegments=3",
            getter: "get ring ContractRing",
            expected: {
                kind: "ring",
                "geometry.parameters.innerRadius": 1,
                "geometry.parameters.outerRadius": 3,
                "geometry.parameters.thetaSegments": 24,
                "geometry.parameters.phiSegments": 3,
            },
        },
    ])("applies primitive geometry settings for $expected.kind", async ({line, getter, expected}) => {
        await executeLine(harness, line);
        const objectSettings = await getLine(harness, getter);

        for (const [dataPath, value] of Object.entries(expected)) {
            expectPath(objectSettings, dataPath, value);
        }
    });

    it("clones and deletes objects with getter-visible results", async () => {
        await executeLine(harness, "add box name=CloneSource position=0,0,0 color=#224466");
        await executeLine(harness, "clone CloneSource position=5,0,0");

        const clone = await getLine(harness, 'get box "CloneSource Copy"');
        expectPath(clone, "name", "CloneSource Copy");
        expectPath(clone, "transform.position", {x: 5, y: 0, z: 0});
        expectPath(clone, "material.color", "#224466");

        await executeLine(harness, "delete CloneSource");
        const deleted = await executeLineResult(harness, "get box CloneSource");
        expect(deleted.status).toBe("failed");
        expect(deleted.message).toContain("Object not found");
    });

    it("applies physics settings and scene physics engine settings", async () => {
        await executeLine(harness, "add sphere name=PhysicsBall position=0,1,0");
        await executeLine(harness, "physics enable PhysicsBall shape=sphere ctype=dynamic mass=2");
        await executeLine(
            harness,
            'physics set PhysicsBall config={enabled:true,friction:0.4,restitution:0.1}',
        );
        await executeLine(harness, "physics engine ammo gravity=-9.81");

        const physicsSettings = await getLine(harness, "get physics PhysicsBall");
        expectPath(physicsSettings, "physics.enabled", true);
        expectPath(physicsSettings, "physics.shape", "btSphereShape");
        expectPath(physicsSettings, "physics.mass", 2);
        expectPath(physicsSettings, "physics.friction", 0.4);
        expectPath(physicsSettings, "physics.restitution", 0.1);
        expectPath(physicsSettings, "physics.ctype", "Dynamic");

        await executeLine(harness, "physics disable PhysicsBall");
        const disabledPhysicsSettings = await getLine(harness, "get physics PhysicsBall");
        expectPath(disabledPhysicsSettings, "physics.enabled", false);

        const engineSettings = await getLine(harness, "get physics engine");
        expectPath(engineSettings, "engine", "ammo");
        expectPath(engineSettings, "gravity", -9.81);
        expect(hoisted.preloadPhysicsEngine).toHaveBeenCalledWith("ammo");
    });

    it("rejects unsupported physics engine values", async () => {
        const result = await executeLineResult(harness, "physics engine invalid gravity=-9.81");

        expect(result.status).toBe("failed");
        expect(result.message).toContain("Invalid physics engine");
    });

    it("applies scene-level settings and reads them through category getters", async () => {
        await executeLine(harness, 'scene lighting ambient={color:"#ffffff",intensity:0.5} shadows={enabled:true,mapType:"PCFSoftShadowMap"}');
        await executeLine(harness, "scene fog type=linear color=#aabbcc near=5 far=80");
        await executeLine(harness, "scene background type=Color color=#112233");
        await executeLine(harness, "scene tonemapping type=ACESFilmicToneMapping exposure=1.2");
        await executeLine(harness, "scene postprocessing outline={enabled:true,edgeStrength:2} bloom={enabled:true,strength:0.4}");
        await executeLine(harness, "game settings isGame=true lives=3 maxScore=10 timer=60 useAvatar=true isMultiplayer=false showHUD=true");
        await executeLine(harness, "render settings useShadows=true useInstancing=true shadowMapType=PCFSoftShadowMap usePhysicsWorker=true");
        await executeLine(harness, "scene compartments true");
        await executeLine(harness, 'project title "Contract Project"');

        const lighting = await getLine(harness, "get lighting");
        expectPath(lighting, "ambient", {color: "#ffffff", intensity: 0.5});
        expectPath(lighting, "useShadows", true);
        expectPath(lighting, "shadowMapType", PCFSoftShadowMap);

        const fog = await getLine(harness, "get fog");
        expectPath(fog, "type", "linear");
        expectPath(fog, "color", "#aabbcc");
        expectPath(fog, "near", 5);
        expectPath(fog, "far", 80);

        const background = await getLine(harness, "get background");
        expectPath(background, "type", "Color");
        expectPath(background, "color", "#112233");

        const toneMapping = await getLine(harness, "get tone mapping");
        expectPath(toneMapping, "type", "ACESFilmicToneMapping");
        expectPath(toneMapping, "exposure", 1.2);

        const outline = await getLine(harness, "get outline");
        expectPath(outline, "enabled", true);
        expectPath(outline, "edgeStrength", 2);

        const bloom = await getLine(harness, "get bloom");
        expectPath(bloom, "enabled", true);
        expectPath(bloom, "strength", 0.4);

        const game = await getLine(harness, "get game settings");
        expectPath(game, "isGame", true);
        expectPath(game, "lives", 3);
        expectPath(game, "showHUD", true);

        const rendering = await getLine(harness, "get render settings");
        expectPath(rendering, "useShadows", true);
        expectPath(rendering, "useInstancing", true);
        expectPath(rendering, "shadowMapType", PCFSoftShadowMap);
        expectPath(rendering, "usePhysicsWorker", true);

        const compartments = await getLine(harness, "get compartments");
        expectPath(compartments, "compartmentsEnabled", true);

        const project = await getLine(harness, "get project");
        expectPath(project, "title", "Contract Project");
    });

    it("applies light settings through the light getter", async () => {
        await executeLine(harness, "light Directional intensity=2 color=#ffeeaa castShadow=true shadowMapSize=1024 shadowBias=-0.001 shadowNormalBias=0.02 shadowRadius=3");

        const light = await getLine(harness, "get light Directional");

        expectPath(light, "intensity", 2);
        expectPath(light, "color", "#ffeeaa");
        expectPath(light, "castShadow", true);
        expectPath(light, "shadow.mapSize.width", 1024);
        expectPath(light, "shadow.mapSize.height", 1024);
        expectPath(light, "shadow.bias", -0.001);
        expectPath(light, "shadow.normalBias", 0.02);
        expectPath(light, "shadow.radius", 3);
    });

    it("rejects non-light objects through the typed light getter", async () => {
        await executeLine(harness, "add box name=NotALight");

        const result = await executeLineResult(harness, "get light NotALight");

        expect(result.status).toBe("failed");
        expect(result.message).toContain("not a light object");
    });

    it("applies behavior attach, config, and detach through behavior getters", async () => {
        await executeLine(harness, "add box name=BehaviorBox");
        await executeLine(harness, "behavior attach BehaviorBox behaviorId=contract.behavior config={speed:3}");

        let behavior = await getLine(harness, "get behavior BehaviorBox behaviorId=contract.behavior");
        expectPath(behavior, "behavior.id", "contract.behavior");
        expectPath(behavior, "behavior.attributesData.speed", 3);

        await executeLine(harness, "behavior config BehaviorBox behaviorId=contract.behavior attributesData={speed:5} enabled=false");
        behavior = await getLine(harness, "get behavior BehaviorBox behaviorId=contract.behavior");
        expectPath(behavior, "behavior.attributesData.speed", 5);
        expectPath(behavior, "behavior.enabled", false);

        await executeLine(harness, "behavior detach BehaviorBox behaviorId=contract.behavior");
        const objectBehaviorSettings = await getLine(harness, "get behavior BehaviorBox");
        expectPath(objectBehaviorSettings, "behaviors", []);
    });

    it("applies navmesh and navmesh connection settings through behavior getters", async () => {
        await executeLine(harness, "add box name=NavSource");
        await executeLine(harness, "add box name=NavTarget");
        await executeLine(harness, 'navmesh add target="Default Scene" autoGenerate=true agentRadius=0.4');
        await executeLine(harness, "navmesh connection add NavSource target=NavTarget bidirectional=true radius=1.5 showConnection=true");

        const navmesh = await getLine(harness, 'get behavior "Default Scene" behaviorId=navmesh');
        expectPath(navmesh, "behavior.id", "navmesh");
        expectPath(navmesh, "behavior.attributesData.autoGenerate", true);
        expectPath(navmesh, "behavior.attributesData.agentRadius", 0.4);

        const connection = await getLine(harness, "get behavior NavSource behaviorId=navmesh-connection");
        expectPath(connection, "behavior.id", "navmesh-connection");
        expectPath(connection, "behavior.attributesData.bidirectional", true);
        expectPath(connection, "behavior.attributesData.radius", 1.5);
        expectPath(connection, "behavior.attributesData.showConnection", true);
        expectPath(connection, "behavior.attributesData.targetObject", harness.scene.getObjectByName("NavTarget")!.uuid);
    });

    it("applies VFX add and modify settings through the VFX getter", async () => {
        await executeLine(harness, "vfx add name=ContractSmoke position=0,1,0 config={autoStart:true}");
        await executeLine(harness, "vfx modify ContractSmoke position=1,2,3");

        const vfx = await getLine(harness, "get vfx ContractSmoke");

        expectPath(vfx, "name", "ContractSmoke");
        expectPath(vfx, "position", {x: 1, y: 2, z: 3});
        expectPath(vfx, "userData.autoStart", true);
        expectPath(vfx, "userData.isVFX", true);
    });

    it("deletes VFX and reports absence through the VFX getter", async () => {
        await executeLine(harness, "vfx add name=TemporaryVFX position=0,0,0");
        await executeLine(harness, "vfx delete TemporaryVFX");

        const result = await executeLineResult(harness, "get vfx TemporaryVFX");

        expect(result.status).toBe("failed");
        expect(result.message).toContain("VFX emitter not found");
    });
});

describe("StemScript importer corpus contract", () => {
    it("parses importer scripts into known commands and matrix categories", () => {
        const registryHarness = createHarness();
        const files = Object.entries(IMPORTER_STEMSCRIPT_FIXTURES);

        if (files.length === 0) {
            console.warn("Skipping: stemstudio-importer submodule not available");
            return;
        }

        const unknowns: string[] = [];
        const unclassifiedMutations: string[] = [];
        const unsupportedParams: string[] = [];
        const commandCounts = new Map<string, number>();

        try {

            for (const [file, content] of files) {
                for (const line of ScriptExecutor.parseScript(content as string)) {
                    if (!line.parsed || line.isComment || line.isEmpty) continue;
                    const parsed = line.parsed;
                    commandCounts.set(parsed.command, (commandCounts.get(parsed.command) || 0) + 1);

                    if (parsed.isBuiltin) {
                        if (!STEMSCRIPT_BUILTIN_CONTRACT_BY_NAME.has(parsed.command)) {
                            unknowns.push(`${path.normalize(file)}:${line.lineNumber} ${parsed.raw}`);
                        }
                        continue;
                    }

                    const command = registryHarness.registry.getCommand(parsed.command);
                    const contract = STEMSCRIPT_COMMAND_CONTRACT_BY_NAME.get(parsed.command);
                    if (!contract || !command) {
                        unknowns.push(`${path.normalize(file)}:${line.lineNumber} ${parsed.raw}`);
                        continue;
                    }

                    const normalizedParams = normalizeCommandParameters(parsed.command, parsed.params);
                    const allowedParams = new Set(command.parameters.map(param => param.name));
                    const unsupported = Object.keys(normalizedParams).filter(param => !allowedParams.has(param));
                    if (unsupported.length > 0) {
                        unsupportedParams.push(`${path.normalize(file)}:${line.lineNumber} ${parsed.raw} unsupported=${unsupported.join(",")}`);
                    }

                    if (isMutationContract(contract) && contract.verification === "intentional-skip" && !contract.skipReason) {
                        unclassifiedMutations.push(`${parsed.command} from ${path.normalize(file)}:${line.lineNumber}`);
                    }
                }
            }
        } finally {
            (global as any).app = null;
        }

        expect(unknowns).toEqual([]);
        expect(unsupportedParams).toEqual([]);
        expect(unclassifiedMutations).toEqual([]);
        expect(commandCounts.get("set_camera_settings")).toBeGreaterThan(0);
        expect(commandCounts.get("create_primitive")).toBeGreaterThan(0);
        expect(commandCounts.get("attach_behavior")).toBeGreaterThan(0);
    });
});
