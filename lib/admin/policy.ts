export const staffRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'SALES_AGENT',
  'VIEWER',
] as const;
export type StaffRole = (typeof staffRoles)[number];
export const permissions = {
  SUPER_ADMIN: [
    'read',
    'crm',
    'assign',
    'inventory',
    'analytics',
    'staff',
    'audit',
  ],
  ADMIN: ['read', 'crm', 'assign', 'inventory', 'analytics', 'audit'],
  SALES_MANAGER: ['read', 'crm', 'assign', 'analytics'],
  SALES_AGENT: ['read', 'crm'],
  VIEWER: ['read'],
} as const;
export type Permission =
  | 'read'
  | 'crm'
  | 'assign'
  | 'inventory'
  | 'analytics'
  | 'staff'
  | 'audit';
export function can(role: StaffRole, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}
export const leadStages = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VISIT_REQUESTED',
  'VISIT_SCHEDULED',
  'SITE_VISIT',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export const leadTransitions: Record<string, readonly string[]> = {
  NEW: ['CONTACTED', 'VISIT_REQUESTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'VISIT_REQUESTED', 'LOST'],
  QUALIFIED: ['VISIT_REQUESTED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'LOST'],
  VISIT_REQUESTED: ['VISIT_SCHEDULED', 'CONTACTED', 'LOST'],
  VISIT_SCHEDULED: ['SITE_VISIT', 'NEGOTIATION', 'LOST'],
  SITE_VISIT: ['NEGOTIATION', 'WON', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: [],
  LOST: ['CONTACTED'],
};
export const visitTransitions: Record<string, readonly string[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  RESCHEDULED: ['RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};
export const unitTransitions: Record<string, readonly string[]> = {
  AVAILABLE: ['HOLD', 'RESERVED', 'NOT_RELEASED'],
  HOLD: ['AVAILABLE', 'RESERVED', 'NOT_RELEASED'],
  RESERVED: ['AVAILABLE', 'BOOKED', 'SOLD'],
  BOOKED: ['RESERVED', 'SOLD'],
  SOLD: [],
  NOT_RELEASED: ['AVAILABLE'],
};
export function transitionAllowed(
  map: Record<string, readonly string[]>,
  before: string,
  after: string,
) {
  return before === after || !!map[before]?.includes(after);
}
