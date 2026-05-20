/**
 * Prepends src/acp/claude/sdk_patch.js to the Claude Code CLI bundle.
 *
 * Runs automatically via the "postinstall" npm/bun script after every
 * `bun install`. Safe to run multiple times — a sentinel comment prevents
 * double-patching.
 *
 * To re-apply a changed patch without reinstalling:
 *   node scripts/patch-sdk.mjs
 *
 * To force re-apply (e.g. after changing sdk_patch.js):
 *   FORCE_PATCH=1 node scripts/patch-sdk.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SENTINEL = '/* __sdk_patch_applied__ */';
const patchPath = resolve(root, 'src/acp/claude/sdk_patch.js');
const cliPath   = resolve(root, 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

let cli;
try {
  cli = readFileSync(cliPath, 'utf8');
} catch (e) {
  console.error(`patch-sdk: cli.js not found at ${cliPath} — skipping`);
  process.exit(0);
}

let patch;
try {
  patch = readFileSync(patchPath, 'utf8');
} catch (e) {
  console.error(`patch-sdk: sdk_patch.js not found at ${patchPath} — skipping`);
  process.exit(0);
}

if (cli.startsWith(SENTINEL) && !process.env.FORCE_PATCH) {
  console.log('patch-sdk: already applied — skipping (set FORCE_PATCH=1 to re-apply)');
  process.exit(0);
}

// Preserve the shebang from cli.js so the file remains executable as-is.
// Strip shebang from sdk_patch.js if present — there must be exactly one, at line 1.
const cliLines = cli.startsWith(SENTINEL)
  ? cli.slice(cli.indexOf('\n', SENTINEL.length) + 1)
  : cli;

const shebangMatch = cliLines.match(/^(#![^\n]*\n)/);
const shebang      = shebangMatch ? shebangMatch[1] : '';
const cliBody      = shebang ? cliLines.slice(shebang.length) : cliLines;
const patchBody    = patch.replace(/^#![^\n]*\n/, '');

writeFileSync(cliPath, `${shebang}${SENTINEL}\n${patchBody}\n${cliBody}`);
console.log(`patch-sdk: applied ${patchPath} → ${cliPath}`);
