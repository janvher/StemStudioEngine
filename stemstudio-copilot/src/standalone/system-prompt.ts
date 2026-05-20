import { buildSystemPrompt } from '../vercel-rest/system-prompt.js';

/**
 * Canonical full Anthropic prompt used by Claude mode.
 * Shared prompt builder keeps Claude/Codex/Vercel-AI-SDK aligned.
 */
export const STEMSTUDIO_SYSTEM_PROMPT = buildSystemPrompt({
  provider: 'anthropic',
  mode: 'full',
});
