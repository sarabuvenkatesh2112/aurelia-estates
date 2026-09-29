import 'server-only';
import { coordinatesSchema, type Coordinates } from './contracts';
export type RouteEstimate =
  | {
      status: 'available';
      distanceKm: number;
      minutes: number;
      checkedAt: string;
      source: 'Google Routes';
    }
  | {
      status: 'unavailable';
      reason: 'not-configured' | 'provider-unavailable' | 'invalid-route';
    };
export async function googleRoute(
  origin: Coordinates,
  destination: Coordinates,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<RouteEstimate> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) return { status: 'unavailable', reason: 'not-configured' };
  if (
    !coordinatesSchema.safeParse(origin).success ||
    !coordinatesSchema.safeParse(destination).success
  )
    return { status: 'unavailable', reason: 'invalid-route' };
  try {
    const response = await transport(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: origin.lat, longitude: origin.lng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destination.lat, longitude: destination.lng },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          computeAlternativeRoutes: false,
        }),
      },
    );
    if (!response.ok)
      return { status: 'unavailable', reason: 'provider-unavailable' };
    const body = await response.json();
    const route = body?.routes?.[0];
    const seconds =
      typeof route?.duration === 'string' &&
      /^\d+(?:\.\d+)?s$/.test(route.duration)
        ? Number(route.duration.slice(0, -1))
        : NaN;
    if (
      !Number.isFinite(route?.distanceMeters) ||
      route.distanceMeters < 0 ||
      route.distanceMeters > 1e7 ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      seconds > 604800
    )
      return { status: 'unavailable', reason: 'invalid-route' };
    return {
      status: 'available',
      distanceKm: Math.round(route.distanceMeters / 100) / 10,
      minutes: Math.max(1, Math.ceil(seconds / 60)),
      checkedAt: new Date().toISOString(),
      source: 'Google Routes',
    };
  } catch {
    return { status: 'unavailable', reason: 'provider-unavailable' };
  }
}
