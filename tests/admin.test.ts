import test from 'node:test';
import assert from 'node:assert/strict';
import {
  can,
  staffRoles,
  leadTransitions,
  visitTransitions,
  unitTransitions,
  transitionAllowed,
} from '../lib/admin/policy';
import {
  adminQuery,
  leadCreate,
  leadEdit,
  visitEdit,
  unitEdit,
  followCreate,
  staffEdit,
} from '../lib/validation/admin';
import { randomUUID } from 'node:crypto';
void test('central staff permissions separate viewers, agents and privileged roles', () => {
  assert.equal(can('SUPER_ADMIN', 'staff'), true);
  assert.equal(can('ADMIN', 'inventory'), true);
  assert.equal(can('ADMIN', 'staff'), false);
  assert.equal(can('SALES_MANAGER', 'assign'), true);
  assert.equal(can('SALES_MANAGER', 'inventory'), false);
  assert.equal(can('SALES_AGENT', 'assign'), false);
  assert.equal(can('SALES_AGENT', 'crm'), true);
  assert.equal(can('VIEWER', 'crm'), false);
  for (const role of staffRoles) assert.equal(can(role, 'read'), true);
});
void test('validated business transitions preserve closed lifecycle states', () => {
  assert.equal(transitionAllowed(leadTransitions, 'NEW', 'WON'), false);
  assert.equal(transitionAllowed(leadTransitions, 'NEGOTIATION', 'WON'), true);
  assert.equal(transitionAllowed(leadTransitions, 'LOST', 'CONTACTED'), true);
  assert.equal(
    transitionAllowed(visitTransitions, 'REQUESTED', 'COMPLETED'),
    false,
  );
  assert.equal(
    transitionAllowed(visitTransitions, 'CONFIRMED', 'RESCHEDULED'),
    true,
  );
  assert.equal(
    transitionAllowed(visitTransitions, 'CANCELLED', 'CONFIRMED'),
    false,
  );
  assert.equal(transitionAllowed(unitTransitions, 'AVAILABLE', 'SOLD'), false);
  assert.equal(transitionAllowed(unitTransitions, 'RESERVED', 'SOLD'), true);
  assert.equal(transitionAllowed(unitTransitions, 'SOLD', 'AVAILABLE'), false);
});
void test('CRM shared validation bounds queries, identity, budgets and assignments', () => {
  const base = {
    name: 'Aurelia Test',
    email: 'QA@EXAMPLE.TEST',
    phone: '9876543210',
    projectId: randomUUID(),
    sourceId: randomUUID(),
  };
  assert.equal(leadCreate.parse(base).phone, '+919876543210');
  for (const changes of [
    { name: 'Test 1' },
    { email: 'a b@test.com' },
    { phone: '1234567890' },
    { budgetMin: -1 },
    { budgetMax: 1e15 },
    { budgetMin: 20, budgetMax: 10 },
    { notes: '<script>bad</script>' },
    { role: 'SUPER_ADMIN' },
  ])
    assert.equal(leadCreate.safeParse({ ...base, ...changes }).success, false);
  for (const q of [
    { page: 0 },
    { pageSize: 1000 },
    { agentId: 'bad' },
    { from: '2026-02-30' },
    { from: '2025-01-01', to: '2026-09-01' },
    { minPrice: 50, maxPrice: 10 },
    { role: 'SUPER_ADMIN' },
  ])
    assert.equal(adminQuery.safeParse(q).success, false);
  assert.equal(
    leadEdit.safeParse({ version: 0, status: 'INJECTED' }).success,
    false,
  );
  assert.equal(
    staffEdit.safeParse({
      version: 0,
      role: 'SUPER_ADMIN',
      active: true,
      customerId: randomUUID(),
    }).success,
    false,
  );
});
void test('operational scheduling and price updates reject malformed or unsafe payloads', () => {
  assert.equal(
    visitEdit.safeParse({ version: 0, status: 'CONFIRMED' }).success,
    false,
  );
  assert.equal(
    visitEdit.safeParse({
      version: 0,
      status: 'RESCHEDULED',
      scheduledDate: '2020-01-01',
      scheduledTime: '03:00',
    }).success,
    false,
  );
  assert.equal(
    visitEdit.safeParse({
      version: 0,
      status: 'CANCELLED',
      scheduledTime: '10:00',
    }).success,
    false,
  );
  assert.equal(
    unitEdit.safeParse({
      version: 0,
      projectId: randomUUID(),
      currentPrice: -1,
      reason: 'test',
    }).success,
    false,
  );
  assert.equal(
    unitEdit.safeParse({
      version: 0,
      projectId: randomUUID(),
      towerId: randomUUID(),
      reason: 'test',
    }).success,
    false,
  );
  assert.equal(
    followCreate.safeParse({
      leadId: randomUUID(),
      agentId: randomUUID(),
      title: 'Call',
      dueAt: 'tomorrow',
    }).success,
    false,
  );
});
