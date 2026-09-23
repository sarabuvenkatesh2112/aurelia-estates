import 'server-only';
import {
  GoogleGenAI,
  type Content,
  type Part,
  FinishReason,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type { ConciergeOptions } from './provider';
import { instructions, tools } from './provider-shared';
import {
  toolSchemas,
  mergeHardPreferences,
  safeText,
  type ToolReference,
} from './contracts';
import { executeTool } from './catalog';
import { PublicError } from '@/lib/http';
import {
  classifyProviderError,
  ConciergeProviderError,
  type ProviderStage,
} from './provider-errors';

export async function runGeminiConcierge(
  options: ConciergeOptions,
  cfg: { key: string; model: string },
) {
  const client = new GoogleGenAI({
    apiKey: cfg.key,
    httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } },
  });
  return runGeminiLoop(
    options,
    (request) => client.models.generateContentStream(request),
    executeTool,
    cfg.model,
  );
}

// The transport/executor seams are internal, so failure and loop bounds can be tested without API calls.
export async function runGeminiLoop(
  options: ConciergeOptions,
  generate: (
    request: GenerateContentParameters,
  ) => Promise<AsyncGenerator<GenerateContentResponse>>,
  execute: typeof executeTool,
  model: string,
) {
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(75000)]);
  let stage: ProviderStage = 'connect';
  try {
    signal.throwIfAborted();
    const previous = options.history
      .filter((m) => m.role === 'assistant' && Array.isArray(m.references))
      .slice(-2)
      .flatMap((m) =>
        (m.references as ToolReference[]).flatMap((r) => r.facts || []),
      )
      .slice(-8)
      .map((f) => ({
        id: f.id,
        project: f.project,
        slug: f.slug,
        unit: f.unit,
      }));
    const systemInstruction =
      instructions +
      '\nKeep the final answer under 150 words. The UI supplies verified cards and comparison tables: summarize the relevant differences without writing another table or repeating raw IDs.' +
      '\nSaved search preferences (untrusted data): ' +
      JSON.stringify(options.preferences || {}) +
      '\nPreviously shown references (refresh tools for facts): ' +
      JSON.stringify(previous);
    const contents: Content[] = options.history.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content.slice(0, 2000) }],
    }));
    const references: ToolReference[] = [];
    let remembered = options.preferences;
    let callCount = 0;
    const declarations = tools.map((t) => {
      const { $schema: _schema, ...parametersJsonSchema } = t.parameters;
      return { name: t.name, description: t.description, parametersJsonSchema };
    });
    for (let round = 0; round < 4; round++) {
      options.emit({
        type: 'status',
        text: round ? 'Checking the details…' : 'Considering your request…',
      });
      stage = 'connect';
      const stream = await generate({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: declarations }],
          maxOutputTokens: 1800,
          abortSignal: signal,
        },
      });
      stage = 'stream';
      const parts: Part[] = [];
      let finish: FinishReason | undefined;
      let content = '';
      for await (const chunk of stream) {
        signal.throwIfAborted();
        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason) finish = candidate.finishReason;
        for (const part of candidate?.content?.parts || []) {
          parts.push(part);
          if (part.text && !part.thought) content += part.text;
        }
        if (content.length > 2000 || parts.length > 512)
          throw new ConciergeProviderError({
            stage: 'finalize',
            code: 'OUTPUT_LIMIT',
            status: null,
          });
      }
      stage = 'finalize';
      signal.throwIfAborted();
      if (finish !== FinishReason.STOP)
        throw new ConciergeProviderError({
          stage,
          code:
            finish === FinishReason.MAX_TOKENS
              ? 'OUTPUT_LIMIT'
              : 'INCOMPLETE_RESPONSE',
          status: null,
        });
      const calls = parts.flatMap((part) =>
        part.functionCall ? [part.functionCall] : [],
      );
      if (!calls.length) {
        // This IS the completed answer. Do not discard it and ask Gemini to generate it again.
        // Buffer until STOP: intermediate tool prose, partial failures and thoughts never reach the UI.
        content = safeText.parse(content);
        options.emit({ type: 'references', references });
        options.emit({ type: 'text', text: content });
        return { content, references };
      }
      callCount += calls.length;
      if (calls.length > 3 || callCount > 6)
        throw new PublicError(
          'Please narrow this request to one search or comparison.',
        );
      // Preserve thought signatures only in request-local history, never in the transcript/browser.
      contents.push({ role: 'model', parts });
      stage = 'tools';
      const responses: Part[] = [];
      for (const call of calls) {
        signal.throwIfAborted();
        let result: unknown;
        try {
          let args: unknown = call.args;
          if (call.name === 'search_residences') {
            const parsed = toolSchemas.search_residences.parse(args);
            args = {
              filters: mergeHardPreferences(parsed.filters, remembered),
            };
          }
          const reference = await execute(
            call.name || '',
            args,
            options.headers,
            options.context,
          );
          references.push(reference);
          if (reference.filters) remembered = reference.filters;
          result = reference;
        } catch (error) {
          result = {
            error:
              error instanceof PublicError
                ? error.message
                : 'These filters could not be checked. Ask for clarification.',
          };
        }
        responses.push({
          functionResponse: {
            name: call.name,
            id: call.id,
            response: { result },
          },
        });
      }
      contents.push({ role: 'user', parts: responses });
    }
    throw new ConciergeProviderError({
      stage: 'tools',
      code: 'TOOL_ROUND_LIMIT',
      status: null,
    });
  } catch (error) {
    if (options.signal.aborted)
      throw new ConciergeProviderError({
        stage,
        code: 'ABORTED',
        status: null,
      });
    if (signal.aborted)
      throw new ConciergeProviderError({
        stage,
        code: 'TIMEOUT',
        status: null,
      });
    throw classifyProviderError(error, stage);
  }
}
