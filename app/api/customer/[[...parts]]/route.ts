import { customerOperation } from '@/lib/repositories/customerRepository';
import { errorResponse, readBody, PublicError } from '@/lib/http';
async function handle(
  request: Request,
  context: { params: Promise<{ parts?: string[] }> },
) {
  try {
    if (request.method !== 'GET' && !request.headers.get('origin'))
      throw new PublicError('A same-origin request is required.', 403);
    const input =
      request.method === 'GET' ? undefined : await readBody(request);
    return Response.json(
      await customerOperation(
        request.method,
        (await context.params).parts || [],
        input,
        request.headers,
      ),
      { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
