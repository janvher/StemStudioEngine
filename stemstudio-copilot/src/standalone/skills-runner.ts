/**
 * Interactive skill script runner.
 *
 * Runtime: bun src/standalone/skills-runner.ts
 * Script:  bun run skills:run
 *
 * Scans skill script directories under ai/claude/skills for Python scripts,
 * lets you select a
 * category and script, then executes it with provided args.
 */

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

dotenv.config();

type SkillEntry = {
  name: string;
  basePath: string;
  scriptsPath: string;
  scripts: string[];
};

const SKILLS_ROOT = path.resolve(process.cwd(), 'ai/claude/skills');
const DEFAULT_BASE_URL = process.env.API_SERVER_BASE_URL || 'http://localhost:3000';

function parseArgs(raw: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current.length > 0) args.push(current);
  return args;
}

function toDisplayName(skillName: string): string {
  return skillName.replace(/^stemstudio-/, '').replace(/-/g, ' ');
}

async function discoverSkills(): Promise<SkillEntry[]> {
  const dirents = await fs.readdir(SKILLS_ROOT, { withFileTypes: true });
  const skills: SkillEntry[] = [];

  for (const entry of dirents) {
    if (!entry.isDirectory()) continue;
    const basePath = path.join(SKILLS_ROOT, entry.name);
    const scriptsPath = path.join(basePath, 'scripts');

    try {
      const scriptDirEntries = await fs.readdir(scriptsPath, { withFileTypes: true });
      const scripts = scriptDirEntries
        .filter((d) => d.isFile() && d.name.endsWith('.py'))
        .map((d) => d.name)
        .sort();

      if (scripts.length > 0) {
        skills.push({
          name: entry.name,
          basePath,
          scriptsPath,
          scripts,
        });
      }
    } catch {
      // Skill without scripts directory; skip.
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function askIndex(
  rl: readline.Interface,
  title: string,
  options: string[],
): Promise<number | null> {
  console.log(`\n${title}`);
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}. ${options[i]}`);
  }

  const answer = (await rl.question('\nChoose a number (or q to quit): ')).trim();
  if (answer.toLowerCase() === 'q') return null;

  const idx = Number.parseInt(answer, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > options.length) {
    console.log('Invalid selection.');
    return askIndex(rl, title, options);
  }
  return idx - 1;
}

async function scriptSupportsArg(scriptPath: string, argName: string): Promise<boolean> {
  const content = await fs.readFile(scriptPath, 'utf-8');
  return content.includes(`"${argName}"`) || content.includes(`'${argName}'`);
}

async function runScript(scriptPath: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath),
      env,
    });
    proc.on('close', (code) => resolve(code ?? 1));
    proc.on('error', () => resolve(1));
  });
}

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    const skills = await discoverSkills();
    if (skills.length === 0) {
      console.log('No skill scripts found in ai/claude/skills/*/scripts');
      return;
    }

    console.log('='.repeat(64));
    console.log('STEMSTUDIO SKILLS SCRIPT RUNNER');
    console.log('='.repeat(64));

    const sessionId = (await rl.question('Session ID (required): ')).trim();
    if (!sessionId) {
      console.log('Session ID is required.');
      return;
    }

    const baseUrlInput = (await rl.question(
      `API base URL [${DEFAULT_BASE_URL}]: `,
    )).trim();
    const baseUrl = baseUrlInput || DEFAULT_BASE_URL;

    while (true) {
      const skillIdx = await askIndex(
        rl,
        'API Category (skill):',
        skills.map((s) => `${toDisplayName(s.name)} (${s.name})`),
      );
      if (skillIdx === null) break;
      const skill = skills[skillIdx];

      const scriptIdx = await askIndex(
        rl,
        `Scripts in ${skill.name}:`,
        skill.scripts,
      );
      if (scriptIdx === null) break;
      const scriptName = skill.scripts[scriptIdx];
      const scriptPath = path.join(skill.scriptsPath, scriptName);

      const rawArgs = (await rl.question(
        'Extra args (raw CLI args, optional): ',
      )).trim();
      const args = parseArgs(rawArgs);

      const supportsUrl = await scriptSupportsArg(scriptPath, '--url');

      if (supportsUrl && !args.includes('--url')) {
        args.push('--url', baseUrl);
      }

      console.log(`\nRunning: python3 ${scriptPath} ${args.join(' ')}`);
      const code = await runScript(scriptPath, args, {
        ...process.env,
        STUDIO_SESSION_ID: sessionId,
        API_SERVER_BASE_URL: baseUrl,
      });
      console.log(`\nExit code: ${code}`);

      const again = (await rl.question('\nRun another script? (y/n): ')).trim().toLowerCase();
      if (again !== 'y' && again !== 'yes') break;
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Runner failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
