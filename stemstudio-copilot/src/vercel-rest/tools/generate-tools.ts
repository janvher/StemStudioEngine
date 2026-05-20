/**
 * Auto-generates Vercel AI SDK tool definitions from apiRequestConfigs.
 * This avoids duplicating the 41 command definitions — one source of truth in command-schema.ts.
 */

import { jsonSchema } from 'ai';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { apiRequestConfigs, type ApiRequestConfig, type ParamSchemaInfo } from '../../standalone/command-schema.js';
import { capResultSize } from '../../utils/result-guard.js';
import { STUDIO_API_BASE } from '../../utils/config.js';
import {
    getSkill,
    getSkillCatalog,
    getSkillScript,
    listSkillScripts,
    getAutoSkillHint,
} from '../skills/skill-loader.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('tools');

/** Set of command names that mutate the scene, derived from apiRequestConfigs. */
export const MUTATING_COMMANDS = new Set(
    apiRequestConfigs.filter(c => c.kind === 'mutate').map(c => c.command),
);

/** Human-readable descriptions for Studio commands */
const COMMAND_DESCRIPTIONS: Record<string, string> = {
    // Scene query
    get_scene_objects: 'Get all objects in the current 3D scene. Use filter to search by name.',
    get_selected_object: 'Get the currently selected object in the editor.',
    get_object: 'Get detailed info about a specific object by name or ID.',
    get_player: 'Get the player object and its configuration.',
    // Objects
    create_primitive: "Create a 3D primitive in the scene. type is required: 'box', 'sphere', 'cylinder', 'cone', 'plane', 'torus', 'torusKnot', 'triangle', 'capsule', 'icosahedron', 'octahedron', 'dodecahedron', 'ring'. position/rotation/scale are {x,y,z} objects. color is hex string (e.g. '#ff0000'). parent is name or UUID of parent object.",
    create_group: 'Create an empty group (container) for organizing objects. Use groups to compose complex objects from multiple primitives, then attach a single behavior to the group.',
    clone_object: 'Clone an existing object by name or UUID. Optionally set a new position {x,y,z} for the clone.',
    modify_object: "Modify properties of an existing object: position, rotation, scale ({x,y,z}), color (hex string), name (string). Only include properties you want to change.",
    move_object: 'Move an object to a different parent in the scene hierarchy. parent is name/UUID of new parent, or null for scene root.',
    delete_object: 'Delete an object from the scene by name or UUID.',
    // Materials
    set_material: 'Set material properties on an object: color (hex), opacity (0-1), metalness (0-1), roughness (0-1).',
    set_texture: "Apply a texture to an object. textureUrl is the image URL. textureType: 'map' (default), 'normalMap', 'roughnessMap'.",
    set_external_texture: "Apply texture/HDRI from external providers (e.g., Polyhaven). Requires target, assetId, assetType ('textures' or 'hdris'), name, and provider.",
    // Assets
    search_local_assets: 'Search the local asset library for 3D models, textures, etc. phrases is an array of search terms.',
    search_external_assets: "Search external asset providers for 3D models. provider: 'sketchfab', 'polyhaven', 'meshy', 'local'.",
    generate_3d_model: 'Generate a 3D model using AI from a text description. Returns a model that can be placed in the scene.',
    add_model_to_scene: "Add a model from an external provider to the scene. Requires id, name, provider ('sketchfab'|'polyhaven'|'meshy'|'local'), and downloadUrl.",
    // Behaviors
    list_behaviors: 'List all available behaviors (built-in packs + custom). Use filter to search by name/id.',
    get_behavior: 'Get the full source code, metadata, and attribute schema of a behavior by ID. Always call this before attaching to understand available config options.',
    add_behavior: "Create a new custom behavior. Code must use lifecycle methods `init(_game)`, `onStart()`, `update(deltaTime)`, optional `fixedUpdate(fixedDeltaTime)`, and `dispose()`. Capture `_game` into a closure variable (`let game; game = _game;`) instead of writing `this.game = game`. Use `this.target` after `onStart()`, `this.erth` for assets and behavior lookups, and avoid ES module imports, direct DOM listeners, `EventBus.send()`, `this.THREE`, and `this.findBehavior()`.",
    update_behavior: 'Update an existing behavior code, name, or metadata. Creates a new revision and returns `codeValidation`; treat returned errors as blocking.',
    attach_behavior: "Attach a behavior to a target object. config is an object with attribute key-value pairs matching the behavior's schema. Call get_behavior first to see available attributes.",
    set_behavior_config: 'Update config (attributesData) or enabled state of an attached behavior.',
    detach_behavior: 'Detach a behavior from an object without deleting the behavior definition.',
    remove_behavior: 'Permanently delete a behavior from the project.',
    // Physics
    set_physics: "Set physics configuration on an object. config is an object: { bodyType: 'DYNAMIC'|'KINEMATIC'|'STATIC', mass: number, friction: number, restitution: number, shape: 'BOX'|'SPHERE'|'CAPSULE'|'CONVEX_HULL'|'CONCAVE_HULL', ctype: 'DYNAMIC'|'KINEMATIC'|'STATIC'|'GHOST' }. For player objects, use the character behavior instead.",
    enable_physics: 'Enable physics simulation on a target object.',
    disable_physics: 'Disable physics simulation on a target object.',
    // VFX
    add_vfx: 'Add a visual effect / particle system to the scene. config is a ParticleSystem configuration object.',
    modify_vfx: "Modify VFX properties. All ParticleSystem params (duration, looping, emissionOverTime, startLife, startSpeed, startSize, startColor, shape, material) go in 'config'. Behaviors are modified via add_vfx_behavior/remove_vfx_behavior, NOT here.",
    delete_vfx: 'Delete a visual effect from the scene.',
    get_vfx: 'Get information about a specific VFX.',
    add_vfx_behavior: "Add a behavior to a VFX particle system. behaviorType: 'ColorOverLife', 'SizeOverLife', 'RotationOverLife', etc.",
    remove_vfx_behavior: 'Remove a behavior from a VFX by its index.',
    // Prefabs
    list_prefabs: 'List all prefab (stem) templates. Use filter to search.',
    get_prefab: 'Get details of a specific prefab by ID.',
    create_prefab: 'Create a prefab from an existing scene object.',
    add_prefab_to_scene: 'Instantiate a prefab in the scene at an optional position.',
    // Settings
    get_editor_settings: "Get current editor/scene settings. category: 'lighting', 'fog', 'background', 'toneMapping', 'postProcessing', 'game', 'rendering', or 'all'.",
    set_scene_lighting: 'Configure scene lighting: ambient {color, intensity}, hemisphere {skyColor, groundColor, intensity}, shadows {enabled, mapType}.',
    set_scene_fog: "Set scene fog. type: 'none', 'linear', 'exponential'. Linear uses near/far, exponential uses density.",
    set_scene_background: "Set scene background. type: 'Color', 'Texture', 'Cubemap', 'Gradient'. Includes color, gradient, rotation, intensity, blurriness.",
    set_tone_mapping: "Set tone mapping. type: 'None', 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic'. exposure: number (default 1.0).",
    set_post_processing: 'Configure post-processing: ao {enabled, kernelRadius, minDistance, maxDistance}, bloom {enabled, strength, radius, threshold}, outline {enabled, edgeStrength, edgeGlow, edgeThickness}.',
    set_camera_settings: "Set camera config on a target object. cameraType: 'THIRD_PERSON', 'FIRST_PERSON', 'TOP_DOWN', 'SIDE_SCROLLER'. Includes fov, near, far, distances, headHeight, axis.",
    set_game_settings: 'Configure game rules: enabled, lives, maxScore, timer, useAvatar, isMultiplayer, showHUD, isSandbox, voiceChatEnabled.',
    set_rendering_settings: 'Configure rendering: useShadows, useInstancing, shadowMapType, usePhysicsWorker. `shadowMapType` must be a number (THREE constant): 0=Basic, 1=PCF, 2=PCFSoft, 3=VSM.',
};

