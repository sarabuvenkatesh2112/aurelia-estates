import { readLocationEditor, editLocation } from '@/lib/location/admin';
import { errorResponse, readBody, PublicError, sameOrigin } from '@/lib/http';
import { revalidatePath } from 'next/cache';
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    return Response.json(
      await readLocationEditor((await params).slug, request.headers),
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    if (!sameOrigin(request))
      throw new PublicError('A same-origin request is required.', 403);
    const { slug } = await params;
    const result = await editLocation(
      slug,
      await readBody(request, 131072),
      request.headers,
    );
    revalidatePath(`/residences/${slug}`);
    revalidatePath('/admin/locations');
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
