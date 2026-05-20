/**
 * StemScript Serialization Integrity Tests
 *
 * Validates that stemscript commands parse into correct registry commands
 * with parameters that would produce properly serializable objects.
 *
 * Uses embedded stemscript content (from real stemstudio-importer files)
 * to work in jsdom test environment where fs is unavailable.
 */
import {describe, expect, it} from "vitest";

import {ScriptCommandParser, ParsedCommand} from "./ScriptCommandParser";
import {ScriptExecutor} from "./ScriptExecutor";

// ─── Embedded stemscript content ──────────────────────────────────────

/** Subset of solar-system.stemscript */
const SOLAR_SYSTEM_SCRIPT = `
# Solar System — StemStudio Conversion
project title "Solar System"

import image name="SunTex" filepath="textures/2k_sun.jpg" comment="Sun surface texture"
import image name="EarthTex" filepath="textures/2k_earth_daymap.jpg" comment="Earth daymap"
import behavior name="Planet Orbit" filepath="behaviors/planetOrbit.yaml" comment="Orbital motion"
import behavior name="Sun Glow" filepath="behaviors/sunGlow.yaml" comment="Sun point light"

scene background type=Color color=#000000
scene fog type=none
scene lighting ambient={intensity:0.1}
light "AmbientLight" intensity=0.1
light "Directional Light" intensity=0
delete "HemisphereLight"
render settings useShadows=false

game settings isGame=true showHUD=false

add group name="CameraTarget" position=0,0,0
update "CameraTarget" tag=Player

camera "DefaultCamera" cameraType=NONE fov=60 near=0.1 far=500

add sphere name="Sun" position=0,0,0 scale=5,5,5
material Sun metalness=0 roughness=1
behavior attach Sun behaviorId=sw.sunGlow config={textureName:"SunTex",lightIntensity:2,lightDistance:100}
behavior attach Sun behaviorId=sw.planetOrbit config={orbitRadius:0,orbitSpeed:0,rotationSpeed:0.2,textureName:""}

add sphere name="Mercury" position=4,0,0 scale=0.5,0.5,0.5
material Mercury metalness=0.1 roughness=0.8
behavior attach Mercury behaviorId=sw.planetOrbit config={orbitRadius:4,orbitSpeed:4.15,rotationSpeed:0.01,textureName:"MercuryTex"}

add sphere name="Earth" position=7,0,0 scale=1,1,1
material Earth metalness=0.1 roughness=0.7
behavior attach Earth behaviorId=sw.planetOrbit config={orbitRadius:7,orbitSpeed:1.0,rotationSpeed:1.0,textureName:"EarthTex"}

add sphere name="Moon" position=8.2,0,0 scale=0.3,0.3,0.3
material Moon metalness=0.1 roughness=0.9
behavior attach Moon behaviorId=sw.planetOrbit config={orbitRadius:1.2,orbitSpeed:2.5,rotationSpeed:0.5,orbitTarget:"Earth",textureName:"MoonTex"}

behavior attach "Default Scene" behaviorId=sw.solarController
`;

/** Minimal game script for testing */
const MINIMAL_GAME_SCRIPT = `
project title "Test Game"
scene background type=Color color=#2d5016
scene fog type=none
add group name="GameBoard"
add box name="Ground" position=0,-0.5,0 scale=20,1,20 color=#3a7d2a
add sphere name="Ball" position=0,1,0 scale=0.5,0.5,0.5 color=#ff0000
update Ground tag=Ground
update Ball tag=Player
physics enable Ground config={shape:"box",mass:0}
physics enable Ball config={shape:"sphere",mass:1}
material Ground metalness=0.1 roughness=0.9
delete "HemisphereLight"
camera "DefaultCamera" cameraType=THIRD_PERSON fov=60
game settings isGame=true showHUD=true
behavior attach Ground behaviorId=sw.groundBehavior
behavior attach Ball behaviorId=sw.playerController config={speed:5,jumpForce:8}
`;

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 *
 * @param content
 */
function parseAllCommands(content: string): ParsedCommand[] {
    const lines = ScriptExecutor.parseScript(content);
    return lines
        .filter(l => !l.isComment && !l.isEmpty && l.parsed)
        .map(l => l.parsed!);
}

const SCENE_MUTATING_COMMANDS = new Set([
    "create_primitive", "create_group", "clone_object", "delete_object",
    "move_object", "modify_object", "add_model_to_scene", "add_prefab_to_scene",
    "set_material", "set_texture", "set_external_texture",
    "attach_behavior", "add_navmesh", "rebuild_navmesh", "add_navmesh_connection",
    "add_waypoint_path", "add_waypoint", "detach_behavior", "set_behavior_config",
    "enable_physics", "disable_physics", "set_physics",
    "add_vfx", "modify_vfx", "delete_vfx",
]);

