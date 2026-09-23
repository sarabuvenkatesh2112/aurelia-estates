// Offline provider-protocol tests: no configured key, network request or database mutation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FinishReason,
  GenerateContentResponse,
  type Part,
  type GenerateContentParameters,
} from '@google/genai';
import { runGeminiLoop } from '../lib/ai/gemini-provider';
import { providerFailure } from '../lib/ai/provider-errors';
import type { ConciergeOptions } from '../lib/ai/provider';
import { executeTool } from '../lib/ai/catalog';
function chunk(parts: Part[], finishReason?: FinishReason) {
  return Object.assign(new GenerateContentResponse(), {
    candidates: [{ content: { role: 'model', parts }, finishReason }],
  });
}
const options = (
  emit: ConciergeOptions['emit'],
  signal = new AbortController().signal,
): ConciergeOptions => ({
  history: [{ role: 'user', content: 'Compare two verified homes.' }],
  preferences: null,
  headers: new Headers(),
  context: null,
  signal,
  emit,
});
const ids = [crypto.randomUUID(), crypto.randomUUID()];
await test('Comparison preserves function signatures/results and finalizes in two calls without another generation', async () => {
  const events: unknown[] = [],
    requests: GenerateContentParameters[] = [];
  let calls = 0;
  const result = await runGeminiLoop(
    options((e) => events.push(e)),
    async (r) => {
      requests.push(
        structuredClone({
          ...r,
          config: { ...r.config, abortSignal: undefined },
        }),
      );
      const round = calls++;
      return (async function* () {
        if (!round)
          yield chunk(
            [
              {
                functionCall: {
                  id: 'call-1',
                  name: 'compare_units',
                  args: { ids },
                },
                thoughtSignature: 'opaque-fixture-signature',
              },
            ],
            FinishReason.STOP,
          );
        else {
          yield chunk([{ text: 'hidden thought', thought: true }]);
          yield chunk([{ text: 'Both homes are verified. ' }]);
          yield chunk(
            [{ text: 'Use the comparison table.' }],
            FinishReason.STOP,
          );
        }
      })();
    },
    async (name, args) => {
      assert.equal(name, 'compare_units');
      assert.deepEqual(args, { ids });
      return { kind: 'compare_units', facts: [] };
    },
    'offline-fixture',
  );
  assert.equal(calls, 2);
  assert.equal(
    result.content,
    'Both homes are verified. Use the comparison table.',
  );
  const contents = requests[1].contents as { parts: Part[] }[];
  assert.equal(
    contents[1].parts[0].thoughtSignature,
    'opaque-fixture-signature',
  );
  assert.equal(contents[2].parts[0].functionResponse?.id, 'call-1');
  assert.ok(!JSON.stringify(events).includes('hidden thought'));
  assert.ok(!JSON.stringify(events).includes('opaque-fixture'));
});
await test('Truncated, transport-failed and unsafe streams never emit final prose or references', async () => {
  for (const variant of ['truncated', 'transport', 'unsafe']) {
    const events: unknown[] = [];
    await assert.rejects(
      runGeminiLoop(
        options((e) => events.push(e)),
        async () =>
          (async function* () {
            yield chunk([
              {
                text:
                  variant === 'unsafe'
                    ? 'AIza' + 'x'.repeat(35)
                    : 'Incomplete answer',
              },
            ]);
            if (variant === 'transport') throw new TypeError('fetch failed');
            if (variant === 'unsafe') yield chunk([], FinishReason.STOP);
          })(),
        executeTool,
        'offline-fixture',
      ),
    );
    assert.equal(
      events.some((e) =>
        ['text', 'references'].includes((e as { type: string }).type),
      ),
      false,
    );
  }
});
await test('Client abort propagates during generation without publishing a completion', async () => {
  const abort = new AbortController(),
    events: unknown[] = [];
  await assert.rejects(
    runGeminiLoop(
      options((e) => events.push(e), abort.signal),
      async (r) =>
        (async function* () {
          yield chunk([{ text: 'Partial' }]);
          abort.abort();
          assert.equal(r.config?.abortSignal?.aborted, true);
          yield chunk([], FinishReason.STOP);
        })(),
      executeTool,
      'offline-fixture',
    ),
    (e) => providerFailure(e)?.code === 'ABORTED',
  );
  assert.equal(
    events.some((e) => (e as { type: string }).type === 'text'),
    false,
  );
});
await test('Malformed tool calls are bounded and do not execute unauthorized capabilities', async () => {
  let requests = 0;
  await assert.rejects(
    runGeminiLoop(
      options(() => {}),
      async () => {
        requests++;
        return (async function* () {
          yield chunk(
            [{ functionCall: { name: 'run_sql', args: { sql: 'fixture' } } }],
            FinishReason.STOP,
          );
        })();
      },
      executeTool,
      'offline-fixture',
    ),
    (e) => providerFailure(e)?.code === 'TOOL_ROUND_LIMIT',
  );
  assert.equal(requests, 4);
});
await test('Rate limits are classified once, without retries or secret error details', async () => {
  let calls = 0;
  await assert.rejects(
    runGeminiLoop(
      options(() => {}),
      async () => {
        calls++;
        throw Object.assign(new Error('key=private-fixture'), { status: 429 });
      },
      executeTool,
      'offline-fixture',
    ),
    (e) => {
      assert.deepEqual(providerFailure(e), {
        stage: 'connect',
        status: 429,
        code: 'RESOURCE_EXHAUSTED',
      });
      assert.ok(!String(e).includes('private-fixture'));
      return true;
    },
  );
  assert.equal(calls, 1);
});
