import { brochure } from '@/lib/services/brochureService';
import { errorResponse } from '@/lib/http';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const pdf = await brochure(slug);
    if (!pdf) return new Response('Residence not found', { status: 404 });
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="aurelia-${slug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
