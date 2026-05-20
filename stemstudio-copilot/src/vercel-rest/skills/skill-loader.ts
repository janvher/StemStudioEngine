/**
 * 3-tier skill loader for the Vercel AI SDK agent path.
 *
 * Tier 1 — Metadata catalog (always in system prompt, ~100 tokens/skill)
 * Tier 2 — Full SKILL.md content (loaded on demand via load_skill tool)
 * Tier 3 — Python script source / execution (loaded on demand)
 *
 * Skills live in ai/claude/skills/<name>/SKILL.md and are shared with the
 * Claude ACP path. This loader reads them at startup and caches in memory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('skills');

export type SkillMetadata = {
    name: string;
    description: string;
    content: string;
    basePath: string;
    hasScripts: boolean;
    scriptNames: string[];
};

const skillCache = new Map<string, SkillMetadata>();
let loaded = false;

/**
 * Resolve the skills root directory relative to project root.
 * Works both in dev (project root) and dist (compiled output).
 */
function resolveSkillsRoot(): string {
    // Walk up from this file to find the project root (where ai/claude/skills lives)
    let dir = path.dirname(new URL(import.meta.url).pathname);
    for (let i = 0; i < 5; i++) {
        if (fs.existsSync(path.join(dir, 'ai', 'claude', 'skills'))) {
            return path.join(dir, 'ai', 'claude', 'skills');
        }
        dir = path.dirname(dir);
    }
    // Fallback: assume cwd is project root
    return path.join(process.cwd(), 'ai', 'claude', 'skills');
}

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Extracts `name` and `description` fields without a YAML library.
 */
function parseFrontmatter(raw: string): { name: string; description: string; body: string } | null {
    if (!raw.startsWith('---')) return null;

    const endIdx = raw.indexOf('---', 3);
    if (endIdx === -1) return null;

    const frontmatter = raw.slice(3, endIdx);
    const body = raw.slice(endIdx + 3).trim();

    let name = '';
    let description = '';

    for (const line of frontmatter.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('name:')) {
            name = trimmed.slice(5).trim().replace(/^["']|["']$/g, '');
        } else if (trimmed.startsWith('description:')) {
            description = trimmed.slice(12).trim().replace(/^["']|["']$/g, '');
        }
    }

    if (!name) return null;
    return { name, description, body };
}

/**
 * Tier 1: Load and cache all skill metadata at startup.
 * Returns the number of skills loaded.
 */
export function loadAllSkills(): number {
    if (loaded) return skillCache.size;

    const skillsRoot = resolveSkillsRoot();

    if (!fs.existsSync(skillsRoot)) {
        log.warn(`Skills directory not found: ${skillsRoot}`);
        loaded = true;
        return 0;
    }

    let scriptTotal = 0;

    const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(skillsRoot, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');

        if (!fs.existsSync(skillFile)) continue;

        const raw = fs.readFileSync(skillFile, 'utf-8');
        const parsed = parseFrontmatter(raw);
        if (!parsed) {
            log.warn(`Skipping ${entry.name}: invalid frontmatter`);
            continue;
        }

        // Inventory scripts
        const scriptsDir = path.join(skillDir, 'scripts');
        let scriptNames: string[] = [];
        const hasScripts = fs.existsSync(scriptsDir);
        if (hasScripts) {
            scriptNames = fs.readdirSync(scriptsDir)
                .filter(f => f.endsWith('.py'))
                .sort();
            scriptTotal += scriptNames.length;
        }

        skillCache.set(parsed.name, {
            name: parsed.name,
            description: parsed.description,
            content: parsed.body,
            basePath: skillDir,
            hasScripts,
            scriptNames,
        });
    }

    loaded = true;
    log.info(`Loaded ${skillCache.size} skills (${scriptTotal} scripts)`);
    return skillCache.size;
}

/**
 * Tier 1: Get compact catalog for system prompt injection.
 */
export function getSkillCatalog(): Array<{ name: string; description: string }> {
    if (!loaded) loadAllSkills();
    return Array.from(skillCache.values()).map(s => ({
        name: s.name,
        description: s.description,
    }));
}

/**
 * Tier 2: Get a skill by name (full content).
 */
export function getSkill(name: string): SkillMetadata | undefined {
    if (!loaded) loadAllSkills();
    return skillCache.get(name);
}

/**
 * Tier 3: Get script content by skill name + script name.
 * Returns undefined if the skill or script doesn't exist.
 */
export function getSkillScript(skillName: string, scriptName: string): string | undefined {
    const skill = getSkill(skillName);
    if (!skill || !skill.hasScripts) return undefined;

    // Prevent path traversal
    const safeName = path.basename(scriptName);
    if (safeName !== scriptName || !safeName.endsWith('.py')) return undefined;

    const scriptPath = path.join(skill.basePath, 'scripts', safeName);
    if (!fs.existsSync(scriptPath)) return undefined;

    return fs.readFileSync(scriptPath, 'utf-8');
}

/**
 * List all scripts for a skill.
 */
export function listSkillScripts(skillName: string): string[] {
    const skill = getSkill(skillName);
    return skill?.scriptNames || [];
}

// ─── Auto-skill hints ──────────────────────────────────────────────────────

/**
 * Maps tool names to skills that should be auto-hinted when those tools are called.
 * The hint is a compact snippet (not the full SKILL.md) to keep context usage low.
 */
const SKILL_HINT_MAP: Record<string, string> = {
    add_behavior: 'stemstudio-behaviors',
    update_behavior: 'stemstudio-behaviors',
    add_vfx: 'stemstudio-vfx',
    modify_vfx: 'stemstudio-vfx',
    set_physics: 'stemstudio-physics',
};

/** Track which skills have already been hinted in this process to avoid repetition. */
const hintedSkills = new Set<string>();

/**
 * Get a compact auto-skill hint for a tool call, or undefined if not needed.
 * Returns a short guidance snippet that's injected into the tool result.
 * Only returns a hint once per skill per process lifetime.
 */
export function getAutoSkillHint(toolName: string): string | undefined {
    const skillName = SKILL_HINT_MAP[toolName];
    if (!skillName || hintedSkills.has(skillName)) return undefined;

    const skill = getSkill(skillName);
    if (!skill) return undefined;

    hintedSkills.add(skillName);

    // Return the first ~2000 chars of the skill content as a compact hint
    // This includes the critical workflows and patterns without the full reference
    const truncated = skill.content.length > 2000
        ? skill.content.slice(0, 2000) + '\n\n... [Use load_skill("' + skillName + '") for full reference]'
        : skill.content;

    return `[AUTO-LOADED SKILL HINT: ${skillName}]\n${truncated}`;
}

/** Reset hinted skills tracker (useful for new sessions). */
export function resetSkillHints(): void {
    hintedSkills.clear();
}