/**
 * Split a CLI argument string into an array, respecting single and double quotes.
 * Prevents shell injection by treating the entire string as literal arguments.
 */
function parseArgs(raw: string): string[] {
    const args: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                current += ch;
            }
        } else if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === ' ' || ch === '\t') {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += ch;
        }
    }

    if (current) args.push(current);
    return args;
}

/** Convert a ParamSchemaInfo to a JSON Schema property object. */
function paramSchemaToJsonSchema(info: ParamSchemaInfo): Record<string, any> {
    const schema: Record<string, any> = {};
    if (info.enum) {
        schema.type = info.type;
        schema.enum = info.enum;
    } else {
        schema.type = info.type;
    }
    if (info.description) schema.description = info.description;
    if (info.properties) {
        schema.properties = {};
        for (const [k, v] of Object.entries(info.properties)) {
            schema.properties[k] = paramSchemaToJsonSchema(v);
        }
    }
    return schema;
}

/**
 * Build a JSON Schema for a command's parameters based on its ApiRequestConfig.
 * Uses typed paramSchemas when available, falling back to generic oneOf.
 */
function buildParamsJsonSchema(config: ApiRequestConfig): { type: 'object'; properties: Record<string, any>; required: string[] } {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    const schemas = config.paramSchemas || {};

    const flexibleParamSchema = {
        oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object' },
            { type: 'array' },
            { type: 'null' },
        ],
    };

    function addParam(param: string, isRequired: boolean) {
        const info = schemas[param];
        if (info) {
            properties[param] = paramSchemaToJsonSchema(info);
        } else {
            properties[param] = { ...flexibleParamSchema, description: isRequired ? `Required: ${param}` : `Optional: ${param}` };
        }
        if (isRequired) required.push(param);
    }

    for (const param of config.queryParams || []) addParam(param, true);
    for (const param of config.optionalQueryParams || []) addParam(param, false);
    for (const param of config.bodyParams || []) addParam(param, true);
    for (const param of config.optionalBodyParams || []) addParam(param, false);

    return { type: 'object' as const, properties, required };
}