const VECTOR3_PARAMS = ["position", "scale", "rotation", "size"];

const ALL_KNOWN_COMMANDS = new Set([
    "create_primitive", "create_group", "clone_object", "delete_object",
    "move_object", "modify_object", "get_scene_objects", "get_object",
    "get_selected_object", "get_player", "set_material", "set_texture",
    "set_external_texture", "list_behaviors", "get_behavior", "add_behavior",
    "update_behavior", "attach_behavior", "add_navmesh", "rebuild_navmesh",
    "add_navmesh_connection", "add_waypoint_path", "add_waypoint",
    "detach_behavior", "remove_behavior",
    "set_behavior_config", "enable_physics", "disable_physics", "set_physics",
    "generate_3d_model", "search_local_assets", "get_library_asset",
    "search_external_assets", "add_model_to_scene", "add_vfx", "modify_vfx",
    "delete_vfx", "get_vfx", "add_vfx_behavior", "remove_vfx_behavior",
    "list_prefabs", "get_prefab", "add_prefab_to_scene", "create_prefab",
    "set_scene_lighting", "set_scene_fog", "set_scene_background",
    "set_tone_mapping", "set_post_processing", "set_camera_settings",
    "set_game_settings", "set_project_title", "set_rendering_settings",
    "get_editor_settings", "set_light_properties",
]);

// ─── Test Suite: Solar System stemscript ──────────────────────────────

describe("StemScript Serialization: solar-system", () => {
    const commands = parseAllCommands(SOLAR_SYSTEM_SCRIPT);

    it("parses all commands without errors", () => {
        expect(commands.length).toBeGreaterThan(0);
        for (const cmd of commands) {
            expect(cmd.command).toBeTruthy();
        }
    });

    it("add sphere commands produce create_primitive with type=sphere", () => {
        const addSpheres = commands.filter(
            c => c.command === "create_primitive" && c.params.type === "sphere",
        );
        expect(addSpheres.length).toBe(4); // Sun, Mercury, Earth, Moon
        for (const cmd of addSpheres) {
            expect(cmd.params.name).toBeTruthy();
        }
    });

    it("all position params are valid Vector3 objects", () => {
        for (const cmd of commands) {
            if (cmd.params.position) {
                const pos = cmd.params.position as {x: number; y: number; z: number};
                expect(typeof pos).toBe("object");
                expect(typeof pos.x).toBe("number");
                expect(typeof pos.y).toBe("number");
                expect(typeof pos.z).toBe("number");
            }
        }
    });

    it("all scale params are valid Vector3 objects", () => {
        for (const cmd of commands) {
            if (cmd.params.scale) {
                const s = cmd.params.scale as {x: number; y: number; z: number};
                expect(typeof s).toBe("object");
                expect(typeof s.x).toBe("number");
                expect(typeof s.y).toBe("number");
                expect(typeof s.z).toBe("number");
            }
        }
    });

    it("behavior attach commands have valid target and behaviorId", () => {
        const attachCmds = commands.filter(c => c.command === "attach_behavior");
        expect(attachCmds.length).toBeGreaterThan(0);
        for (const cmd of attachCmds) {
            expect(cmd.params.target).toBeTruthy();
            expect(cmd.params.behaviorId).toBeTruthy();
        }
    });

    it("material commands target existing objects by name", () => {
        const materialCmds = commands.filter(c => c.command === "set_material");
        expect(materialCmds.length).toBeGreaterThan(0);
        for (const cmd of materialCmds) {
            expect(cmd.params.target).toBeTruthy();
        }
    });

    it("scene setting commands map to correct registry commands", () => {
        const sceneCmds = commands.filter(c =>
            c.command.startsWith("set_scene_") ||
            c.command === "set_rendering_settings" ||
            c.command === "set_game_settings",
        );
        expect(sceneCmds.length).toBeGreaterThan(0);
    });

    it("camera command maps to set_camera_settings", () => {
        const cameraCmds = commands.filter(c => c.command === "set_camera_settings");
        expect(cameraCmds.length).toBe(1);
    });

    it("delete command maps to delete_object with target", () => {
        const deleteCmds = commands.filter(c => c.command === "delete_object");
        expect(deleteCmds.length).toBe(1);
        expect(deleteCmds[0]!.params.target).toBe("HemisphereLight");
    });
});

// ─── Test Suite: Cross-script validation ──────────────────────────────

