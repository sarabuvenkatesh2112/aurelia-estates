import { errorResponse } from '@/lib/http';
import { parseSearch } from '@/lib/validation/search';
import { searchCollection } from '@/lib/services/projectService';
export async function GET(request: Request) {
  try {
    return Response.json(
      await searchCollection(parseSearch(new URL(request.url).searchParams)),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
