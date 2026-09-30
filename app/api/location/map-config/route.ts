import { mapConfig } from '@/lib/location/map-config';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(
    mapConfig(process.env.MAP_TILE_URL, process.env.MAP_TILE_ATTRIBUTION),
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
