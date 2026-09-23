import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { runGeminiConcierge } from './gemini-provider';
import type { runOpenAIConcierge } from './openai-provider';
import { PublicError } from '@/lib/http';
export type ConciergeOptions = Parameters<typeof runOpenAIConcierge>[0];
function config() {
  const local = existsSync('.env.ai') ? parse(readFileSync('.env.ai')) : {};
  return {
    key: process.env.GEMINI_API_KEY || local.GEMINI_API_KEY,
    model:
      process.env.AURELIA_GEMINI_MODEL ||
      local.AURELIA_GEMINI_MODEL ||
      'gemini-3.1-flash-lite',
  };
}
export const providerReady = () => Boolean(config().key);
export async function runConcierge(options: ConciergeOptions) {
  const cfg = config();
  if (!cfg.key)
    throw new PublicError(
      'Aurelia AI is not connected yet. You can still browse the collection and arrange a visit.',
      503,
    );
  // Gemini is active. No automatic or quota-triggered paid fallback.
  return runGeminiConcierge(options, { key: cfg.key, model: cfg.model });
}
