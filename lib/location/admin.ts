import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { requireStaff, permit, staffSelect } from '@/lib/admin/auth';
import { audit } from '@/lib/admin/mutations';
import { PublicError } from '@/lib/http';
import { locationEditSchema, slugSchema, verifiedContext } from './contracts';
import type { LocationEdit } from './contracts';

function nearbyValue(n: {
  id: string;
  distanceKm: unknown;
  estimatedTravelMinutes: number | null;
  isIllustrative: boolean;
  sourceNote: string | null;
  contextNote: string | null;
  nearbyPlace: {
    name: string;
    category: LocationEdit['nearby'][number]['category'];
    latitude: unknown;
    longitude: unknown;
  };
}) {
  return {
    id: n.id,
    name: n.nearbyPlace.name,
    category: n.nearbyPlace.category,
    coordinates:
      n.nearbyPlace.latitude !== null && n.nearbyPlace.longitude !== null
        ? {
            lat: Number(n.nearbyPlace.latitude),
            lng: Number(n.nearbyPlace.longitude),
          }
        : null,
    distanceKm: Number(n.distanceKm),
    minutes: n.estimatedTravelMinutes,
    illustrative: n.isIllustrative,
    source: n.sourceNote,
    note: n.contextNote,
  };
}

export async function readLocationEditor(slug: string, incoming?: Headers) {
  permit(await requireStaff(incoming), 'inventory');
  slugSchema.parse(slug);
  const p = await getDb().project.findFirst({
    where: { slug, deletedAt: null },
    include: {
      location: true,
      nearbyPlaces: {
        include: { nearbyPlace: true },
        take: 30,
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!p) throw new PublicError('Project not found.', 404);
  return {
    name: p.name,
    slug: p.slug,
    locality: p.location.locality,
    city: p.location.city,
    edit: {
      version: p.locationVersion,
      address: p.publicAddress,
      label: p.mapLabel,
      coordinates:
        p.latitude !== null && p.longitude !== null
          ? { lat: Number(p.latitude), lng: Number(p.longitude) }
          : null,
      narrative: p.locationNarrative,
      source: p.locationSource,
      verified: verifiedContext(false, p.locationSource, p.locationVerifiedAt),
      nearby: p.nearbyPlaces.map((n) => ({
        id: n.id,
        name: n.nearbyPlace.name,
        category: n.nearbyPlace.category,
        coordinates:
          n.nearbyPlace.latitude !== null && n.nearbyPlace.longitude !== null
            ? {
                lat: Number(n.nearbyPlace.latitude),
                lng: Number(n.nearbyPlace.longitude),
              }
            : null,
        distanceKm: Number(n.distanceKm),
        minutes: n.estimatedTravelMinutes,
        illustrative: n.isIllustrative,
        source: n.sourceNote,
        note: n.contextNote,
      })),
    },
  };
}
export async function editLocation(
  slug: string,
  raw: unknown,
  incoming?: Headers,
) {
  const session = await requireStaff(incoming);
  permit(session, 'inventory');
  slugSchema.parse(slug);
  const data = locationEditSchema.parse(raw);
  try {
    return await getDb().$transaction(
      async (tx) => {
        const staff = await tx.agent.findFirst({
          where: {
            id: session.id,
            customerId: session.customerId,
            active: true,
            customer: { deletedAt: null },
          },
          select: staffSelect,
        });
        if (!staff) throw new PublicError('Staff access has changed.', 403);
        permit(staff, 'inventory');
        const p = await tx.project.findFirst({
          where: { slug, deletedAt: null },
        });
        if (!p) throw new PublicError('Project not found.', 404);
        if (p.locationVersion !== data.version)
          throw new PublicError(
            'This location changed. Reload before saving.',
            409,
          );
        const ids = data.nearby.flatMap((n) => (n.id ? [n.id] : []));
        if (new Set(ids).size !== ids.length)
          throw new PublicError('Duplicate nearby record.');
        const links = await tx.projectNearbyPlace.findMany({
          where: { projectId: p.id },
          include: {
            nearbyPlace: {
              include: { _count: { select: { projects: true } } },
            },
          },
        });
        if (ids.some((id) => !links.some((n) => n.id === id)))
          throw new PublicError(
            'Nearby record not found in this project.',
            404,
          );
        if (links.length + data.nearby.filter((n) => !n.id).length > 30)
          throw new PublicError(
            'A project can contain at most 30 nearby records.',
          );
        const before = {
          address: p.publicAddress,
          label: p.mapLabel,
          coordinates:
            p.latitude !== null && p.longitude !== null
              ? { lat: Number(p.latitude), lng: Number(p.longitude) }
              : null,
          narrative: p.locationNarrative,
          source: p.locationSource,
          verified: verifiedContext(
            false,
            p.locationSource,
            p.locationVerifiedAt,
          ),
        };
        const changedFields = Object.keys(before).filter(
          (key) =>
            JSON.stringify(before[key as keyof typeof before]) !==
            JSON.stringify(data[key as keyof typeof before]),
        );
        const changedNearby = data.nearby.filter((n) => {
          const old = links.find((l) => l.id === n.id);
          return !old || JSON.stringify(nearbyValue(old)) !== JSON.stringify(n);
        });
        if (!changedFields.length && !changedNearby.length)
          return { success: true, version: p.locationVersion, unchanged: true };
        await tx.project.update({
          where: { id: p.id, locationVersion: data.version },
          data: {
            publicAddress: data.address,
            mapLabel: data.label,
            latitude: data.coordinates?.lat ?? null,
            longitude: data.coordinates?.lng ?? null,
            locationNarrative: data.narrative,
            locationSource: data.source,
            locationVerifiedAt: data.verified ? new Date() : null,
            locationVersion: { increment: 1 },
          },
        });
        for (const n of changedNearby) {
          // Copy on edit: a landmark shared by another project must never change implicitly.
          const old = links.find((l) => l.id === n.id);
          const placeData = {
            name: n.name,
            category: n.category,
            latitude: n.coordinates?.lat ?? null,
            longitude: n.coordinates?.lng ?? null,
          };
          const place =
            old && old.nearbyPlace._count.projects === 1
              ? await tx.nearbyPlace.update({
                  where: { id: old.nearbyPlaceId },
                  data: placeData,
                })
              : await tx.nearbyPlace.create({ data: placeData });
          const fields = {
            nearbyPlaceId: place.id,
            distanceKm: n.distanceKm,
            estimatedTravelMinutes: n.minutes,
            isIllustrative: n.illustrative,
            sourceNote: n.source,
            contextNote: n.note,
            verifiedAt: n.illustrative ? null : new Date(),
          };
          if (n.id) {
            await tx.projectNearbyPlace.update({
              where: { id: n.id, projectId: p.id },
              data: fields,
            });
          } else
            await tx.projectNearbyPlace.create({
              data: { projectId: p.id, ...fields },
            });
        }
        await audit(tx, staff, 'Project location updated', 'project', p.id, {
          fromVersion: data.version,
          toVersion: data.version + 1,
          changedFields,
          before,
          after: {
            address: data.address,
            label: data.label,
            coordinates: data.coordinates,
            narrative: data.narrative,
            source: data.source,
            verified: data.verified,
          },
          nearbyChanges: changedNearby.map((n) => ({
            before: links.find((l) => l.id === n.id)
              ? nearbyValue(links.find((l) => l.id === n.id)!)
              : null,
            after: n,
          })),
        });
        return { success: true, version: data.version + 1 };
      },
      { isolationLevel: 'Serializable', maxWait: 15000, timeout: 20000 },
    );
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e.code === 'P2034' || e.code === 'P2025')
    )
      throw new PublicError(
        'This location changed. Reload before saving.',
        409,
      );
    throw e;
  }
}
