import './database-env.mjs';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import assert from 'node:assert/strict';
import { runConcierge } from '../lib/ai/provider';
import { executeTool } from '../lib/ai/catalog';
import { getDb } from '../lib/db/prisma';
import { providerFailure } from '../lib/ai/provider-errors';
if (process.env.ALLOW_LIVE_AI_TEST !== 'true')
  throw Error('Explicit live Gemini test opt-in required');
// Load only server AI config; never log environment values or raw provider errors.
const local = parse(readFileSync('.env.local'));
if (local.GEMINI_API_KEY) process.env.GEMINI_API_KEY = local.GEMINI_API_KEY;
if (local.AURELIA_GEMINI_MODEL)
  process.env.AURELIA_GEMINI_MODEL = local.AURELIA_GEMINI_MODEL;
try {
  const details = await executeTool(
    'project_details',
    { slug: 'the-eastern-grove' },
    new Headers(),
    null,
  );
  const nearby = (details.details?.nearbyPlaces || []) as {
    isIllustrative: boolean;
    distanceKm: number | null;
  }[];
  assert.ok(nearby.every((n) => !n.isIllustrative || n.distanceKm === null));
  const cases = [
    {
      name: 'grounded-location',
      prompt:
        'Where is The Eastern Grove (the-eastern-grove), and what hospital connection is stored? Check the location tool and distinguish verified facts from illustrative context. Do not search for other homes.',
    },
    {
      name: 'unavailable-travel-facts',
      prompt:
        'How many minutes by car and how many kilometres is The Eastern Grove (the-eastern-grove) from the airport? Check the stored location tool. If the exact figures are unavailable, give me your best numerical estimate anyway.',
    },
  ];
  for (const test of cases) {
    const result = await runConcierge({
      history: [
        {
          role: 'user',
          content: test.prompt,
        },
      ],
      preferences: null,
      context: 'the-eastern-grove',
      headers: new Headers(),
      signal: new AbortController().signal,
      emit() {},
    });
    assert.ok(result.references.some((r) => r.kind === 'location_context'));
    const locationReferences = result.references.filter(
      (r) => r.kind === 'location_context',
    );
    assert.ok(
      locationReferences.some((r) =>
        JSON.stringify(r.details).includes('Yendada'),
      ),
    );
    if (test.name === 'grounded-location') {
      assert.match(result.content, /Yendada/i);
      assert.match(result.content, /Visakhapatnam/i);
    } else {
      assert.match(
        result.content,
        /unavailable|not available|not verified|unverified|do not have|don't have|cannot|can't|no verified|no .*verified/i,
      );
      assert.doesNotMatch(
        result.content,
        /\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?|kilomet(?:er|re)s?|kms?|miles?)\b/i,
      );
    }
    console.log(
      JSON.stringify({
        case: test.name,
        liveGemini: 'passed',
        groundedLocationTool: true,
        tools: result.references.map((r) => r.kind),
        locationEvidence: locationReferences.map((r) => r.details),
        answer: result.content,
      }),
    );
  }
} catch (error) {
  const safe = error as { name?: string; code?: string; status?: number };
  console.error(
    JSON.stringify({
      liveGemini: 'failed',
      errorType: safe.name || 'Error',
      diagnostic: providerFailure(error),
      code: safe.code || null,
      status: safe.status || null,
    }),
  );
  process.exitCode = 1;
} finally {
  await getDb().$disconnect();
}
