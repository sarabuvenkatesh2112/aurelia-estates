import { auth, currentCustomer } from '@/lib/auth/server';
import { readBody, errorResponse, PublicError } from '@/lib/http';
import { signUpSchema, signInSchema } from '@/lib/validation/customer';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    if (
      new URL(request.url).pathname.replace(/\/$/, '') !==
      '/api/auth/get-session'
    )
      throw new PublicError('Not found.', 404);
    return Response.json(
      { user: await currentCustomer(request.headers) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    const raw = await readBody(request);
    let body: Record<string, unknown>;
    if (path === '/api/auth/sign-up/email') {
      const input = signUpSchema.parse(raw);
      body = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: input.password,
      };
    } else if (path === '/api/auth/sign-in/email')
      body = signInSchema.parse(raw);
    else if (path === '/api/auth/sign-out') body = {};
    else throw new PublicError('Not found.', 404);
    const origin = request.headers.get('origin');
    if (!origin)
      throw new PublicError('A same-origin request is required.', 403);
    const h = new Headers(request.headers);
    h.delete('content-length');
    h.set('content-type', 'application/json');
    // Local-only server: never trust a caller-supplied forwarding address for rate limits.
    h.set('x-aurelia-client', '127.0.0.1');
    const authUrl = new URL(request.url);
    authUrl.pathname = path;
    const result = await auth.handler(
      new Request(authUrl, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(body),
      }),
    );
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const cookie of result.headers.getSetCookie())
      responseHeaders.append('set-cookie', cookie);
    if (!result.ok) {
      const data = await result.json().catch(() => ({}));
      const duplicate = String(data.code || '').includes('USER_ALREADY_EXISTS');
      return Response.json(
        {
          error:
            result.status === 429
              ? 'Please wait a minute before trying again.'
              : duplicate
                ? 'An account with this email already exists.'
                : path.endsWith('sign-in/email')
                  ? 'Invalid email or password.'
                  : 'We could not complete your request. Please try again.',
        },
        { status: result.status, headers: responseHeaders },
      );
    }
    return Response.json({ success: true }, { headers: responseHeaders });
  } catch (e) {
    return errorResponse(e);
  }
}
