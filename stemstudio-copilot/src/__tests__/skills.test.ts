/**
 * Structural and script-level tests for the skills system.
 *
 * Validates the skill refactoring that split stemstudio-3d (20 scripts)
 * and stemstudio-editor-settings (9 scripts) into 7 focused skills.
 *
 * Run: bun test src/__tests__/skills.test.ts
 */

import { describe, test, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SKILLS_ROOT = path.join(PROJECT_ROOT, 'ai', 'claude', 'skills');

function readSkillMd(skillName: string): string {
    return fs.readFileSync(path.join(SKILLS_ROOT, skillName, 'SKILL.md'), 'utf-8');
}

function listScripts(skillName: string): string[] {
    const dir = path.join(SKILLS_ROOT, skillName, 'scripts');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.py')).sort();
}

function allScriptBasenames(): Set<string> {
    const names = new Set<string>();
    for (const skill of allSkillDirs()) {
        for (const script of listScripts(skill)) {
            names.add(script.replace(/\.py$/, ''));
        }
    }
    return names;
}

function parseFrontmatter(raw: string): { name: string; description: string } | null {
    if (!raw.startsWith('---')) return null;
    const endIdx = raw.indexOf('---', 3);
    if (endIdx === -1) return null;
    const fm = raw.slice(3, endIdx);
    let name = '';
    let description = '';
    for (const line of fm.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('name:')) name = trimmed.slice(5).trim().replace(/^["']|["']$/g, '');
        if (trimmed.startsWith('description:')) description = trimmed.slice(12).trim().replace(/^["']|["']$/g, '');
    }
    return name ? { name, description } : null;
}

/** Get all skill directory names (excluding _lib and dirs without SKILL.md). */
function allSkillDirs(): string[] {
    return fs.readdirSync(SKILLS_ROOT, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name !== '_lib' && !e.name.startsWith('.')
            && fs.existsSync(path.join(SKILLS_ROOT, e.name, 'SKILL.md')))
        .map(e => e.name)
        .sort();
}

// ---------------------------------------------------------------------------
// Expected mappings from the refactoring plan
// ---------------------------------------------------------------------------

/** Scripts expected in each of the 7 new skills. */
const NEW_SKILL_SCRIPTS: Record<string, string[]> = {
    'stemstudio-scene': [
        'get_object.py', 'get_object_settings.py', 'get_player.py',
        'get_scene_objects.py', 'get_selected_object.py',
    ],
    'stemstudio-objects': [
        'batch_create_primitives.py', 'batch_delete_objects.py', 'batch_modify_objects.py',
        'clone_object.py', 'create_group.py', 'create_primitive.py',
        'delete_object.py', 'modify_object.py', 'move_object.py',
    ],
    'stemstudio-materials': [
        'get_material_settings.py',
        'set_external_texture.py', 'set_material.py', 'set_texture.py',
    ],
    'stemstudio-assets': [
        'add_model_to_scene.py', 'generate_3d_model.py', 'get_library_asset.py',
        'search_external_assets.py', 'search_local_assets.py',
    ],
    'stemstudio-atmosphere': [
        'get_editor_settings.py', 'get_light_settings.py', 'set_light_properties.py',
        'set_post_processing.py', 'set_scene_background.py', 'set_scene_fog.py',
        'set_scene_lighting.py', 'set_tone_mapping.py',
    ],
    'stemstudio-camera': [
        'get_camera_settings.py', 'get_editor_settings.py', 'set_camera_settings.py',
    ],
    'stemstudio-project-settings': [
        'create_project_task.py', 'delete_project_task.py', 'get_editor_settings.py',
        'get_scene_setting.py', 'list_project_tasks.py', 'set_game_settings.py',
        'set_project_title.py', 'set_rendering_settings.py', 'set_scene_compartments.py',
        'set_scene_thumbnail.py', 'update_project_task.py',
    ],
};

/** All 20 unique scripts from the old stemstudio-3d. */
const OLD_3D_SCRIPTS = [
    'add_model_to_scene.py', 'batch_create_primitives.py', 'batch_delete_objects.py',
    'batch_modify_objects.py', 'clone_object.py', 'create_group.py', 'create_primitive.py',
    'delete_object.py', 'generate_3d_model.py', 'get_object.py', 'get_player.py',
    'get_scene_objects.py', 'get_selected_object.py', 'modify_object.py', 'move_object.py',
    'search_external_assets.py', 'search_local_assets.py', 'set_external_texture.py',
    'set_material.py', 'set_texture.py',
].sort();

/** All 9 unique scripts from the old stemstudio-editor-settings. */
const OLD_EDITOR_SCRIPTS = [
    'get_editor_settings.py', 'set_camera_settings.py', 'set_game_settings.py',
    'set_post_processing.py', 'set_rendering_settings.py', 'set_scene_background.py',
    'set_scene_fog.py', 'set_scene_lighting.py', 'set_tone_mapping.py',
].sort();

// ---------------------------------------------------------------------------
// Test 1: All skills have valid frontmatter
// ---------------------------------------------------------------------------

describe('Test 1: All skills have valid frontmatter', () => {
    const skills = allSkillDirs();

    test('at least 25 skill directories exist', () => {
        expect(skills.length).toBeGreaterThanOrEqual(25);
    });

    for (const skill of skills) {
        test(`${skill} has SKILL.md with valid frontmatter`, () => {
            const skillFile = path.join(SKILLS_ROOT, skill, 'SKILL.md');
            expect(fs.existsSync(skillFile)).toBe(true);

            const raw = readSkillMd(skill);
            const fm = parseFrontmatter(raw);
            expect(fm).not.toBeNull();
            expect(fm!.name).toBe(skill);
            expect(fm!.description.length).toBeGreaterThan(0);
        });
    }
});

// ---------------------------------------------------------------------------
// Test 2: Script inventory completeness
// ---------------------------------------------------------------------------

describe('Test 2: Script inventory completeness', () => {
    test('each new skill has exactly the expected scripts', () => {
        for (const [skill, expected] of Object.entries(NEW_SKILL_SCRIPTS)) {
            const actual = listScripts(skill);
            expect(actual).toEqual(expected.sort());
        }
    });

    test('union of new skills from stemstudio-3d includes all old scripts', () => {
        const fromOld3d = [
            ...NEW_SKILL_SCRIPTS['stemstudio-scene'],
            ...NEW_SKILL_SCRIPTS['stemstudio-objects'],
            ...NEW_SKILL_SCRIPTS['stemstudio-materials'],
            ...NEW_SKILL_SCRIPTS['stemstudio-assets'],
        ].sort();
        for (const script of OLD_3D_SCRIPTS) {
            expect(fromOld3d).toContain(script);
        }
    });

    test('union of new skills from stemstudio-editor-settings includes all old scripts', () => {
        // get_editor_settings.py is duplicated across 3 skills — deduplicate
        const fromOldEditor = new Set([
            ...NEW_SKILL_SCRIPTS['stemstudio-atmosphere'],
            ...NEW_SKILL_SCRIPTS['stemstudio-camera'],
            ...NEW_SKILL_SCRIPTS['stemstudio-project-settings'],
        ]);
        for (const script of OLD_EDITOR_SCRIPTS) {
            expect(fromOldEditor.has(script)).toBe(true);
        }
    });

    test('legacy scripts were not lost', () => {
        const allNewScripts = new Set<string>();
        for (const scripts of Object.values(NEW_SKILL_SCRIPTS)) {
            for (const s of scripts) allNewScripts.add(s);
        }
        const allOld = new Set([...OLD_3D_SCRIPTS, ...OLD_EDITOR_SCRIPTS]);
        for (const s of allOld) {
            expect(allNewScripts.has(s)).toBe(true);
        }
    });

    test('all command-schema commands have a same-named skill script wrapper', async () => {
        const schemaPath = path.join(PROJECT_ROOT, 'src', 'standalone', 'command-schema.ts');
        const { apiRequestConfigs } = await import(schemaPath);
        const scriptNames = allScriptBasenames();
        const missing = apiRequestConfigs
            .map((config: { command: string }) => config.command)
            .filter((command: string) => !scriptNames.has(command));

        expect(missing).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Test 3: _lib/studio.py import resolution
// ---------------------------------------------------------------------------

describe('Test 3: _lib/studio.py import resolution', () => {
    const allNewSkills = Object.keys(NEW_SKILL_SCRIPTS);

    for (const skill of allNewSkills) {
        const scripts = NEW_SKILL_SCRIPTS[skill];
        for (const script of scripts) {
            test(`${skill}/scripts/${script} --help exits cleanly`, () => {
                const scriptPath = path.join(SKILLS_ROOT, skill, 'scripts', script);
                try {
                    execSync(`python3 "${scriptPath}" --help`, {
                        timeout: 10_000,
                        stdio: ['pipe', 'pipe', 'pipe'],
                    });
                } catch (err: any) {
                    // argparse --help exits with code 0. If there's an import error,
                    // it exits with code 1 and we'll see the traceback.
                    if (err.status !== 0) {
                        const stderr = err.stderr?.toString() || '';
                        throw new Error(`Script ${script} failed: ${stderr}`);
                    }
                }
            });
        }
    }
});

// ---------------------------------------------------------------------------
// Test 4: No stale cross-references
// ---------------------------------------------------------------------------

describe('Test 4: No stale cross-references', () => {
    test('no SKILL.md references stemstudio-3d', () => {
        for (const skill of allSkillDirs()) {
            const content = readSkillMd(skill);
            expect(content).not.toContain('stemstudio-3d');
        }
    });

    test('no SKILL.md references stemstudio-editor-settings', () => {
        for (const skill of allSkillDirs()) {
            const content = readSkillMd(skill);
            expect(content).not.toContain('stemstudio-editor-settings');
        }
    });

    test('old directories do not exist', () => {
        expect(fs.existsSync(path.join(SKILLS_ROOT, 'stemstudio-3d'))).toBe(false);
        expect(fs.existsSync(path.join(SKILLS_ROOT, 'stemstudio-editor-settings'))).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Test 5: Skill loader discovers all skills
// ---------------------------------------------------------------------------

describe('Test 5: Skill loader discovers all skills', () => {
    // Dynamic import because skill-loader uses ESM
    test('loadAllSkills returns correct count and includes new skills', async () => {
        // Reset the module cache by importing fresh
        const loaderPath = path.join(PROJECT_ROOT, 'src', 'vercel-rest', 'skills', 'skill-loader.ts');
        const loader = await import(loaderPath);

        // Force reload
        const count = loader.loadAllSkills();
        expect(count).toBeGreaterThanOrEqual(25);

        const catalog = loader.getSkillCatalog();
        const names = catalog.map((s: { name: string }) => s.name);

        // All 7 new skills must be discovered
        for (const skill of Object.keys(NEW_SKILL_SCRIPTS)) {
            expect(names).toContain(skill);
        }

        // Old skills must NOT be present
        expect(names).not.toContain('stemstudio-3d');
        expect(names).not.toContain('stemstudio-editor-settings');

        // Verify script counts for new skills
        for (const [skill, expected] of Object.entries(NEW_SKILL_SCRIPTS)) {
            const meta = loader.getSkill(skill);
            expect(meta).toBeDefined();
            expect(meta!.hasScripts).toBe(true);
            expect(meta!.scriptNames.sort()).toEqual(expected.sort());
        }
    });
});

// ---------------------------------------------------------------------------
// Test 6: JSON-RPC output correctness for mutation scripts
// ---------------------------------------------------------------------------

describe('Test 6: JSON-RPC output for mutation scripts', () => {
    const mutationTests: Array<{ skill: string; script: string; args: string; expectedMethod: string }> = [
        {
            skill: 'stemstudio-objects',
            script: 'create_primitive.py',
            args: 'box --name TestBox',
            expectedMethod: 'create_primitive',
        },
        {
            skill: 'stemstudio-objects',
            script: 'delete_object.py',
            args: 'TestObj',
            expectedMethod: 'delete_object',
        },
        {
            skill: 'stemstudio-objects',
            script: 'modify_object.py',
            args: 'TestObj --color "#ff0000" --tag Player',
            expectedMethod: 'modify_object',
        },
        {
            skill: 'stemstudio-objects',
            script: 'create_group.py',
            args: '--name TestGroup',
            expectedMethod: 'create_group',
        },
        {
            skill: 'stemstudio-objects',
            script: 'clone_object.py',
            args: 'TestObj',
            expectedMethod: 'clone_object',
        },
        {
            skill: 'stemstudio-objects',
            script: 'move_object.py',
            args: 'TestObj ParentObj',
            expectedMethod: 'move_object',
        },
        {
            skill: 'stemstudio-materials',
            script: 'set_material.py',
            args: 'TestObj --color "#888888"',
            expectedMethod: 'set_material',
        },
        {
            skill: 'stemstudio-materials',
            script: 'set_texture.py',
            args: 'TestObj /textures/brick.jpg',
            expectedMethod: 'set_texture',
        },
        {
            skill: 'stemstudio-materials',
            script: 'set_external_texture.py',
            args: 'TestObj --assetId wood_001 --assetType textures --name "Wood" --provider polyhaven',
            expectedMethod: 'set_external_texture',
        },
        {
            skill: 'stemstudio-assets',
            script: 'add_model_to_scene.py',
            args: 'ext-123 "Test Model" sketchfab "https://example.com/model.glb"',
            expectedMethod: 'add_model_to_scene',
        },
        {
            skill: 'stemstudio-assets',
            script: 'generate_3d_model.py',
            args: '"a red sphere"',
            expectedMethod: 'generate_3d_model',
        },
        {
            skill: 'stemstudio-behaviors',
            script: 'add_navmesh.py',
            args: '--target "Default Scene" --autoGenerate true --agentHeight 1.8 --agentRadius 0.45',
            expectedMethod: 'add_navmesh',
        },
        {
            skill: 'stemstudio-behaviors',
            script: 'rebuild_navmesh.py',
            args: '--target "Default Scene"',
            expectedMethod: 'rebuild_navmesh',
        },
        {
            skill: 'stemstudio-behaviors',
            script: 'add_navmesh_connection.py',
            args: 'A B --bidirectional false --radius 0.75',
            expectedMethod: 'add_navmesh_connection',
        },
        {
            skill: 'stemstudio-behaviors',
            script: 'add_waypoint_path.py',
            args: '--name Patrol --position 0 0 0 --loop true',
            expectedMethod: 'add_waypoint_path',
        },
        {
            skill: 'stemstudio-behaviors',
            script: 'add_waypoint.py',
            args: '--path Patrol --position 1 0 2 --order 0 --waitTime 1.5',
            expectedMethod: 'add_waypoint',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_scene_lighting.py',
            args: '--ambient \'{"color":"#ffffff","intensity":0.5}\'',
            expectedMethod: 'set_scene_lighting',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_light_properties.py',
            args: '--target Directional --intensity 2 --castShadow on',
            expectedMethod: 'set_light_properties',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_scene_fog.py',
            args: '--type linear --color "#aaaaaa" --near 5 --far 50',
            expectedMethod: 'set_scene_fog',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_scene_background.py',
            args: '--type Color --color "#000000"',
            expectedMethod: 'set_scene_background',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_tone_mapping.py',
            args: '--type ACESFilmic --exposure 1.0',
            expectedMethod: 'set_tone_mapping',
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'set_post_processing.py',
            args: '--bloom \'{"enabled":true}\'',
            expectedMethod: 'set_post_processing',
        },
        {
            skill: 'stemstudio-camera',
            script: 'set_camera_settings.py',
            args: '--target PlayerCam --cameraType THIRD_PERSON',
            expectedMethod: 'set_camera_settings',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'set_game_settings.py',
            args: '--enabled true --lives 3',
            expectedMethod: 'set_game_settings',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'set_rendering_settings.py',
            args: '--useShadows true',
            expectedMethod: 'set_rendering_settings',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'set_project_title.py',
            args: '"Flight MVP"',
            expectedMethod: 'set_project_title',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'set_scene_compartments.py',
            args: '--enabled off',
            expectedMethod: 'set_scene_compartments',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'create_project_task.py',
            args: '--title "Add flight controls" --status todo --order 1',
            expectedMethod: 'create_project_task',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'update_project_task.py',
            args: '--task-id task-1 --status done',
            expectedMethod: 'update_project_task',
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'delete_project_task.py',
            args: '--task-id task-1',
            expectedMethod: 'delete_project_task',
        },
    ];

    for (const { skill, script, args, expectedMethod } of mutationTests) {
        test(`${skill}/${script} produces valid JSON-RPC for ${expectedMethod}`, () => {
            const scriptPath = path.join(SKILLS_ROOT, skill, 'scripts', script);
            const result = execSync(`python3 "${scriptPath}" ${args}`, {
                timeout: 10_000,
                encoding: 'utf-8',
            }).trim();

            const parsed = JSON.parse(result);

            // Handle both single messages and batch arrays
            const messages = Array.isArray(parsed) ? parsed : [parsed];
            for (const msg of messages) {
                expect(msg.jsonrpc).toBe('2.0');
                expect(msg.method).toBe(expectedMethod);
                expect(typeof msg.params).toBe('object');
                expect(typeof msg.id).toBe('number');
            }
        });
    }

    test('batch_create_primitives.py produces batch JSON-RPC', () => {
        const scriptPath = path.join(SKILLS_ROOT, 'stemstudio-objects', 'scripts', 'batch_create_primitives.py');
        const objects = JSON.stringify([{ type: 'box', name: 'A' }, { type: 'sphere', name: 'B' }]);
        const result = execSync(`python3 "${scriptPath}" --objects '${objects}'`, {
            timeout: 10_000,
            encoding: 'utf-8',
        }).trim();

        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
        expect(parsed[0].method).toBe('create_primitive');
        expect(parsed[1].method).toBe('create_primitive');
        expect(parsed[0].id).toBe(1);
        expect(parsed[1].id).toBe(2);
    });

    test('modify_object.py includes player tag when provided', () => {
        const scriptPath = path.join(SKILLS_ROOT, 'stemstudio-objects', 'scripts', 'modify_object.py');
        const result = execSync(`python3 "${scriptPath}" Player --tag Player`, {
            timeout: 10_000,
            encoding: 'utf-8',
        }).trim();

        const parsed = JSON.parse(result);
        expect(parsed.method).toBe('modify_object');
        expect(parsed.params.target).toBe('Player');
        expect(parsed.params.tag).toBe('Player');
    });

    test('batch_modify_objects.py produces batch JSON-RPC', () => {
        const scriptPath = path.join(SKILLS_ROOT, 'stemstudio-objects', 'scripts', 'batch_modify_objects.py');
        const objects = JSON.stringify([{ target: 'A', color: '#ff0000', tag: 'Player' }, { target: 'B', color: '#00ff00' }]);
        const result = execSync(`python3 "${scriptPath}" --objects '${objects}'`, {
            timeout: 10_000,
            encoding: 'utf-8',
        }).trim();

        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
        expect(parsed[0].method).toBe('modify_object');
        expect(parsed[1].method).toBe('modify_object');
        expect(parsed[0].params.tag).toBe('Player');
    });

    test('batch_delete_objects.py produces batch JSON-RPC', () => {
        const scriptPath = path.join(SKILLS_ROOT, 'stemstudio-objects', 'scripts', 'batch_delete_objects.py');
        const result = execSync(`python3 "${scriptPath}" A B C`, {
            timeout: 10_000,
            encoding: 'utf-8',
        }).trim();

        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(3);
        for (const msg of parsed) {
            expect(msg.method).toBe('delete_object');
        }
    });
});

// ---------------------------------------------------------------------------
// Test 7: Read script HTTP call structure
// ---------------------------------------------------------------------------

describe('Test 7: Read script structure', () => {
    // We can't easily mock HTTP in a subprocess test, but we can verify
    // scripts have the right argparse structure by checking --help output.
    // Session IDs are supplied via STUDIO_SESSION_ID, never via --sessionId.
    const readTests: Array<{ skill: string; script: string; requiredArgs: string[] }> = [
        {
            skill: 'stemstudio-scene',
            script: 'get_scene_objects.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-scene',
            script: 'get_object.py',
            requiredArgs: ['--target'],
        },
        {
            skill: 'stemstudio-scene',
            script: 'get_selected_object.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-scene',
            script: 'get_player.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-assets',
            script: 'search_local_assets.py',
            requiredArgs: ['--phrases'],
        },
        {
            skill: 'stemstudio-assets',
            script: 'get_library_asset.py',
            requiredArgs: ['--assetId'],
        },
        {
            skill: 'stemstudio-assets',
            script: 'search_external_assets.py',
            requiredArgs: ['--prompt'],
        },
        {
            skill: 'stemstudio-atmosphere',
            script: 'get_editor_settings.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-camera',
            script: 'get_editor_settings.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'get_editor_settings.py',
            requiredArgs: [],
        },
        {
            skill: 'stemstudio-project-settings',
            script: 'list_project_tasks.py',
            requiredArgs: ['--sceneID', '--taskSessionID', '--status', '--limit'],
        },
    ];

    for (const { skill, script, requiredArgs } of readTests) {
        test(`${skill}/${script} --help mentions required args`, () => {
            const scriptPath = path.join(SKILLS_ROOT, skill, 'scripts', script);
            let helpText: string;
            try {
                helpText = execSync(`python3 "${scriptPath}" --help`, {
                    timeout: 10_000,
                    encoding: 'utf-8',
                });
            } catch (err: any) {
                helpText = (err.stdout || '') + (err.stderr || '');
            }

            for (const arg of requiredArgs) {
                expect(helpText).toContain(arg);
            }
            expect(helpText).not.toContain('--sessionId');
        });
    }
});

// ---------------------------------------------------------------------------
// Test 8: System prompt includes new skills in catalog
// ---------------------------------------------------------------------------

describe('Test 8: System prompt includes new skills', () => {
    test('buildSystemPrompt output contains all 7 new skill names', async () => {
        const promptPath = path.join(PROJECT_ROOT, 'src', 'vercel-rest', 'system-prompt.ts');
        const { buildSystemPrompt } = await import(promptPath);

        const prompt = buildSystemPrompt({ provider: 'anthropic', mode: 'full' });

        for (const skill of Object.keys(NEW_SKILL_SCRIPTS)) {
            expect(prompt).toContain(skill);
        }

        // Old skill names should NOT appear
        expect(prompt).not.toContain('stemstudio-3d');
        expect(prompt).not.toContain('stemstudio-editor-settings');
    });
});
