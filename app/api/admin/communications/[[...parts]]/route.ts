import {
  communicationRead,
  communicationCommand,
  communicationCreate,
  syncTemplates,
} from '@/lib/communications/service';
import { requireStaff } from '@/lib/admin/auth';
import { sameCommunicationOrigin } from '@/lib/communications/contracts';
import { errorResponse, PublicError, readBody } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(
  request: Request,
  context: { params: Promise<{ parts?: string[] }> },
) {
  try {
    await requireStaff(request.headers);
    const { parts = [] } = await context.params;
    if (parts.length > 1) throw new PublicError('Not found.', 404);
    const id = parts[0];
    let result;
    if (request.method === 'GET')
      result = await communicationRead(
        Object.fromEntries(new URL(request.url).searchParams),
        id,
        request.headers,
      );
    else {
      if (!sameCommunicationOrigin(request))
        throw new PublicError('A same-origin request is required.', 403);
      const body = await readBody(request);
      result =
        id === 'templates'
          ? await syncTemplates(request.headers)
          : id
            ? await communicationCommand(id, body, request.headers)
            : await communicationCreate(body, request.headers);
    }
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    });
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
export const GET = handle;
export const POST = handle;
