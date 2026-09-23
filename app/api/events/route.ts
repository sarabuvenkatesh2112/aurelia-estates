import { errorResponse, readBody } from '@/lib/http';
import { recordEvent } from '@/lib/services/eventService';
export async function POST(request: Request) {
  try {
    await recordEvent(await readBody(request));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
