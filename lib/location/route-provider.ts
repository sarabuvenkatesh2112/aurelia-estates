import 'server-only';
import { coordinatesSchema, type Coordinates } from './contracts';
export type RouteEstimate =
  | {
      status: 'available';
      distanceKm: number;
      minutes: number;
      checkedAt: string;
      source: 'openrouteservice';
    }
  | {
      status: 'unavailable';
      reason: 'not-configured' | 'provider-unavailable' | 'invalid-route';
    };
export async function routeEstimate(
  origin: Coordinates,
  destination: Coordinates,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<RouteEstimate> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return { status: 'unavailable', reason: 'not-configured' };
  if (
    !coordinatesSchema.safeParse(origin).success ||
    !coordinatesSchema.safeParse(destination).success
  )
    return { status: 'unavailable', reason: 'invalid-route' };
  try {
    const response = await transport(
      'https://api.openrouteservice.org/v2/directions/driving-car/json',
      {
        method: 'POST',
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: key,
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          instructions: false,
          geometry: false,
        }),
      },
    );
    if (!response.ok)
      return { status: 'unavailable', reason: 'provider-unavailable' };
    const body = await response.json();
    const route = body?.routes?.[0]?.summary;
    const seconds = route?.duration;
    if (
      !Number.isFinite(route?.distance) ||
      route.distance < 0 ||
      route.distance > 1e7 ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      seconds > 604800
    )
      return { status: 'unavailable', reason: 'invalid-route' };
    return {
      status: 'available',
      distanceKm: Math.round(route.distance / 100) / 10,
      minutes: Math.max(1, Math.ceil(seconds / 60)),
      checkedAt: new Date().toISOString(),
      source: 'openrouteservice',
    };
  } catch {
    return { status: 'unavailable', reason: 'provider-unavailable' };
  }
}
