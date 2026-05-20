/**
 * List available copilot skills.
 *
 * Runtime:  bun src/standalone/list-skills.ts
 * Script:   `bun run skills`
 *
 * Scans ai/claude/skills/ for SKILL.md files and prints a catalog to stdout.
 */

import dotenv from 'dotenv';
import { loadAllSkills, getSkillCatalog } from '../vercel-rest/skills/skill-loader.js';

dotenv.config();

function main() {
  const count = loadAllSkills();
  const skills = getSkillCatalog();

  console.log('='.repeat(60));
  console.log('AVAILABLE SKILLS');
  console.log('='.repeat(60));
  console.log();

  if (count === 0 || skills.length === 0) {
    console.log('No skills found.');
    console.log();
    console.log('Expected path: ai/claude/skills/*/SKILL.md');
    console.log('If needed, sync local skills using: ./update_local_skills.sh');
    return;
  }

  console.log(`Found ${skills.length} skill(s):\n`);
  skills.forEach((skill, index) => {
    console.log(`${index + 1}. ${skill.name}`);
    console.log(`   ${skill.description}`);
    console.log();
  });

  console.log('Usage from /api/vercel-rest: call load_skill, read_skill_script, run_skill_script.');
}

main();