/**
 * Build the HTTP request for a given command and params.
 */
function buildRequest(config: ApiRequestConfig, sessionId: string, params: Record<string, unknown>): {
    url: string;
    init: RequestInit;
} {
    const url = new URL(`${STUDIO_API_BASE}/${config.path}/${sessionId}`);

    // Add query params
    for (const param of [...(config.queryParams || []), ...(config.optionalQueryParams || [])]) {
        const value = params[param];
        if (value !== undefined && value !== null) {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            url.searchParams.set(param, serialized);
        }
    }

    // Build body for POST/DELETE
    const bodyParamNames = [...(config.bodyParams || []), ...(config.optionalBodyParams || [])];
    let body: string | undefined;
    if (bodyParamNames.length > 0 && (config.method === 'POST' || config.method === 'DELETE')) {
        const bodyObj: Record<string, unknown> = {};
        for (const param of bodyParamNames) {
            const value = params[param];
            if (value !== undefined && value !== null) {
                bodyObj[param] = value;
            }
        }
        body = JSON.stringify(bodyObj);
    }

    return {
        url: url.toString(),
        init: {
            method: config.method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body,
        },
    };
}

/**
 * Generate all Studio tools from apiRequestConfigs.
 * Each tool wraps an HTTP call to the local MCP proxy.
 */
