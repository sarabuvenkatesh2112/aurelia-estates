import { whatsappConfig } from '@/lib/communications/config';
import {
  validSignature,
  verifyChallenge,
  rawWebhook,
} from '@/lib/communications/signature';
import { ingestWebhook } from '@/lib/communications/webhook';
import { z } from 'zod';
import { PublicError } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const challenge = verifyChallenge(
    new URL(request.url).searchParams,
    whatsappConfig().verifyToken,
  );
  return new Response(challenge || 'Verification rejected', {
    status: challenge ? 200 : 403,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' },
  });
}
export async function POST(request: Request) {
  const config = whatsappConfig();
  if (!config.appSecret || !config.phoneNumberId || !config.businessAccountId)
    return new Response('Webhook not configured', { status: 503 });
  let raw: Buffer;
  try {
    raw = await rawWebhook(request);
  } catch {
    return new Response('Invalid payload', { status: 413 });
  }
  if (
    !validSignature(
      raw,
      request.headers.get('x-hub-signature-256'),
      config.appSecret,
    )
  )
    return new Response('Signature rejected', { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }
  try {
    await ingestWebhook(payload, config);
    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    return new Response('Event could not be processed', { status: error instanceof z.ZodError?400:error instanceof PublicError?error.status:503 });
  }
}
