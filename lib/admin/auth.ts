import 'server-only';
import { currentCustomer } from '@/lib/auth/server';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
import { can, type Permission } from './policy';
import type { Prisma } from '@/generated/prisma/client';
export const staffSelect = {
  id: true,
  customerId: true,
  name: true,
  email: true,
  role: true,
  active: true,
  version: true,
  createdAt: true,
  lastActiveAt: true,
} as const;
export async function requireStaff(incoming?: Headers) {
  const customer = await currentCustomer(incoming);
  if (!customer) throw new PublicError('Staff sign-in is required.', 401);
  const staff = await getDb().agent.findFirst({
    where: { customerId: customer.id, active: true },
    select: staffSelect,
  });
  if (!staff)
    throw new PublicError('This account does not have staff access.', 403);
  return staff;
}
export type Staff = Awaited<ReturnType<typeof requireStaff>>;
export function permit(staff: Staff, permission: Permission) {
  if (!can(staff.role, permission))
    throw new PublicError('You do not have permission for this action.', 403);
}
export function leadScope(staff: Staff): Prisma.LeadWhereInput {
  return {
    deletedAt: null,
    ...(staff.role === 'SALES_AGENT' ? { agentId: staff.id } : {}),
  };
}
export function customerScope(staff: Staff): Prisma.CustomerWhereInput {
  return {
    deletedAt: null,
    ...(staff.role === 'SALES_AGENT'
      ? { leads: { some: leadScope(staff) } }
      : {}),
  };
}