export function generateStudioTools(sessionId: string): Record<string, any> {
    const configs = apiRequestConfigs;
    const tools: Record<string, any> = {};

    for (const config of configs) {
        const description = COMMAND_DESCRIPTIONS[config.command] || `Execute ${config.command} command.`;
        const schema = buildParamsJsonSchema(config);

        tools[config.command] = {
            description,
            parameters: jsonSchema<Record<string, unknown>>(schema),
            execute: async (params: Record<string, unknown>) => {
                const { url, init } = buildRequest(config, sessionId, params);

                try {
                    const response = await fetch(url, init);
                    const data = await response.json();

                    if (!response.ok) {
                        return { error: true, status: response.status, details: data };
                    }

                    // Cap result size to prevent context overflow
                    const result = capResultSize(data);

                    // Auto-inject skill hints for code-generation-heavy tools
                    const skillHint = getAutoSkillHint(config.command);
                    if (skillHint) {
                        if (result && typeof result === 'object' && !Array.isArray(result)) {
                            return { ...(result as Record<string, unknown>), _skillGuidance: skillHint };
                        }
                        return { data: result, _skillGuidance: skillHint };
                    }

                    return result;
                } catch (err) {
                    return {
                        error: true,
                        message: err instanceof Error ? err.message : String(err),
                    };
                }
            },
        };
    }

    // --- Skill tools (3-tier progressive disclosure) ---

    tools['load_skill'] = {
        description:
            'Load detailed guidance for a StemStudio skill domain. Returns workflows, best practices, code templates, and examples. Use before complex operations. Skill names are listed in the system prompt.',
        parameters: jsonSchema<{ skillName: string }>({
            type: 'object',
            properties: {
                skillName: {
                    type: 'string',
                    description: 'Skill name (e.g. "stemstudio-behaviors", "stemstudio-vfx")',
                },
            },
            required: ['skillName'],
        }),
        execute:  ({ skillName }: { skillName: string }) => {
            const skill = getSkill(skillName);
            if (!skill) {
                return { error: `Skill "${skillName}" not found`, available: getSkillCatalog().map(s => s.name) };
            }
            const preamble =
                `[SKILL CONTEXT: "${skill.name}"]\n` +
                `When this skill references "python scripts/*.py" commands, use the equivalent tool call instead.\n` +
                `Tool names match script names (e.g., "create_primitive", "add_behavior", "add_vfx").\n` +
                `For script-specific complex operations (texture encoding, file reading), the skill content explains the parameters.\n` +
                `Available scripts for reference: ${skill.scriptNames.join(', ') || 'none'}\n---\n`;
            return { name: skill.name, content: preamble + skill.content };
        },
    };

    tools['read_skill_script'] = {
        description:
            "Read the source code of a skill's Python script. Use to study code generation patterns, understand complex parameter structures, or see automation examples.",
        parameters: jsonSchema<{ skillName: string; scriptName: string }>({
            type: 'object',
            properties: {
                skillName: { type: 'string', description: 'Skill name' },
                scriptName: { type: 'string', description: 'Script filename (e.g. "add_behavior.py")' },
            },
            required: ['skillName', 'scriptName'],
        }),
        execute:  ({ skillName, scriptName }: { skillName: string; scriptName: string }) => {
            const content = getSkillScript(skillName, scriptName);
            if (!content) {
                const scripts = listSkillScripts(skillName);
                return { error: 'Script not found', available: scripts };
            }
            return { script: scriptName, content };
        },
    };

    tools['run_skill_script'] = {
        description:
            'Execute a skill Python script as a subprocess. Use for complex operations that scripts handle better than direct tool calls (e.g., texture encoding in add_vfx.py, file-based behavior upload).',
        parameters: jsonSchema<{ skillName: string; scriptName: string; args: string }>({
            type: 'object',
            properties: {
                skillName: { type: 'string', description: 'Skill name' },
                scriptName: { type: 'string', description: 'Script filename (e.g. "add_behavior.py")' },
                args: {
                    type: 'string',
                    description: 'CLI arguments (e.g. "--sessionId studio_123 --name MyBehavior")',
                },
            },
            required: ['skillName', 'scriptName', 'args'],
        }),
        execute: async ({ skillName, scriptName, args }: { skillName: string; scriptName: string; args: string }) => {
            const skill = getSkill(skillName);
            if (!skill) return { error: `Skill "${skillName}" not found` };

            const safeName = path.basename(scriptName);
            if (safeName !== scriptName || !safeName.endsWith('.py')) {
                return { error: `Invalid script name: ${scriptName}` };
            }

            const scriptPath = path.join(skill.basePath, 'scripts', safeName);
            if (!fs.existsSync(scriptPath)) {
                return { error: `Script not found: ${scriptName}`, available: listSkillScripts(skillName) };
            }

            try {
                const argsList = parseArgs(args);
                const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
                    let stdout = '';
                    let stderr = '';
                    const proc = spawn('python3', [scriptPath, ...argsList], {
                        cwd: path.dirname(scriptPath),
                        timeout: 30_000,
                        stdio: ['ignore', 'pipe', 'pipe'],
                    });
                    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
                    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
                    proc.on('error', (err) => { resolve({ stdout, stderr: err.message, code: null }); });
                    proc.on('close', (code) => { resolve({ stdout, stderr, code }); });
                });

                if (result.stderr) log.warn(`Script ${scriptName} stderr`, { stderr: result.stderr });
                if (result.code !== 0 && result.code !== null) {
                    return { error: result.stderr || `Script exited with code ${result.code}`, stdout: result.stdout || undefined };
                }
                try {
                    return JSON.parse(result.stdout);
                } catch {
                    return { output: result.stdout };
                }
            } catch (err: any) {
                return { error: err.message || String(err) };
            }
        },
    };

    return tools;
}
