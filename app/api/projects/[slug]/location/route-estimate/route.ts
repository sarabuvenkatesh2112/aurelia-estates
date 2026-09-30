import { projectLocation } from '@/lib/location/repository';
import { routeEstimate } from '@/lib/location/route-provider';
import { errorResponse, PublicError } from '@/lib/http';
import { z } from 'zod';
// Coalesce concurrent requests; bounded local cooldown prevents repeated control clicks.
const pending = new Map<
  string,
  { at: number; result: ReturnType<typeof routeEstimate> }
>();
let lastProviderCall = 0;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const input = z
      .object({ nearby: z.uuid() })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    const location = await projectLocation(slug);
    const nearby = location?.nearby.find((n) => n.id === input.nearby);
    if (!location || !nearby) throw new PublicError('Location not found.', 404);
    if (
      !location.verified ||
      !location.coordinates ||
      !nearby.routeEligible ||
      !nearby.coordinates
    )
      return Response.json({
        status: 'unavailable',
        reason: 'unverified-location',
      });
    const key = `${slug}:${input.nearby}`;
    const now = Date.now();
    for (const [id, entry] of pending)
      if (now - entry.at > 30000) pending.delete(id);
    let entry = pending.get(key);
    if (!entry) {
      if (now - lastProviderCall < 1500 || pending.size >= 100)
        throw new PublicError(
          'Please wait a moment before checking another route.',
          429,
        );
      lastProviderCall = now;
      entry = {
        at: now,
        result: routeEstimate(location.coordinates, nearby.coordinates),
      };
      pending.set(key, entry);
    }
    return Response.json(await entry.result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
