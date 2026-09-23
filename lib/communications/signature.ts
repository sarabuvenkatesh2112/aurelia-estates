import { createHmac, timingSafeEqual } from 'node:crypto';
export function validSignature(
  raw: Uint8Array,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  return timingSafeEqual(
    createHmac('sha256', secret).update(raw).digest(),
    Buffer.from(signature.slice(7), 'hex'),
  );
}
export function verifyChallenge(params: URLSearchParams, token: string) {
  const received = params.get('hub.verify_token') || '',
    challenge = params.get('hub.challenge') || '';
  const a = Buffer.from(received),
    b = Buffer.from(token);
  return token &&
    a.length === b.length &&
    timingSafeEqual(a, b) &&
    params.get('hub.mode') === 'subscribe' &&
    /^\d{1,100}$/.test(challenge)
    ? challenge
    : null;
}
export async function rawWebhook(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing payload');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 262144) {
      await reader.cancel();
      throw new Error('Payload limit');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
