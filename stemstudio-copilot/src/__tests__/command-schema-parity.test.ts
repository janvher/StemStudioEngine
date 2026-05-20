import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { apiRequestConfigs } from '../standalone/command-schema';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
// CommandsRegistry moved to web/packages/shared/src/agent/ as part of the
// monorepo split in de-shadow-editor. Fall back to the legacy path so
// older editor checkouts still work.
const REGISTRY_CANDIDATES = [
    path.resolve(PROJECT_ROOT, '..', 'web', 'packages', 'shared', 'src', 'agent', 'CommandsRegistry.ts'),
    path.resolve(PROJECT_ROOT, '..', 'web', 'src', 'agent', 'CommandsRegistry.ts'),
];
const WEB_COMMANDS_REGISTRY = REGISTRY_CANDIDATES.find(p => fs.existsSync(p)) ?? REGISTRY_CANDIDATES[0];

function readWebSupportedCommands(): string[] {
    const source = fs.readFileSync(WEB_COMMANDS_REGISTRY, 'utf-8');
    const enumMatch = source.match(/export enum SupportedCommands \{([\s\S]*?)\n\}/);
    if (!enumMatch) {
        throw new Error('Could not find SupportedCommands enum in web CommandsRegistry.ts');
    }

    return Array.from(enumMatch[1].matchAll(/=\s*"([^"]+)"/g))
        .map(match => match[1])
        .sort();
}

describe('command schema parity', () => {
    test('copilot schema covers every web SupportedCommands entry', () => {
        const webCommands = readWebSupportedCommands();
        const schemaCommands = apiRequestConfigs.map(config => config.command).sort();

        expect(schemaCommands).toEqual(webCommands);
    });
});
