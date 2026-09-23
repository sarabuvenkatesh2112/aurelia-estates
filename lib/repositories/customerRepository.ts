import type { Prisma } from '@/generated/prisma/client';
import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { requireCustomer } from '@/lib/auth/server';
import { PublicError } from '@/lib/http';
import { profileSchema, savedSearchSchema } from '@/lib/validation/customer';
import { searchSchema } from '@/lib/validation/search';
import { z } from 'zod';
const projectSelect = {
  id: true,
  name: true,
  slug: true,
  media: { where: { type: 'HERO' }, select: { url: true }, take: 1 },
  location: { select: { city: true, locality: true } },
} as const satisfies Prisma.ProjectSelect;
const visitSelect = {
  id: true,
  reference: true,
  preferredDate: true,
  preferredTime: true,
  scheduledDate: true,
  scheduledTime: true,
  status: true,
  createdAt: true,
  project: { select: projectSelect },
  unit: { select: { unitNumber: true } },
  name: true,
} as const;
const enquirySelect = {
  id: true,
  reference: true,
  createdAt: true,
  message: true,
  project: { select: projectSelect },
} as const;
export function savedSearchUrl(filters: unknown) {
  const parsed = searchSchema.parse(filters);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined && v !== '') {
      if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
      else params.set(k, String(v));
    }
  }
  return '/residences?' + params.toString();
}
export async function customerOperation(
  method: string,
  parts: string[],
  input: unknown,
  incoming?: Headers,
) {
  const user = await requireCustomer(incoming),
    db = getDb();
  const [resource, id] = parts;
  if (parts.length > 2) throw new PublicError('Not found.', 404);
  if (id) z.uuid().parse(id);
  if (!resource && method === 'GET') {
    const [favorites, searches, visits, enquiries] = await Promise.all([
      db.favoriteReady.findMany({
        where: {
          customerId: user.id,
          project: { deletedAt: null, status: { not: 'ARCHIVED' } },
        },
        select: {
          id: true,
          projectId: true,
          project: { select: projectSelect },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.savedSearchReady.findMany({
        where: { customerId: user.id },
        select: { id: true, name: true, filters: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.siteVisit.findMany({
        where: { customerId: user.id },
        select: visitSelect,
        orderBy: { preferredDate: 'desc' },
        take: 100,
      }),
      db.enquiry.findMany({
        where: { customerId: user.id },
        select: enquirySelect,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      user,
      favorites,
      searches: searches.map((s) => ({ ...s, url: savedSearchUrl(s.filters) })),
      visits: visits.map((v) => ({
        ...v,
        preferredDate: v.scheduledDate || v.preferredDate,
        preferredTime: v.scheduledTime || v.preferredTime,
        status: v.status === 'NO_SHOW' ? 'CANCELLED' : v.status,
      })),
      enquiries,
    };
  }
  if (resource === 'profile') {
    if (id && id !== user.id) throw new PublicError('Not found.', 404);
    if (method === 'GET') return { user };
    if (method === 'PATCH')
      return {
        user: await db.customer.update({
          where: { id: user.id },
          data: profileSchema.parse(input),
          select: { id: true, name: true, email: true, phone: true },
        }),
      };
  }
  if (resource === 'favorites') {
    if (method === 'GET' && !id)
      return db.favoriteReady.findMany({
        where: { customerId: user.id },
        select: { id: true, projectId: true },
      });
    if (method === 'POST' && !id) {
      const { projectId } = z
        .object({ projectId: z.uuid() })
        .strict()
        .parse(input);
      if (
        !(await db.project.findFirst({
          where: {
            id: projectId,
            deletedAt: null,
            status: { not: 'ARCHIVED' },
          },
        }))
      )
        throw new PublicError('Residence not found.', 404);
      return db.favoriteReady.upsert({
        where: { customerId_projectId: { customerId: user.id, projectId } },
        create: { customerId: user.id, projectId },
        update: {},
        select: { id: true, projectId: true },
      });
    }
    if (id && method === 'DELETE') {
      const r = await db.favoriteReady.deleteMany({
        where: { id, customerId: user.id },
      });
      if (!r.count) throw new PublicError('Not found.', 404);
      return { success: true };
    }
    if (id && method === 'GET') {
      const r = await db.favoriteReady.findFirst({
        where: { id, customerId: user.id },
        select: {
          id: true,
          projectId: true,
          project: { select: projectSelect },
        },
      });
      if (!r) throw new PublicError('Not found.', 404);
      return r;
    }
  }
  if (resource === 'saved-searches') {
    if (method === 'POST' && !id) {
      const data = savedSearchSchema.parse(input);
      return db.savedSearchReady.create({
        data: {
          customerId: user.id,
          name: data.name,
          filters: JSON.parse(JSON.stringify(data.filters)),
        },
        select: { id: true, name: true, filters: true },
      });
    }
    if (id && method === 'DELETE') {
      const r = await db.savedSearchReady.deleteMany({
        where: { id, customerId: user.id },
      });
      if (!r.count) throw new PublicError('Not found.', 404);
      return { success: true };
    }
    if (id && method === 'GET') {
      const r = await db.savedSearchReady.findFirst({
        where: { id, customerId: user.id },
        select: { id: true, name: true, filters: true },
      });
      if (!r) throw new PublicError('Not found.', 404);
      return { ...r, url: savedSearchUrl(r.filters) };
    }
    if (id && method === 'PATCH') {
      const { name } = savedSearchSchema.pick({ name: true }).parse(input);
      const r = await db.savedSearchReady.updateMany({
        where: { id, customerId: user.id },
        data: { name },
      });
      if (!r.count) throw new PublicError('Not found.', 404);
      return { success: true };
    }
  }
  if (
    id &&
    method === 'GET' &&
    (resource === 'visits' || resource === 'enquiries')
  ) {
    const r =
      resource === 'visits'
        ? await db.siteVisit.findFirst({
            where: { id, customerId: user.id },
            select: visitSelect,
          })
        : await db.enquiry.findFirst({
            where: { id, customerId: user.id },
            select: enquirySelect,
          });
    if (!r) throw new PublicError('Not found.', 404);
    return 'status' in r
      ? { ...r, preferredDate: r.scheduledDate || r.preferredDate, preferredTime: r.scheduledTime || r.preferredTime, status: r.status === 'NO_SHOW' ? 'CANCELLED' : r.status }
      : r;
  }
  throw new PublicError('Not found.', 404);
}
