/**
 * Alias definitions mapping shorthand terminal commands to CommandsRegistry names.
 *
 * Uses string literals rather than importing SupportedCommands to avoid pulling in
 * Three.js / Application dependencies (which makes unit testing impossible).
 */

export interface AliasMapping {
    command: string;
    /** Describes where the bare target token maps to in params */
    targetParam?: string;
    /** Static params merged into every invocation */
    staticParams?: Record<string, unknown>;
}

/**
 * All raw CommandsRegistry names accepted by the script terminal.
 * These can be used directly, e.g. `set_scene_lighting ambient={...}`.
 */
export const SUPPORTED_RAW_COMMANDS: string[] = [
    "create_primitive",
    "create_group",
    "clone_object",
    "delete_object",
    "move_object",
    "modify_object",
    "get_scene_objects",
    "get_object",
    "get_object_settings",
    "get_material_settings",
    "get_behavior_settings",
    "get_selected_object",
    "get_player",
    "list_scene_assets",
    "get_scene_asset",
    "list_lambdas",
    "get_lambda",
    "set_material",
    "set_texture",
    "set_external_texture",
    "list_behaviors",
    "get_behavior",
    "add_behavior",
    "update_behavior",
    "attach_behavior",
    "add_navmesh",
    "rebuild_navmesh",
    "add_navmesh_connection",
    "add_waypoint_path",
    "add_waypoint",
    "detach_behavior",
    "remove_behavior",
    "set_behavior_config",
    "enable_physics",
    "disable_physics",
    "set_physics",
    "get_physics_settings",
    "set_physics_engine",
    "set_scene_compartments",
    "get_light_settings",
    "generate_3d_model",
    "search_local_assets",
    "get_library_asset",
    "search_external_assets",
    "add_model_to_scene",
    "add_vfx",
    "modify_vfx",
    "delete_vfx",
    "get_vfx",
    "add_vfx_behavior",
    "remove_vfx_behavior",
    "list_prefabs",
    "get_prefab",
    "add_prefab_to_scene",
    "create_prefab",
    "set_scene_lighting",
    "set_scene_fog",
    "set_scene_background",
    "set_tone_mapping",
    "set_post_processing",
    "set_camera_settings",
    "get_camera_settings",
    "set_game_settings",
    "set_project_title",
    "set_scene_thumbnail",
    "set_rendering_settings",
    "get_editor_settings",
    "get_scene_setting",
    "set_light_properties",
];

/**
 * Maps shorthand verb + subcommand patterns to registry command names.
 * Key format: "verb" or "verb subcommand".
 * The parser matches the longest prefix first.
 */
