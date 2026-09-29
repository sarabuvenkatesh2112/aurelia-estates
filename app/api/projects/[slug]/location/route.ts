import { projectLocation } from '@/lib/location/repository';
import { errorResponse, PublicError } from '@/lib/http';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const location = await projectLocation((await params).slug);
    if (!location) throw new PublicError('Project not found.', 404);
    return Response.json(location, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
