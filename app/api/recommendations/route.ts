import { errorResponse, readBody } from '@/lib/http';
import { recommend } from '@/lib/services/recommendationService';
export async function POST(request: Request) {
  try {
    return Response.json(await recommend(await readBody(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
