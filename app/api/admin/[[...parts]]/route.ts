import { adminRead } from '@/lib/admin/repository';
import { adminMutate } from '@/lib/admin/mutations';
import { requireStaff } from '@/lib/admin/auth';
import { PublicError, readBody, errorResponse, sameOrigin } from '@/lib/http';
import { revalidatePath, revalidateTag } from 'next/cache';
type Context = { params: Promise<{ parts?: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    await requireStaff(request.headers);
    const { parts = [] } = await context.params;
    if (parts.length > 2) throw new PublicError('Not found.', 404);
    const [resource = 'dashboard', id] = parts;
    let result;
    if (request.method === 'GET')
      result = await adminRead(
        resource,
        id,
        Object.fromEntries(new URL(request.url).searchParams),
        request.headers,
      );
    else {
      if ((request.method === 'PATCH') !== !!id)
        throw new PublicError('Unsupported operation.', 405);
      if (!sameOrigin(request))
        throw new PublicError('A same-origin request is required.', 403);
      result = await adminMutate(
        resource,
        id,
        await readBody(request),
        request.headers,
      );
      revalidatePath('/admin', 'layout');
      if (resource === 'visits' || resource === 'enquiries')
        revalidatePath('/account');
      if (resource === 'inventory') {
        revalidateTag('catalog', { expire: 0 });
        revalidatePath('/');
        revalidatePath('/residences', 'layout');
      }
    }
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    });
  } catch (e) {
    const response = errorResponse(e);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