export const ALIAS_MAP: Record<string, AliasMapping> = {
    // Object creation
    "add group": {command: "create_group"},
    "add vfx": {command: "add_vfx"},
    "add model": {command: "add_model_to_scene"},
    "add prefab": {command: "add_prefab_to_scene"},
    // "add <type>" is a special case handled by the parser — maps to create_primitive with type param

    // Object manipulation
    update: {command: "modify_object", targetParam: "target"},
    delete: {command: "delete_object", targetParam: "target"},
    clone: {command: "clone_object", targetParam: "target"},
    move: {command: "move_object", targetParam: "target"},

    // Scene queries
    "list objects": {command: "get_scene_objects"},
    // Lights are scene objects; enumerate them via the scene tree, then read
    // one with `get light <Target>` (-> get_light_settings).
    "list lights": {command: "get_scene_objects"},
    "list assets": {command: "list_scene_assets"},
    "list imports": {command: "list_scene_assets", staticParams: {type: "imports"}},
    "list files": {command: "list_scene_assets", staticParams: {type: "files"}},
    "list models": {command: "list_scene_assets", staticParams: {type: "models"}},
    "list media": {command: "list_scene_assets", staticParams: {type: "media"}},
    "list behavior packs": {command: "list_scene_assets", staticParams: {type: "behaviors"}},
    "list lambda packs": {command: "list_scene_assets", staticParams: {type: "lambdas"}},
    "list packs": {command: "list_scene_assets", staticParams: {type: "packs"}},
    "list behaviors": {command: "list_behaviors"},
    "list prefabs": {command: "list_prefabs"},
    "get camera": {command: "get_camera_settings", targetParam: "target"},
    "get outline": {command: "get_scene_setting", staticParams: {category: "outline"}},
    "get bloom": {command: "get_scene_setting", staticParams: {category: "bloom"}},
    "get ao": {command: "get_scene_setting", staticParams: {category: "ao"}},
    "get dof": {command: "get_scene_setting", staticParams: {category: "dof"}},
    "get lighting": {command: "get_scene_setting", staticParams: {category: "lighting"}},
    "get fog": {command: "get_scene_setting", staticParams: {category: "fog"}},
    "get background": {command: "get_scene_setting", staticParams: {category: "background"}},
    "get tone mapping": {command: "get_scene_setting", staticParams: {category: "toneMapping"}},
    "get tonemapping": {command: "get_scene_setting", staticParams: {category: "toneMapping"}},
    "get postprocessing": {command: "get_scene_setting", staticParams: {category: "postProcessing"}},
    "get post processing": {command: "get_scene_setting", staticParams: {category: "postProcessing"}},
    "get game settings": {command: "get_scene_setting", staticParams: {category: "game"}},
    "get render settings": {command: "get_scene_setting", staticParams: {category: "rendering"}},
    "get physics engine": {command: "get_scene_setting", staticParams: {category: "physics"}},
    "get scene settings": {command: "get_scene_setting"},
    "get asset": {command: "get_scene_asset", targetParam: "assetId"},
    "get import": {command: "get_scene_asset", targetParam: "name", staticParams: {type: "imports"}},
    "get file": {command: "get_scene_asset", targetParam: "name", staticParams: {type: "files"}},
    "get scene asset": {command: "get_scene_asset", targetParam: "assetId"},
    "get compartments": {command: "get_scene_setting", staticParams: {category: "compartments"}},
    "get project": {command: "get_scene_setting", staticParams: {category: "project"}},
    "get material": {command: "get_material_settings", targetParam: "target"},
    "get texture": {command: "get_material_settings", targetParam: "target"},
    "get physics": {command: "get_physics_settings", targetParam: "target"},
    "get light": {command: "get_light_settings", targetParam: "target"},
    "get behavior": {command: "get_behavior_settings", targetParam: "target"},
    "get vfx": {command: "get_vfx", targetParam: "target"},
    "get box": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "box"}},
    "get sphere": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "sphere"}},
    "get cylinder": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "cylinder"}},
    "get cone": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "cone"}},
    "get plane": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "plane"}},
    "get torus": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "torus"}},
    "get torusknot": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "torusKnot"}},
    "get triangle": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "triangle"}},
    "get capsule": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "capsule"}},
    "get icosahedron": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "icosahedron"}},
    "get octahedron": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "octahedron"}},
    "get dodecahedron": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "dodecahedron"}},
    "get ring": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "ring"}},
    "get group": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "group"}},
    "get model": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "model"}},
    "get prefab": {command: "get_object_settings", targetParam: "target", staticParams: {kind: "prefab"}},
    get: {command: "get_object", targetParam: "target"},
    select: {command: "get_selected_object"},
    player: {command: "get_player"},
    "list lambdas": {command: "list_lambdas"},
    "lambda list": {command: "list_lambdas"},
    "lambda get": {command: "get_lambda"},
    "get lambda": {command: "get_lambda", targetParam: "lambdaId"},

    // Materials & textures
    material: {command: "set_material", targetParam: "target"},
    texture: {command: "set_texture", targetParam: "target"},
    "texture external": {command: "set_external_texture", targetParam: "target"},

    // Physics
    "physics enable": {command: "enable_physics", targetParam: "target"},
    "physics disable": {command: "disable_physics", targetParam: "target"},
    "physics set": {command: "set_physics", targetParam: "target"},
    "physics engine": {command: "set_physics_engine", targetParam: "type"},

    // Behaviors
    "behavior attach": {command: "attach_behavior", targetParam: "target"},
    "behavior detach": {command: "detach_behavior", targetParam: "target"},
    "behavior list": {command: "list_behaviors"},
    "behavior config": {command: "set_behavior_config", targetParam: "target"},
    "behavior add": {command: "add_behavior"},
    "behavior update": {command: "update_behavior"},
    "behavior remove": {command: "remove_behavior"},
    "behavior get": {command: "get_behavior"},
    "navmesh add": {command: "add_navmesh"},
    "navmesh rebuild": {command: "rebuild_navmesh"},
    "navmesh connection add": {command: "add_navmesh_connection", targetParam: "source"},
    "waypoint path add": {command: "add_waypoint_path"},
    "waypoint add": {command: "add_waypoint"},

    // Scene settings
    "scene lighting": {command: "set_scene_lighting"},
    "scene fog": {command: "set_scene_fog"},
    "scene background": {command: "set_scene_background"},
    "scene tonemapping": {command: "set_tone_mapping"},
    "scene postprocessing": {command: "set_post_processing"},
    "scene compartments": {command: "set_scene_compartments", targetParam: "enabled"},
    "scene thumbnail": {command: "set_scene_thumbnail", targetParam: "name"},
    "scene settings": {command: "get_editor_settings"},

    // Light
    light: {command: "set_light_properties", targetParam: "target"},

    // Camera, game & project
    camera: {command: "set_camera_settings", targetParam: "target"},
    "game settings": {command: "set_game_settings"},
    "project title": {command: "set_project_title", targetParam: "title"},
    "render settings": {command: "set_rendering_settings"},

    // Assets & generation
    "generate model": {command: "generate_3d_model"},
    "search assets": {command: "search_local_assets"},
    "asset get": {command: "get_library_asset"},
    "search external": {command: "search_external_assets"},

    // VFX
    "vfx add": {command: "add_vfx"},
    "vfx modify": {command: "modify_vfx", targetParam: "target"},
    "vfx delete": {command: "delete_vfx", targetParam: "target"},
    "vfx get": {command: "get_vfx", targetParam: "target"},
    "vfx behavior add": {command: "add_vfx_behavior", targetParam: "target"},
    "vfx behavior remove": {command: "remove_vfx_behavior", targetParam: "target"},

    // Prefabs
    "prefab list": {command: "list_prefabs"},
    "prefab get": {command: "get_prefab"},
    "prefab add": {command: "add_prefab_to_scene"},
    "prefab create": {command: "create_prefab", targetParam: "target"},
};

/**
 * Sorted alias keys longest-first so the parser can greedily match multi-word prefixes.
 */
export const SORTED_ALIAS_KEYS: string[] = Object.keys(ALIAS_MAP).sort((a, b) => b.length - a.length);
