/**
 * Standalone CLI agent — run the copilot from the terminal without the Express server.
 *
 * Runtime:  bun src/standalone/main.ts [prompt] [flags]
 * Script:   `bun run cli`
 *
 * Modes (--mode or AI_AGENT_MODE env):
 *   standalone (default) — Claude Agent SDK subprocess (ANTHROPIC_API_KEY required)
 *   shared               — Vercel AI SDK multi-provider loop (STUDIO_SESSION_ID required)
 *
 * Flags:
 *   --mode <standalone|shared>
 *   --provider <anthropic|openai|codex|google|...>   (shared mode only)
 *   --model <model-id>
 *   --sessionId <studio-session-id>                  (shared mode only)
 *
 * Examples:
 *   bun run cli "build a maze game"
 *   bun run cli --mode shared --provider openai --sessionId abc123 "add a cube"
 */

import dotenv from 'dotenv';
import { runAgent as runSharedAgent } from '../vercel-rest/agent.js';
import { resolveProviderConfig } from '../vercel-rest/provider-config.js';
import { STEMSTUDIO_SYSTEM_PROMPT } from './system-prompt.js';

dotenv.config();

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readPromptArg(): string | undefined {
  const args = process.argv.slice(2);
  const flagsWithValue = new Set(['--provider', '--model', '--sessionId', '--mode']);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (flagsWithValue.has(arg)) {
      i++;
      continue;
    }
    if (arg.startsWith('--')) continue;
    return arg;
  }

  return undefined;
}

type AgentMode = 'standalone' | 'shared';

function resolveAgentMode(): AgentMode {
  const cliMode = readArg('--mode');
  const envMode = process.env.AI_AGENT_MODE;
  const mode = (cliMode || envMode || 'standalone').toLowerCase();

  if (mode === 'standalone' || mode === 'shared') {
    return mode;
  }

  throw new Error(`Invalid AI_AGENT_MODE "${mode}". Valid values: claude, shared`);
}

async function runClaudeMode(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for standalone mode.');
  }

  // Dynamic import — standalone mode is not in active use (future feature).
  // The package is available as a nested dependency of @zed-industries/claude-code-acp,
  // so it doesn't need to be listed as a direct dependency in package.json.
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  const model = readArg('--model') || process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';

  console.log('Starting agent query...\n');
  console.log('Mode: standalone');
  console.log(`Model: ${model}`);
  console.log();

  const q = query({
    prompt,
    options: {
      model,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: apiKey,
      },
      systemPrompt: STEMSTUDIO_SYSTEM_PROMPT,
      permissionMode: 'acceptEdits',
      settingSources: ['user', 'project', 'local'],
      allowedTools: ['Skill'],
    },
  });

  for await (const message of q) {
    if (message.type === 'assistant') {
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          }
        }
      }
    } else if (message.type === 'result') {
      console.log('\n\n--- Final Result ---');
      if (message.subtype === 'success') {
        console.log('Status: Success');
        console.log(`Turns: ${message.num_turns}`);
        console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`Status: ${message.subtype}`);
      }
    }
  }
}

async function runSharedMode(prompt: string) {
  const provider = readArg('--provider') || process.env.AI_PROVIDER;
  const model = readArg('--model') || process.env.AI_MODEL;
  const sessionId = readArg('--sessionId') || process.env.STUDIO_SESSION_ID;

  if (!sessionId) {
    throw new Error(
      'STUDIO_SESSION_ID (or --sessionId) is required for the shared agentic flow.',
    );
  }

  const resolved = resolveProviderConfig({ provider, model });

  console.log('Starting agent query...\n');
  console.log('Mode: shared');
  console.log(`Provider: ${resolved.provider}`);
  console.log(`Model: ${resolved.model}`);
  console.log(`Session: ${sessionId}`);
  console.log();

  const result = await runSharedAgent(prompt, {
    provider: resolved.provider,
    model: resolved.model,
    sessionId,
  });

  console.log('\n--- Assistant ---');
  console.log(result.text || '(no text output)');
  console.log('\n--- Final Result ---');
  console.log(`Status: ${result.finishReason === 'stop' ? 'Success' : result.finishReason}`);
  console.log(`Provider: ${result.provider}`);
  console.log(`Model: ${result.model}`);
  console.log(`Steps: ${result.steps}`);
  console.log(`Tool Calls: ${result.toolCalls.length}`);
  if (result.toolCalls.length > 0) {
    const toolCounts = new Map<string, number>();
    for (const call of result.toolCalls) {
      toolCounts.set(call.toolName, (toolCounts.get(call.toolName) || 0) + 1);
    }
    console.log(
      `Top Tools: ${[...toolCounts.entries()].map(([name, count]) => `${name}(${count})`).join(', ')}`,
    );
  }
}

async function runCli(prompt: string) {
  const mode = resolveAgentMode();
  if (mode === 'standalone') {
    await runClaudeMode(prompt);
    return;
  }
  await runSharedMode(prompt);
}

async function main() {
  const promptArg = readPromptArg();
  const prompt = promptArg || 'Create a simple game-ready scene and explain each step.';

  console.log(`Prompt: ${prompt}\n`);
  console.log('='.repeat(50));

  await runCli(prompt);

  console.log('\n' + '='.repeat(50));
  console.log('Agent finished!');
}

main().catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
