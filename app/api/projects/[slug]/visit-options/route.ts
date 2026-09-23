import { getDb } from '@/lib/db/prisma';
import { errorResponse, PublicError } from '@/lib/http';
import { z } from 'zod';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const id = z.uuid().parse((await params).slug);
    const db = getDb();
    if (
      !(await db.project.findFirst({
        where: { id, deletedAt: null, status: { not: 'ARCHIVED' } },
      }))
    )
      throw new PublicError('Residence not found.', 404);
    const [configurations, units] = await Promise.all([
      db.unitType.findMany({
        where: { projectId: id },
        select: { id: true, name: true },
      }),
      db.unit.findMany({
        where: { projectId: id, availability: 'AVAILABLE' },
        select: {
          id: true,
          unitNumber: true,
          unitTypeId: true,
          tower: { select: { name: true } },
        },
        take: 200,
        orderBy: { unitNumber: 'asc' },
      }),
    ]);
    return Response.json(
      { configurations, units },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
