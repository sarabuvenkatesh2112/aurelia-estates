import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
import {
  requireStaff,
  permit,
  leadScope,
  staffSelect,
  type Staff,
} from './auth';
import {
  leadTransitions,
  visitTransitions,
  unitTransitions,
  transitionAllowed,
} from './policy';
import {
  leadCreate,
  leadEdit,
  noteCreate,
  followCreate,
  followEdit,
  enquiryEdit,
  visitEdit,
  unitEdit,
  staffCreate,
  staffEdit,
} from '@/lib/validation/admin';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
type Tx = Prisma.TransactionClient;
const notFound = () => {
  throw new PublicError('Record not found.', 404);
};
function versionMatch(actual: number, expected: number) {
  if (actual !== expected)
    throw new PublicError(
      'This record changed. Refresh before saving again.',
      409,
    );
}
function transition(
  map: Record<string, readonly string[]>,
  before: string,
  after: string,
) {
  if (!transitionAllowed(map, before, after))
    throw new PublicError('That status transition is not allowed.', 409);
}
export async function audit(
  tx: Tx,
  staff: Staff,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await tx.auditLogReady.create({
    data: { actorReference: staff.id, action, entityType, entityId, metadata },
  });
}
async function eligible(tx: Tx, id: string) {
  const agent = await tx.agent.findFirst({
    where: {
      id,
      active: true,
      customerId: { not: null },
      role: { in: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT'] },
      customer: { deletedAt: null },
    },
    select: { id: true },
  });
  if (!agent) throw new PublicError('Choose an active eligible staff member.');
}
async function leadFor(tx: Tx, staff: Staff, id: string) {
  const lead = await tx.lead.findFirst({ where: { ...leadScope(staff), id } });
  if (!lead) return notFound();
  return lead;
}
export async function adminMutate(
  resource: string,
  id: string | undefined,
  input: unknown,
  incoming?: Headers,
) {
  const sessionStaff = await requireStaff(incoming);
  if (id) z.uuid().parse(id);
  try {
    return await getDb().$transaction(
      async (tx) => {
        // Recheck role/active status in the same serializable transaction as the write.
        const staff = await tx.agent.findFirst({
          where: {
            id: sessionStaff.id,
            customerId: sessionStaff.customerId,
            active: true,
            customer: { deletedAt: null },
          },
          select: staffSelect,
        });
        if (!staff)
          throw new PublicError('Staff access is no longer active.', 403);
        permit(
          staff,
          resource === 'staff'
            ? 'staff'
            : resource === 'inventory'
              ? 'inventory'
              : 'crm',
        );
        await tx.agent.update({
          where: { id: staff.id },
          data: { lastActiveAt: new Date() },
        });
        if (resource === 'leads' && !id) {
          const data = leadCreate.parse(input);
          if (data.customerId) {
            const customer = await tx.customer.findFirst({
              where: {
                id: data.customerId,
                deletedAt: null,
                ...(staff.role === 'SALES_AGENT'
                  ? { leads: { some: leadScope(staff) } }
                  : {}),
              },
              select: { id: true, email: true },
            });
            if (!customer) return notFound();
            if (customer.email?.toLowerCase() !== data.email)
              throw new PublicError('Customer and lead email must match.');
          }
          if (
            !(await tx.project.findFirst({
              where: {
                id: data.projectId,
                deletedAt: null,
                status: { not: 'ARCHIVED' },
              },
              select: { id: true },
            })) ||
            !(await tx.leadSource.findUnique({
              where: { id: data.sourceId },
              select: { id: true },
            }))
          )
            throw new PublicError('Choose a valid project and source.');
          if (
            data.unitId &&
            !(await tx.unit.findFirst({
              where: { id: data.unitId, projectId: data.projectId },
              select: { id: true },
            }))
          )
            throw new PublicError('Unit does not belong to this project.');
          const { notes, ...fields } = data;
          const record = await tx.lead.create({
            data: {
              ...fields,
              agentId: staff.role === 'SALES_AGENT' ? staff.id : null,
              statusHistory: {
                create: { newStatus: 'NEW', actorReference: staff.id },
              },
              ...(notes
                ? { leadNotes: { create: { text: notes, authorId: staff.id } } }
                : {}),
            },
            select: { id: true },
          });
          await audit(tx, staff, 'Lead created', 'lead', record.id);
          return record;
        }
        if (resource === 'leads' && id) {
          const data = leadEdit.parse(input),
            before = await leadFor(tx, staff, id);
          versionMatch(before.version, data.version);
          if (data.agentId !== undefined) {
            permit(staff, 'assign');
            if (data.agentId) await eligible(tx, data.agentId);
          }
          if (data.status)
            transition(leadTransitions, before.status, data.status);
          const min =
              data.budgetMin === undefined ? before.budgetMin : data.budgetMin,
            max =
              data.budgetMax === undefined ? before.budgetMax : data.budgetMax;
          if (min !== null && max !== null && Number(min) > Number(max))
            throw new PublicError('Minimum budget cannot exceed maximum.');
          const { version: _, ...changes } = data;
          await tx.lead.update({
            where: { id, version: data.version },
            data: { ...changes, version: { increment: 1 } },
          });
          if (data.status && data.status !== before.status) {
            await tx.leadStatusHistory.create({
              data: {
                leadId: id,
                oldStatus: before.status,
                newStatus: data.status,
                actorReference: staff.id,
              },
            });
            await audit(tx, staff, 'Lead status changed', 'lead', id, {
              from: before.status,
              to: data.status,
            });
          }
          if (data.agentId !== undefined && data.agentId !== before.agentId) {
            // Pending tasks follow their new eligible owner; unassignment cancels them explicitly.
            await tx.followUp.updateMany({
              where: { leadId: id, status: 'PENDING' },
              data: data.agentId
                ? { agentId: data.agentId, version: { increment: 1 } }
                : { status: 'CANCELLED', version: { increment: 1 } },
            });
            await audit(tx, staff, 'Lead assigned', 'lead', id, {
              from: before.agentId,
              to: data.agentId,
              pendingTasks: data.agentId ? 'reassigned' : 'cancelled',
            });
          }
          await audit(tx, staff, 'Lead updated', 'lead', id, {
            fields: Object.keys(changes),
          });
          return { id };
        }
        if (resource === 'notes' && !id) {
          const data = noteCreate.parse(input);
          await leadFor(tx, staff, data.leadId);
          const note = await tx.leadNote.create({
            data: { ...data, authorId: staff.id },
            select: { id: true },
          });
          await audit(tx, staff, 'Note added', 'lead', data.leadId, {
            noteId: note.id,
          });
          return note;
        }
        if (resource === 'follow-ups' && !id) {
          const data = followCreate.parse(input),
            lead = await leadFor(tx, staff, data.leadId);
          if (staff.role === 'SALES_AGENT' && data.agentId !== staff.id)
            throw new PublicError(
              'Agents may create only their own follow-ups.',
              403,
            );
          await eligible(tx, data.agentId);
          if (lead.agentId !== data.agentId)
            throw new PublicError(
              'Assign the lead to this staff member before creating their follow-up.',
            );
          const record = await tx.followUp.create({
            data: {
              ...data,
              dueAt: new Date(data.dueAt),
              customerId: lead.customerId,
            },
            select: { id: true },
          });
          await audit(tx, staff, 'Follow-up added', 'lead', lead.id, {
            followUpId: record.id,
            dueAt: data.dueAt,
          });
          return record;
        }
        if (resource === 'follow-ups' && id) {
          const data = followEdit.parse(input),
            before = await tx.followUp.findFirst({
              where: {
                id,
                lead: leadScope(staff),
                ...(staff.role === 'SALES_AGENT' ? { agentId: staff.id } : {}),
              },
            });
          if (!before) return notFound();
          versionMatch(before.version, data.version);
          if (before.status !== 'PENDING')
            throw new PublicError('This follow-up is already closed.', 409);
          await tx.followUp.update({
            where: { id, version: data.version },
            data: {
              status: data.status,
              completedAt: data.status === 'COMPLETED' ? new Date() : null,
              version: { increment: 1 },
            },
          });
          await audit(
            tx,
            staff,
            'Follow-up ' + data.status.toLowerCase(),
            'lead',
            before.leadId,
            { followUpId: id },
          );
          return { id };
        }
        if (resource === 'enquiries' && id) {
          const data = enquiryEdit.parse(input),
            before = await tx.enquiry.findFirst({
              where: { id, lead: leadScope(staff) },
            });
          if (!before) return notFound();
          versionMatch(before.version, data.version);
          if (data.leadId && data.leadId !== before.leadId) {
            permit(staff, 'assign');
            const lead = await leadFor(tx, staff, data.leadId);
            if (
              lead.customerId !== before.customerId ||
              lead.projectId !== before.projectId ||
              lead.email.toLowerCase() !== before.email.toLowerCase()
            )
              throw new PublicError(
                'The linked lead must match the original customer, email and project.',
              );
          }
          transition(
            {
              NEW: ['IN_REVIEW', 'CONTACTED', 'CLOSED'],
              IN_REVIEW: ['CONTACTED', 'CLOSED'],
              CONTACTED: ['CLOSED'],
              CLOSED: ['IN_REVIEW'],
            },
            before.status,
            data.status,
          );
          await tx.enquiry.update({
            where: { id, version: data.version },
            data: {
              status: data.status,
              leadId: data.leadId,
              version: { increment: 1 },
            },
          });
          if (before.status !== data.status)
            await tx.enquiryStatusHistory.create({
              data: {
                enquiryId: id,
                oldStatus: before.status,
                newStatus: data.status,
                actorReference: staff.id,
              },
            });
          await audit(tx, staff, 'Enquiry updated', 'enquiry', id, {
            from: before.status,
            to: data.status,
            previousLead: before.leadId,
            leadId: data.leadId || before.leadId,
          });
          await audit(
            tx,
            staff,
            'Enquiry ' + data.status.toLowerCase(),
            'lead',
            data.leadId || before.leadId,
            { enquiryId: id },
          );
          return { id };
        }
        if (resource === 'visits' && id) {
          const data = visitEdit.parse(input),
            before = await tx.siteVisit.findFirst({
              where: { id, lead: leadScope(staff) },
            });
          if (!before) return notFound();
          versionMatch(before.version, data.version);
          transition(visitTransitions, before.status, data.status);
          if (before.status === data.status && data.status !== 'RESCHEDULED')
            throw new PublicError('This visit already has that status.', 409);
          const lead = await leadFor(tx, staff, before.leadId);
          if (
            lead.projectId !== before.projectId ||
            lead.customerId !== before.customerId
          )
            throw new PublicError(
              'Visit ownership or project requires review.',
              409,
            );
          if (
            before.unitId &&
            !(await tx.unit.findFirst({
              where: { id: before.unitId, projectId: before.projectId },
              select: { id: true },
            }))
          )
            throw new PublicError(
              'Visit unit does not belong to this project.',
            );
          const oldDate = before.scheduledDate || before.preferredDate,
            oldTime = before.scheduledTime || before.preferredTime;
          if (
            ['COMPLETED', 'NO_SHOW'].includes(data.status) &&
            (!before.scheduledDate ||
              !before.scheduledTime ||
              new Date(
                oldDate.toISOString().slice(0, 10) +
                  'T' +
                  oldTime +
                  ':00+05:30',
              ) > new Date())
          )
            throw new PublicError(
              'A scheduled visit can be completed or marked no-show only after its scheduled time.',
            );
          const newDate = data.scheduledDate
              ? new Date(data.scheduledDate + 'T00:00:00Z')
              : before.scheduledDate,
            newTime = data.scheduledTime || before.scheduledTime;
          await tx.siteVisit.update({
            where: { id, version: data.version },
            data: {
              status: data.status,
              scheduledDate: newDate,
              scheduledTime: newTime,
              version: { increment: 1 },
            },
          });
          await tx.siteVisitStatusHistory.create({
            data: {
              siteVisitId: id,
              oldStatus: before.status,
              newStatus: data.status,
              previousDate: oldDate,
              previousTime: oldTime,
              scheduledDate: newDate,
              scheduledTime: newTime,
              note: data.note,
              actorReference: staff.id,
            },
          });
          await audit(
            tx,
            staff,
            'Visit ' + data.status.toLowerCase(),
            'visit',
            id,
            {
              previousDate: oldDate.toISOString(),
              previousTime: oldTime,
              scheduledDate: newDate?.toISOString() || null,
              scheduledTime: newTime,
            },
          );
          await audit(
            tx,
            staff,
            'Visit ' + data.status.toLowerCase(),
            'lead',
            lead.id,
            { visitId: id },
          );
          return { id };
        }
        if (resource === 'inventory' && id) {
          const data = unitEdit.parse(input),
            before = await tx.unit.findFirst({
              where: {
                id,
                projectId: data.projectId,
                project: { deletedAt: null },
              },
            });
          if (!before) return notFound();
          versionMatch(before.version, data.version);
          if (data.availability)
            transition(unitTransitions, before.availability, data.availability);
          await tx.unit.update({
            where: { id, version: data.version },
            data: {
              availability: data.availability,
              currentPrice: data.currentPrice,
              version: { increment: 1 },
            },
          });
          if (
            data.currentPrice !== undefined &&
            Number(before.currentPrice) !== data.currentPrice
          )
            await tx.unitPriceHistory.create({
              data: {
                unitId: id,
                oldPrice: before.currentPrice,
                newPrice: data.currentPrice,
                changeReason: data.reason,
                actorReference: staff.id,
              },
            });
          if (data.availability && data.availability !== before.availability)
            await tx.unitStatusHistory.create({
              data: {
                unitId: id,
                oldStatus: before.availability,
                newStatus: data.availability,
                note: data.reason,
                actorReference: staff.id,
              },
            });
          await audit(tx, staff, 'Inventory updated', 'unit', id, {
            previousPrice: before.currentPrice.toString(),
            price: data.currentPrice ?? before.currentPrice.toString(),
            from: before.availability,
            to: data.availability || before.availability,
          });
          return { id };
        }
        if (resource === 'staff' && !id) {
          const data = staffCreate.parse(input),
            customer = await tx.customer.findFirst({
              where: { id: data.customerId, deletedAt: null },
              select: { id: true, name: true, email: true },
            });
          if (!customer?.email)
            throw new PublicError('Choose an existing account with an email.');
          if (customer.id === staff.customerId)
            throw new PublicError(
              'Your own staff membership cannot be changed here.',
              403,
            );
          const record = await tx.agent.create({
            data: {
              customerId: customer.id,
              name: customer.name,
              email: customer.email,
              role: data.role,
            },
            select: { id: true },
          });
          await audit(tx, staff, 'Staff access granted', 'staff', record.id, {
            role: data.role,
          });
          return record;
        }
        if (resource === 'staff' && id) {
          const data = staffEdit.parse(input),
            before = await tx.agent.findUnique({
              where: { id },
              select: staffSelect,
            });
          if (!before) return notFound();
          versionMatch(before.version, data.version);
          if (id === staff.id)
            throw new PublicError(
              'You cannot change your own role or active status.',
              403,
            );
          if (
            before.role === 'SUPER_ADMIN' &&
            before.active &&
            (!data.active || data.role !== 'SUPER_ADMIN') &&
            (await tx.agent.count({
              where: {
                role: 'SUPER_ADMIN',
                active: true,
                customerId: { not: null },
              },
            })) <= 1
          )
            throw new PublicError(
              'The last active super-admin must remain.',
              409,
            );
          if (!data.active || data.role === 'VIEWER') {
            const assigned = await tx.lead.count({
              where: {
                agentId: id,
                deletedAt: null,
                status: { notIn: ['WON', 'LOST'] },
              },
            });
            const tasks = await tx.followUp.count({
              where: { agentId: id, status: 'PENDING' },
            });
            if (assigned || tasks)
              throw new PublicError(
                'Reassign open leads and close or reassign pending tasks before deactivating this staff member.',
                409,
              );
          }
          await tx.agent.update({
            where: { id, version: data.version },
            data: {
              role: data.role,
              active: data.active,
              version: { increment: 1 },
            },
          });
          await audit(tx, staff, 'Staff role/status changed', 'staff', id, {
            previousRole: before.role,
            role: data.role,
            previousActive: before.active,
            active: data.active,
          });
          return { id };
        }
        throw new PublicError('Not found.', 404);
      },
      { isolationLevel: 'Serializable', maxWait: 15000, timeout: 20000 },
    );
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) {
      if (e.code === 'P2034' || e.code === 'P2025')
        throw new PublicError(
          'A concurrent change occurred. Refresh and try again.',
          409,
        );
      if (e.code === 'P2002')
        throw new PublicError('That record already exists.', 409);
    }
    throw e;
  }
}
