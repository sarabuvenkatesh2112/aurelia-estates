import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
import {
  requireStaff,
  permit,
  leadScope,
  customerScope,
  staffSelect,
  type Staff,
} from './auth';
import { adminQuery, type AdminQuery } from '@/lib/validation/admin';
import type { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { indiaDate } from '@/lib/validation/forms';

const contactSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
} as const;
const agentSelect = { id: true, name: true, role: true, active: true } as const;
const projectSelect = { id: true, name: true, slug: true } as const;
export const leadSelect = {
  ...contactSelect,
  status: true,
  priority: true,
  budgetMin: true,
  budgetMax: true,
  version: true,
  updatedAt: true,
  projectId: true,
  unitId: true,
  sourceId: true,
  agentId: true,
  customerId: true,
  project: { select: projectSelect },
  unit: { select: { unitNumber: true } },
  source: { select: { code: true, label: true } },
  agent: { select: agentSelect },
  followUps: {
    where: { status: 'PENDING' },
    orderBy: { dueAt: 'asc' },
    take: 1,
    select: { dueAt: true, title: true },
  },
} as const satisfies Prisma.LeadSelect;
const visitSelect = {
  ...contactSelect,
  reference: true,
  status: true,
  version: true,
  preferredDate: true,
  preferredTime: true,
  scheduledDate: true,
  scheduledTime: true,
  guestCount: true,
  message: true,
  projectId: true,
  unitId: true,
  leadId: true,
  customerId: true,
  project: { select: projectSelect },
  unit: { select: { unitNumber: true } },
  lead: { select: { name: true, agent: { select: agentSelect } } },
} as const;
const enquirySelect = {
  ...contactSelect,
  reference: true,
  status: true,
  version: true,
  message: true,
  leadId: true,
  customerId: true,
  project: { select: projectSelect },
  lead: { select: { name: true, agent: { select: agentSelect } } },
} as const;
function span(q: AdminQuery) {
  return q.from || q.to
    ? {
        ...(q.from ? { gte: new Date(q.from + 'T00:00:00+05:30') } : {}),
        ...(q.to ? { lte: new Date(q.to + 'T23:59:59.999+05:30') } : {}),
      }
    : undefined;
}
export function dueFilter(state?: string) {
  const today = indiaDate(),
    start = new Date(today + 'T00:00:00+05:30'),
    end = new Date(start.getTime() + 86400000);
  return state === 'overdue'
    ? { lt: new Date() }
    : state === 'today'
      ? { gte: start, lt: end }
      : state === 'upcoming'
        ? { gte: end }
        : undefined;
}
function approved<T extends object>(value: T, staff: Staff): T {
  if (staff.role !== 'VIEWER') return value;
  // Viewer access is deliberately limited to non-contact operational summaries.
  const clean = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(clean)
      : v && typeof v === 'object' && !(v instanceof Date)
        ? Object.fromEntries(
            Object.entries(v)
              .filter(
                ([k]) =>
                  ![
                    'email',
                    'phone',
                    'message',
                    'notes',
                    'leadNotes',
                    'customerId',
                  ].includes(k),
              )
              .map(([k, x]) => [k, clean(x)]),
          )
        : v;
  return clean(JSON.parse(JSON.stringify(value))) as T;
}
export async function adminRead(
  resource: string,
  id: string | undefined,
  raw: Record<string, string>,
  incoming?: Headers,
) {
  const staff = await requireStaff(incoming);
  permit(staff, 'read');
  const q = adminQuery.parse(
      Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== '')),
    ),
    db = getDb(),
    scope = leadScope(staff);
  if (id) z.uuid().parse(id);
  const page = { skip: (q.page - 1) * q.pageSize, take: q.pageSize },
    orderBy = {
      createdAt: q.sort === 'oldest' ? ('asc' as const) : ('desc' as const),
    };
  const date = span(q),
    query = q.q,
    contains = { contains: query, mode: 'insensitive' as const };
  const leadWhere: Prisma.LeadWhereInput = {
    ...scope,
    projectId: q.projectId,
    agentId: staff.role === 'SALES_AGENT' ? staff.id : q.agentId,
    sourceId: q.sourceId,
    priority: q.priority,
    createdAt: date,
    ...(query
      ? {
          OR: [
            { name: contains },
            { email: contains },
            { phone: { contains: query.replace(/[ -]/g, '') } },
          ],
        }
      : {}),
    ...(q.followUp
      ? {
          followUps: {
            some: { status: 'PENDING', dueAt: dueFilter(q.followUp) },
          },
        }
      : {}),
  };
  const options = async () => ({
    projects: await db.project.findMany({
      where: { deletedAt: null, status: { not: 'ARCHIVED' } },
      select: projectSelect,
      orderBy: { name: 'asc' },
      take: 200,
    }),
    agents: await db.agent.findMany({
      where: {
        active: true,
        customerId: { not: null },
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT'] },
      },
      select: agentSelect,
      take: 200,
      orderBy: { name: 'asc' },
    }),
    sources: await db.leadSource.findMany({
      select: { id: true, code: true, label: true },
      take: 50,
    }),
  });
  const result = (items: unknown[], total: number, extra: object = {}) =>
    approved(
      { items, total, page: q.page, pageSize: q.pageSize, ...extra },
      staff,
    );
  const missing = () => {
    throw new PublicError('Record not found.', 404);
  };
  if (resource === 'options') return options();
  if (resource === 'dashboard' || resource === 'analytics') {
    if (resource === 'analytics') permit(staff, 'analytics');
    const since = q.from
        ? new Date(q.from + 'T00:00:00+05:30')
        : new Date(Date.now() - q.days * 86400000),
      until = q.to ? new Date(q.to + 'T23:59:59.999+05:30') : new Date();
    if (since > until || until.getTime() - since.getTime() > 366 * 86400000)
      throw new PublicError('Use an ordered range of at most 366 days.');
    const cohort = { ...scope, createdAt: { gte: since, lte: until } };
    const [
      stages,
      sources,
      inventory,
      visits,
      customers,
      enquiries,
      recentLeads,
      followUps,
      upcoming,
      interest,
      cohortTotal,
      withVisit,
      winsAfterVisit,
    ] = await Promise.all([
      db.lead.groupBy({
        by: ['status'],
        where: cohort,
        _count: true,
        _sum: { budgetMax: true },
      }),
      db.lead.groupBy({ by: ['sourceId'], where: cohort, _count: true }),
      db.unit.groupBy({
        by: ['availability'],
        where: { project: { deletedAt: null } },
        _count: true,
      }),
      db.siteVisit.groupBy({
        by: ['status'],
        where: { lead: scope, createdAt: { gte: since, lte: until } },
        _count: true,
      }),
      db.customer.count({ where: customerScope(staff) }),
      db.enquiry.count({
        where: { lead: scope, createdAt: { gte: since, lte: until } },
      }),
      db.lead.findMany({
        where: scope,
        select: leadSelect,
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      db.followUp.findMany({
        where: {
          status: 'PENDING',
          lead: scope,
          ...(staff.role === 'SALES_AGENT' ? { agentId: staff.id } : {}),
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          leadId: true,
          agent: { select: agentSelect },
        },
        orderBy: { dueAt: 'asc' },
        take: 10,
      }),
      db.siteVisit.findMany({
        where: {
          lead: scope,
          status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] },
        },
        select: visitSelect,
        orderBy: [{ scheduledDate: 'asc' }, { preferredDate: 'asc' }],
        take: 5,
      }),
      db.lead.groupBy({ by: ['projectId'], where: cohort, _count: true }),
      db.lead.count({ where: cohort }),
      db.lead.count({ where: { ...cohort, visits: { some: {} } } }),
      db.lead.count({
        where: {
          ...cohort,
          status: 'WON',
          visits: { some: { status: 'COMPLETED' } },
        },
      }),
    ]);
    const lookups = await options();
    const recentEnquiries = await db.enquiry.findMany({
      where: { lead: scope },
      select: enquirySelect,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return approved(
      {
        since,
        until,
        stages,
        sources: sources.map((s) => ({
          ...s,
          label:
            lookups.sources.find((x) => x.id === s.sourceId)?.label || 'Other',
        })),
        inventory,
        visits,
        customers,
        enquiries,
        recentLeads,
        followUps,
        upcoming,
        recentEnquiries,
        interest: interest.map((s) => ({
          ...s,
          label:
            lookups.projects.find((x) => x.id === s.projectId)?.name ||
            'Archived project',
        })),
        cohortTotal,
        withVisit,
        winsAfterVisit,
        leadToVisit: cohortTotal
          ? Math.round((withVisit / cohortTotal) * 1000) / 10
          : 0,
        visitToWin: withVisit
          ? Math.round((winsAfterVisit / withVisit) * 1000) / 10
          : 0,
      },
      staff,
    );
  }
  if (resource === 'leads') {
    if (q.status)
      leadWhere.status = z
        .enum([
          'NEW',
          'CONTACTED',
          'QUALIFIED',
          'SITE_VISIT',
          'VISIT_REQUESTED',
          'VISIT_SCHEDULED',
          'NEGOTIATION',
          'WON',
          'LOST',
        ])
        .parse(q.status);
    if (id) {
      const record = await db.lead.findFirst({
        where: { ...scope, id },
        select: leadSelect,
      });
      if (!record) return missing();
      const [notes, history, enquiries, visits, followUps, activity] =
        await Promise.all([
          staff.role === 'VIEWER'
            ? []
            : db.leadNote.findMany({
                where: { leadId: id },
                select: {
                  id: true,
                  text: true,
                  createdAt: true,
                  author: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
              }),
          db.leadStatusHistory.findMany({
            where: { leadId: id },
            select: {
              id: true,
              oldStatus: true,
              newStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          }),
          db.enquiry.findMany({
            where: { leadId: id },
            select: enquirySelect,
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
          db.siteVisit.findMany({
            where: { leadId: id },
            select: visitSelect,
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
          db.followUp.findMany({
            where: { leadId: id },
            include: { agent: { select: agentSelect } },
            orderBy: { dueAt: 'asc' },
            take: 100,
          }),
          db.auditLogReady.findMany({
            where: { entityType: 'lead', entityId: id },
            select: { id: true, action: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
          }),
        ]);
      return approved(
        {
          record,
          notes,
          history,
          enquiries,
          visits,
          followUps: followUps.map((f) => ({
            ...f,
            lead: { name: record.name },
            displayStatus:
              f.status === 'PENDING' && f.dueAt < new Date()
                ? 'OVERDUE'
                : f.status,
          })),
          activity,
          options: await options(),
        },
        staff,
      );
    }
    const [items, total] = await Promise.all([
      db.lead.findMany({
        where: leadWhere,
        select: leadSelect,
        ...page,
        orderBy,
      }),
      db.lead.count({ where: leadWhere }),
    ]);
    return result(items, total, { options: await options() });
  }
  if (resource === 'customers') {
    const where: Prisma.CustomerWhereInput = {
      ...customerScope(staff),
      ...(query
        ? {
            OR: [
              { name: contains },
              { email: contains },
              { phone: { contains: query.replace(/[ -]/g, '') } },
            ],
          }
        : {}),
      ...(q.projectId
        ? { leads: { some: { ...scope, projectId: q.projectId } } }
        : {}),
    };
    if (id) {
      const record = await db.customer.findFirst({
        where: { ...where, id },
        select: contactSelect,
      });
      if (!record) return missing();
      const [leads, visits, enquiries, favorites] = await Promise.all([
        db.lead.findMany({
          where: { ...scope, customerId: id },
          select: leadSelect,
          take: 100,
        }),
        db.siteVisit.findMany({
          where: { customerId: id, lead: scope },
          select: visitSelect,
          take: 100,
        }),
        db.enquiry.findMany({
          where: { customerId: id, lead: scope },
          select: enquirySelect,
          take: 100,
        }),
        db.favoriteReady.findMany({
          where: { customerId: id },
          select: { id: true, project: { select: projectSelect } },
          take: 100,
        }),
      ]);
      return approved({ record, leads, visits, enquiries, favorites }, staff);
    }
    const [items, total] = await Promise.all([
      db.customer.findMany({ where, select: contactSelect, ...page, orderBy }),
      db.customer.count({ where }),
    ]);
    return result(items, total, { options: await options() });
  }
  if (resource === 'enquiries') {
    const where: Prisma.EnquiryWhereInput = {
      lead: {
        ...scope,
        agentId: staff.role === 'SALES_AGENT' ? staff.id : q.agentId,
      },
      projectId: q.projectId,
      createdAt: date,
      ...(query
        ? {
            OR: [
              { name: contains },
              { email: contains },
              { reference: contains },
            ],
          }
        : {}),
      ...(q.status
        ? {
            status: z
              .enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED'])
              .parse(q.status),
          }
        : {}),
    };
    if (id) {
      const record = await db.enquiry.findFirst({
        where: { ...where, id },
        select: enquirySelect,
      });
      if (!record) return missing();
      return approved(
        {
          record,
          history: await db.enquiryStatusHistory.findMany({
            where: { enquiryId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
          }),
        },
        staff,
      );
    }
    const [items, total] = await Promise.all([
      db.enquiry.findMany({ where, select: enquirySelect, ...page, orderBy }),
      db.enquiry.count({ where }),
    ]);
    return result(items, total, { options: await options() });
  }
  if (resource === 'visits') {
    const where: Prisma.SiteVisitWhereInput = {
      lead: {
        ...scope,
        agentId: staff.role === 'SALES_AGENT' ? staff.id : q.agentId,
      },
      projectId: q.projectId,
      ...(query
        ? {
            OR: [
              { name: contains },
              { email: contains },
              { reference: contains },
            ],
          }
        : {}),
      ...(date
        ? {
            AND: [
              {
                OR: [
                  { scheduledDate: date },
                  { scheduledDate: null, preferredDate: date },
                ],
              },
            ],
          }
        : {}),
      ...(q.status
        ? {
            status: z
              .enum([
                'REQUESTED',
                'CONFIRMED',
                'RESCHEDULED',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW',
              ])
              .parse(q.status),
          }
        : {}),
    };
    if (id) {
      const record = await db.siteVisit.findFirst({
        where: { ...where, id },
        select: visitSelect,
      });
      if (!record) return missing();
      return approved(
        {
          record,
          history: await db.siteVisitStatusHistory.findMany({
            where: { siteVisitId: id },
            select: {
              id: true,
              oldStatus: true,
              newStatus: true,
              previousDate: true,
              previousTime: true,
              scheduledDate: true,
              scheduledTime: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          }),
        },
        staff,
      );
    }
    const [items, total] = await Promise.all([
      db.siteVisit.findMany({ where, select: visitSelect, ...page, orderBy }),
      db.siteVisit.count({ where }),
    ]);
    return result(items, total, { options: await options() });
  }
  if (resource === 'follow-ups') {
    const where: Prisma.FollowUpWhereInput = {
      lead: { ...scope, projectId: q.projectId },
      agentId: staff.role === 'SALES_AGENT' ? staff.id : q.agentId,
      dueAt: dueFilter(q.followUp),
      ...(query ? { title: contains } : {}),
      ...(q.status
        ? {
            status: z
              .enum(['PENDING', 'COMPLETED', 'CANCELLED'])
              .parse(q.status),
          }
        : {}),
    };
    const select = {
      id: true,
      title: true,
      leadId: true,
      customerId: true,
      dueAt: true,
      status: true,
      completedAt: true,
      notes: true,
      version: true,
      agent: { select: agentSelect },
      lead: { select: { name: true } },
    } as const;
    if (id) {
      const record = await db.followUp.findFirst({
        where: { ...where, id },
        select,
      });
      if (!record) return missing();
      const activity = await db.auditLogReady.findMany({
        where: {
          entityType: 'lead',
          entityId: record.leadId,
          metadata: { path: ['followUpId'], equals: id },
        },
        select: { id: true, action: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return approved({ record, activity }, staff);
    }
    const [items, total] = await Promise.all([
      db.followUp.findMany({
        where,
        select,
        ...page,
        orderBy: { dueAt: 'asc' },
      }),
      db.followUp.count({ where }),
    ]);
    return result(
      items.map((f) => ({
        ...f,
        displayStatus:
          f.status === 'PENDING' && f.dueAt < new Date() ? 'OVERDUE' : f.status,
      })),
      total,
      { options: await options() },
    );
  }
  if (resource === 'inventory') {
    const where: Prisma.UnitWhereInput = {
      project: { deletedAt: null },
      projectId: q.projectId,
      towerId: q.towerId,
      floorId: q.floorId,
      unitTypeId: q.unitTypeId,
      ...(query
        ? { OR: [{ unitNumber: contains }, { project: { name: contains } }] }
        : {}),
      ...(q.status
        ? {
            availability: z
              .enum([
                'AVAILABLE',
                'HOLD',
                'RESERVED',
                'BOOKED',
                'SOLD',
                'NOT_RELEASED',
              ])
              .parse(q.status),
          }
        : {}),
      currentPrice: { gte: q.minPrice, lte: q.maxPrice },
    };
    const select = {
      id: true,
      unitNumber: true,
      projectId: true,
      availability: true,
      currentPrice: true,
      version: true,
      builtUpAreaSqft: true,
      carpetAreaSqft: true,
      orientation: true,
      project: {
        select: { ...projectSelect, developer: { select: { name: true } } },
      },
      tower: { select: { id: true, name: true } },
      floor: { select: { id: true, label: true } },
      unitType: { select: { id: true, name: true } },
    } as const;
    if (id) {
      const record = await db.unit.findFirst({
        where: { ...where, id },
        select,
      });
      if (!record) return missing();
      return {
        record,
        prices: await db.unitPriceHistory.findMany({
          where: { unitId: id },
          select: {
            id: true,
            oldPrice: true,
            newPrice: true,
            changeReason: true,
            effectiveFrom: true,
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 100,
        }),
        history: await db.unitStatusHistory.findMany({
          where: { unitId: id },
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      };
    }
    const [items, total] = await Promise.all([
      db.unit.findMany({
        where,
        select,
        ...page,
        orderBy: q.sort.startsWith('price')
          ? { currentPrice: q.sort === 'price-asc' ? 'asc' : 'desc' }
          : orderBy,
      }),
      db.unit.count({ where }),
    ]);
    return result(items, total, {
      options: {
        ...(await options()),
        towers: await db.tower.findMany({
          where: { projectId: q.projectId },
          select: { id: true, name: true },
          take: 200,
        }),
        floors: await db.floor.findMany({
          where: { towerId: q.towerId, tower: { projectId: q.projectId } },
          select: { id: true, label: true },
          take: 200,
        }),
        configurations: await db.unitType.findMany({
          where: { projectId: q.projectId },
          select: { id: true, name: true },
          take: 200,
        }),
      },
    });
  }
  if (resource === 'staff') {
    permit(staff, 'staff');
    if (id) {
      const record = await db.agent.findUnique({
        where: { id },
        select: staffSelect,
      });
      if (!record) return missing();
      return { record };
    }
    const where = query
      ? { OR: [{ name: contains }, { email: contains }] }
      : {};
    return result(
      await db.agent.findMany({ where, select: staffSelect, ...page, orderBy }),
      await db.agent.count({ where }),
    );
  }
  if (resource === 'audit') {
    permit(staff, 'audit');
    const where = {
      createdAt: date,
      ...(query
        ? {
            OR: [
              { action: contains },
              { entityType: contains },
              { entityId: contains },
            ],
          }
        : {}),
    };
    return result(
      await db.auditLogReady.findMany({
        where,
        select: {
          id: true,
          actorReference: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
        ...page,
        orderBy,
      }),
      await db.auditLogReady.count({ where }),
    );
  }
  throw new PublicError('Not found.', 404);
}
