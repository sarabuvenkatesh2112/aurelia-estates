import { contactCustomer } from '@/lib/auth/server';
import { errorResponse, readBody } from '@/lib/http';
import { submitVisit } from '@/lib/services/contactService';
export async function POST(request: Request) {
  try {
    return Response.json(
      await submitVisit(
        await readBody(request),
        (await contactCustomer(request.headers))?.id || null,
      ),
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