describe("StemScript Serialization: cross-script validation", () => {
    const scripts = [
        {name: "solar-system", content: SOLAR_SYSTEM_SCRIPT},
        {name: "minimal-game", content: MINIMAL_GAME_SCRIPT},
    ];

    const allCommands = scripts.map(s => ({
        name: s.name,
        commands: parseAllCommands(s.content),
    }));

    it("every non-builtin command maps to a known registry command", () => {
        for (const game of allCommands) {
            const nonBuiltin = game.commands.filter(c => !c.isBuiltin);
            for (const cmd of nonBuiltin) {
                expect(ALL_KNOWN_COMMANDS.has(cmd.command)).toBe(true);
            }
        }
    });

    it("all vector3 params serialize to {x, y, z} format", () => {
        for (const game of allCommands) {
            for (const cmd of game.commands) {
                for (const key of VECTOR3_PARAMS) {
                    if (cmd.params[key]) {
                        const v = cmd.params[key] as {x: number; y: number; z: number};
                        expect(v).toHaveProperty("x");
                        expect(v).toHaveProperty("y");
                        expect(v).toHaveProperty("z");
                        expect(Number.isFinite(v.x)).toBe(true);
                        expect(Number.isFinite(v.y)).toBe(true);
                        expect(Number.isFinite(v.z)).toBe(true);
                    }
                }
            }
        }
    });

    it("create_primitive always has a type param", () => {
        for (const game of allCommands) {
            const primitives = game.commands.filter(c => c.command === "create_primitive");
            for (const cmd of primitives) {
                expect(cmd.params.type).toBeTruthy();
            }
        }
    });

    it("modify_object always has a target param", () => {
        for (const game of allCommands) {
            const modifyCmds = game.commands.filter(c => c.command === "modify_object");
            for (const cmd of modifyCmds) {
                expect(cmd.params.target).toBeTruthy();
            }
        }
    });

    it("delete_object always has a target param", () => {
        for (const game of allCommands) {
            const deleteCmds = game.commands.filter(c => c.command === "delete_object");
            for (const cmd of deleteCmds) {
                expect(cmd.params.target).toBeTruthy();
            }
        }
    });

    it("attach_behavior always has target and behaviorId", () => {
        for (const game of allCommands) {
            const attachCmds = game.commands.filter(c => c.command === "attach_behavior");
            for (const cmd of attachCmds) {
                expect(cmd.params.target).toBeTruthy();
                expect(cmd.params.behaviorId).toBeTruthy();
            }
        }
    });

    it("no scene-mutating command has a missing target when required", () => {
        const targetRequired = new Set([
            "modify_object", "delete_object", "clone_object", "move_object",
            "set_material", "set_texture", "set_external_texture",
            "attach_behavior", "detach_behavior", "set_behavior_config",
            "enable_physics", "disable_physics", "set_physics",
        ]);

        for (const game of allCommands) {
            for (const cmd of game.commands) {
                if (targetRequired.has(cmd.command)) {
                    expect(cmd.params.target).toBeTruthy();
                }
            }
        }
    });

    it("color values are valid hex strings", () => {
        const hexColorRegex = /^#[0-9a-fA-F]{3,8}$/;
        for (const game of allCommands) {
            for (const cmd of game.commands) {
                if (cmd.params.color && typeof cmd.params.color === "string") {
                    const color = cmd.params.color;
                    const isHex = hexColorRegex.test(color);
                    const isNamed = /^[a-zA-Z]+$/.test(color);
                    expect(isHex || isNamed).toBe(true);
                }
            }
        }
    });
});

// ─── Command ordering for serialization correctness ───────────────────

describe("StemScript command ordering: objects must exist before modification", () => {
    const commands = parseAllCommands(SOLAR_SYSTEM_SCRIPT).filter(c => !c.isBuiltin);

    it("objects are created before they are modified or targeted", () => {
        const createdNames = new Set<string>();
        const violations: string[] = [];

        for (const cmd of commands) {
            if (cmd.command === "create_primitive" || cmd.command === "create_group") {
                if (cmd.params.name) createdNames.add(cmd.params.name as string);
            }

            const target = cmd.params.target as string | undefined;
            if (target && SCENE_MUTATING_COMMANDS.has(cmd.command)) {
                const isSceneObject = [
                    "Default Scene", "DefaultCamera", "AmbientLight",
                    "Directional Light", "HemisphereLight",
                ].includes(target);
                if (!isSceneObject && !createdNames.has(target)) {
                    violations.push(`${cmd.command} targets "${target}" before creation`);
                }
            }
        }

        expect(violations).toEqual([]);
    });
});

// ─── Param shape validation ───────────────────────────────────────────

