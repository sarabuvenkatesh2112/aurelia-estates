import { z } from 'zod';
export class PublicError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: 'Please check the highlighted information.',
        fields: z.flattenError(error).fieldErrors,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  if (error instanceof PublicError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  return Response.json(
    {
      error:
        'The collection is temporarily unavailable. Please try again shortly.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function readBody(request: Request, maxBytes = 8192) {
  const origin = request.headers.get('origin');
  if (origin && !sameOrigin(request))
    throw new PublicError('This request could not be accepted.', 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new PublicError('A JSON request is required.', 415);
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new PublicError('This request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError('Request information is missing.');
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) {
      await reader.cancel();
      throw new PublicError('This request is too large.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new PublicError('Request information could not be read.');
  }
}
export function sameOrigin(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    const configured = process.env.AUTH_BASE_URL || process.env.SITE_URL;
    const target =
      configured &&
      !['localhost', '127.0.0.1'].includes(new URL(configured).hostname)
        ? new URL(configured).origin
        : `${new URL(request.url).protocol}//${request.headers.get('host') || new URL(request.url).host}`;
    return (
      new URL(origin).origin === target && origin === new URL(origin).origin
    );
  } catch {
    return false;
  }
}