describe("StemScript params match Three.js serialization format", () => {
    it("create_primitive position/scale/rotation are {x,y,z} not arrays", () => {
        const commands = parseAllCommands(
            'add box name="Test" position=1,2,3 scale=2,2,2 rotation=0,1.57,0',
        );
        const cmd = commands[0]!;
        expect(cmd.command).toBe("create_primitive");

        const pos = cmd.params.position as any;
        expect(pos).toEqual({x: 1, y: 2, z: 3});
        expect(Array.isArray(pos)).toBe(false);

        const scale = cmd.params.scale as any;
        expect(scale).toEqual({x: 2, y: 2, z: 2});
        expect(Array.isArray(scale)).toBe(false);

        const rot = cmd.params.rotation as any;
        expect(rot).toEqual({x: 0, y: 1.57, z: 0});
        expect(Array.isArray(rot)).toBe(false);
    });

    it("object literal params parse into plain objects", () => {
        const cmd = ScriptCommandParser.parse(
            'behavior attach Sun behaviorId=sw.sunGlow config={textureName:"SunTex",lightIntensity:2}',
        );
        expect(cmd.command).toBe("attach_behavior");
        const config = cmd.params.config as Record<string, unknown>;
        expect(typeof config).toBe("object");
        expect(config.textureName).toBe("SunTex");
        expect(config.lightIntensity).toBe(2);
    });

    it("numeric params are numbers, not strings", () => {
        const cmd = ScriptCommandParser.parse("material Sun metalness=0 roughness=1");
        expect(cmd.params.metalness).toBe(0);
        expect(cmd.params.roughness).toBe(1);
        expect(typeof cmd.params.metalness).toBe("number");
        expect(typeof cmd.params.roughness).toBe("number");
    });

    it("boolean params are booleans, not strings", () => {
        const cmd = ScriptCommandParser.parse("render settings useShadows=false");
        expect(cmd.params.useShadows).toBe(false);
        expect(typeof cmd.params.useShadows).toBe("boolean");
    });

    it("game settings isGame is boolean", () => {
        const cmd = ScriptCommandParser.parse("game settings isGame=true showHUD=false");
        expect(cmd.params.isGame).toBe(true);
        expect(cmd.params.showHUD).toBe(false);
    });
});

// ─── Executor dispatch test ───────────────────────────────────────────

describe("StemScript executor dispatches correct commands", () => {
    it("executor calls the right command name for each stemscript line", async () => {
        const script = `add sphere name="Sun" position=0,0,0 scale=5,5,5
material Sun metalness=0 roughness=1
behavior attach Sun behaviorId=sw.sunGlow config={textureName:"SunTex"}
update CameraTarget tag=Player
delete HemisphereLight`;

        const executedCommands: {command: string; params: Record<string, unknown>}[] = [];
        const mockExecutor = async (command: string, params: Record<string, unknown>) => {
            executedCommands.push({command, params});
            return {success: true, message: "ok"};
        };

        await ScriptExecutor.execute(script, mockExecutor);

        expect(executedCommands).toHaveLength(5);
        expect(executedCommands[0]!.command).toBe("create_primitive");
        expect(executedCommands[0]!.params.type).toBe("sphere");
        expect(executedCommands[0]!.params.name).toBe("Sun");

        expect(executedCommands[1]!.command).toBe("set_material");
        expect(executedCommands[1]!.params.target).toBe("Sun");

        expect(executedCommands[2]!.command).toBe("attach_behavior");
        expect(executedCommands[2]!.params.target).toBe("Sun");
        expect(executedCommands[2]!.params.behaviorId).toBe("sw.sunGlow");

        expect(executedCommands[3]!.command).toBe("modify_object");
        expect(executedCommands[3]!.params.target).toBe("CameraTarget");
        expect(executedCommands[3]!.params.tag).toBe("Player");

        expect(executedCommands[4]!.command).toBe("delete_object");
        expect(executedCommands[4]!.params.target).toBe("HemisphereLight");
    });

    it("scene-mutating commands would need History.execute() for serialization", () => {
        const commands = parseAllCommands(SOLAR_SYSTEM_SCRIPT).filter(c => !c.isBuiltin);
        const mutatingCmds = commands.filter(c => SCENE_MUTATING_COMMANDS.has(c.command));
        const nonMutatingCmds = commands.filter(c => !SCENE_MUTATING_COMMANDS.has(c.command));

        expect(mutatingCmds.length).toBeGreaterThan(0);

        for (const cmd of nonMutatingCmds) {
            const isSettingOrQuery =
                cmd.command.startsWith("set_scene_") ||
                cmd.command.startsWith("set_") ||
                cmd.command.startsWith("get_") ||
                cmd.command.startsWith("list_") ||
                cmd.command === "set_project_title" ||
                cmd.command === "set_camera_settings" ||
                cmd.command === "set_game_settings" ||
                cmd.command === "set_rendering_settings" ||
                cmd.command === "set_light_properties";
            expect(isSettingOrQuery).toBe(true);
        }
    });
});
