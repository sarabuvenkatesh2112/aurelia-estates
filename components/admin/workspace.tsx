'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Named horizontal scroll containers must be keyboard-focusable. */
import Link from 'next/link';
import { OpenCommunication } from './communications';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  can,
  staffRoles,
  leadStages,
  leadTransitions,
  visitTransitions,
  unitTransitions,
  type StaffRole,
} from '@/lib/admin/policy';
import { VISIT_SLOTS } from '@/lib/validation/forms';
type Row = Record<string, unknown>;
export type AdminPayload = Record<string, unknown>;
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const obj = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};
const scalar = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    ? String(v)
    : '';
const text = (v: unknown): string =>
  v === undefined || v === null
    ? '—'
    : typeof v === 'object'
      ? Array.isArray(v)
        ? v.map(text).join(', ')
        : scalar(
            obj(v).name ||
              obj(v).label ||
              obj(v).code ||
              obj(v).unitNumber ||
              JSON.stringify(v),
          )
      : scalar(v);
const title = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (v) => v.toUpperCase());
const date = (v: unknown) =>
  v
    ? new Date(scalar(v)).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const money = (v: unknown) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
const labelMap: Record<string, string> = {
  dashboard: 'The daily perspective',
  leads: 'Relationships, considered',
  customers: 'The customer directory',
  enquiries: 'Conversations beginning',
  visits: 'A personal introduction',
  'follow-ups': 'The next conversation',
  inventory: 'The address book',
  analytics: 'A clearer perspective',
  staff: 'The people of Aurelia',
  audit: 'A record of responsibility',
};
const statusOptions: Record<string, readonly string[]> = {
  leads: leadStages,
  visits: [
    'REQUESTED',
    'CONFIRMED',
    'RESCHEDULED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ],
  enquiries: ['NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED'],
  inventory: [
    'AVAILABLE',
    'HOLD',
    'RESERVED',
    'BOOKED',
    'SOLD',
    'NOT_RELEASED',
  ],
  'follow-ups': ['PENDING', 'COMPLETED', 'CANCELLED'],
};
const columns: Record<string, string[]> = {
  leads: ['name', 'project', 'status', 'priority', 'agent', 'followUps'],
  customers: ['name', 'email', 'phone', 'createdAt'],
  enquiries: ['name', 'project', 'status', 'reference', 'createdAt'],
  visits: [
    'name',
    'project',
    'status',
    'scheduledDate',
    'scheduledTime',
    'preferredDate',
  ],
  'follow-ups': ['title', 'lead', 'agent', 'dueAt', 'displayStatus'],
  inventory: [
    'unitNumber',
    'project',
    'tower',
    'floor',
    'unitType',
    'currentPrice',
    'availability',
  ],
  staff: ['name', 'email', 'role', 'active', 'lastActiveAt'],
  audit: ['action', 'entityType', 'entityId', 'actorReference', 'createdAt'],
};
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: unknown;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
};
const options = (items: Row[], key = 'name') =>
  items.map((v) => ({
    value: scalar(v.id),
    label: scalar(v[key] || v.name || v.label || v.id),
  }));
const enums = (items: readonly string[]) =>
  items.map((v) => ({ value: v, label: title(v) }));
function EditForm({
  resource,
  id,
  fields,
  hidden = {},
  label = 'Save changes',
  onSaved,
}: {
  resource: string;
  id?: string;
  fields: Field[];
  hidden?: Row;
  label?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  return (
    <form
      className="office-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget,
          f = new FormData(form),
          body: Row = { ...hidden };
        for (const field of fields) {
          const value = scalar(f.get(field.name) || '').trim();
          if (field.type === 'number') {
            if (value) body[field.name] = Number(value);
            else if (id) body[field.name] = null;
          } else if (field.type === 'datetime-local') {
            if (value) body[field.name] = value + ':00+05:30';
          } else if (field.name === 'active') body.active = value === 'true';
          else if (value) body[field.name] = value;
          else if (field.name === 'agentId' && id) body.agentId = null;
        }
        setBusy(true);
        setMessage('');
        try {
          const r = await fetch(
            '/api/admin/' + resource + '/' + (id ? id + '/' : ''),
            {
              method: id ? 'PATCH' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
          );
          const data = await r.json();
          if (!r.ok) {
            setError(true);
            setMessage(
              [data.error, ...Object.values(data.fields || {}).flat()].join(
                ' ',
              ),
            );
            return;
          }
          setError(false);
          setMessage('Saved. The record and its history are up to date.');
          if (!id) form.reset();
          router.refresh();
          onSaved?.();
        } catch {
          setError(true);
          setMessage('Unable to save. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="office-form-grid">
        {fields.map((field) => (
          <label key={field.name}>
            {field.label}
            {field.options ? (
              <select
                name={field.name}
                defaultValue={scalar(field.value ?? '')}
                required={field.required}
              >
                {!field.required && (
                  <option value="">
                    {field.name === 'agentId'
                      ? 'Unassigned'
                      : 'Choose an option'}
                  </option>
                )}
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                name={field.name}
                defaultValue={scalar(field.value || '')}
                required={field.required}
                maxLength={2000}
                rows={4}
              />
            ) : (
              <input
                name={field.name}
                type={field.type || 'text'}
                defaultValue={field.value == null ? '' : scalar(field.value)}
                required={field.required}
                min={field.min}
                max={field.max}
                maxLength={
                  field.name === 'name'
                    ? 60
                    : field.name === 'phone'
                      ? 30
                      : field.name === 'email'
                        ? 254
                        : 2000
                }
                step={field.type === 'number' ? '0.01' : undefined}
              />
            )}
          </label>
        ))}
      </div>
      {message && (
        <p
          role={error ? 'alert' : 'status'}
          className={error ? 'office-error' : 'office-success'}
        >
          {message}
        </p>
      )}
      <button className="office-primary" disabled={busy}>
        {busy ? 'Saving…' : label}
      </button>
    </form>
  );
}
function Table({
  items,
  resource,
  compact = false,
}: {
  items: Row[];
  resource: string;
  compact?: boolean;
}) {
  const cols = columns[resource] || ['name', 'status', 'createdAt'];
  if (!items.length)
    return (
      <div className="office-empty">
        <span>01 / A LITTLE ROOM TO BEGIN</span>
        <h3>Nothing here, yet.</h3>
        <p>
          Your selection has no records. Adjust the filters or return as new
          activity arrives.
        </p>
      </div>
    );
  return (
    <div
      className="office-table-wrap"
      tabIndex={0}
      aria-label={title(resource) + ' table, scroll horizontally if needed'}
    >
      <table className={compact ? 'office-table compact' : 'office-table'}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c === 'followUps' ? 'Next follow-up' : title(c)}
              </th>
            ))}
            <th scope="col">
              <span className="office-sr">Open record</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={scalar(item.id || i)}>
              {cols.map((c, j) => (
                <td key={c} data-label={title(c)}>
                  {[
                    'status',
                    'availability',
                    'displayStatus',
                    'priority',
                    'role',
                  ].includes(c) ? (
                    <span
                      className={
                        'office-badge ' + scalar(item[c] || '').toLowerCase()
                      }
                    >
                      {title(text(item[c]))}
                    </span>
                  ) : c === 'currentPrice' ? (
                    money(item[c])
                  ) : c === 'followUps' ? (
                    rows(item[c])[0] ? (
                      date(rows(item[c])[0].dueAt)
                    ) : (
                      'Not planned'
                    )
                  ) : c === 'scheduledDate' || c === 'preferredDate' ? (
                    text(item[c]).slice(0, 10)
                  ) : c.endsWith('At') ? (
                    date(item[c])
                  ) : j === 0 && resource !== 'audit' ? (
                    <Link href={'/admin/' + resource + '/' + item.id + '/'}>
                      {text(item[c])}
                    </Link>
                  ) : (
                    text(item[c])
                  )}
                </td>
              ))}
              <td>
                {resource !== 'audit' && (
                  <Link
                    className="office-open"
                    aria-label={
                      'Open ' + text(item.name || item.title || item.unitNumber)
                    }
                    href={'/admin/' + resource + '/' + item.id + '/'}
                  >
                    ↗
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Bars({ items, keyName }: { items: Row[]; keyName: string }) {
  const max = Math.max(1, ...items.map((v) => Number(v._count) || 0));
  return (
    <div className="office-bars">
      {items.length ? (
        items.map((v, i) => (
          <div key={i}>
            <span>{title(text(v[keyName]))}</span>
            <strong>{text(v._count)}</strong>
            <div aria-hidden="true">
              <i style={{ width: (Number(v._count) / max) * 100 + '%' }} />
            </div>
          </div>
        ))
      ) : (
        <p>No activity in this period.</p>
      )}
    </div>
  );
}
function Dashboard({
  data,
  analytics,
}: {
  data: AdminPayload;
  analytics: boolean;
}) {
  const stages = rows(data.stages),
    visits = rows(data.visits),
    inventory = rows(data.inventory);
  const count = (r: Row[], s: string, key = 'status') =>
    Number(r.find((v) => v[key] === s)?._count || 0);
  const active = stages
    .filter((v) => !['WON', 'LOST'].includes(scalar(v.status)))
    .reduce((a, v) => a + Number(v._count), 0);
  const metrics = [
    ['Active leads in period', active],
    ['New relationships', count(stages, 'NEW')],
    ['Qualified', count(stages, 'QUALIFIED')],
    [
      'Confirmed visits',
      count(visits, 'CONFIRMED') + count(visits, 'RESCHEDULED'),
    ],
    ['Completed visits', count(visits, 'COMPLETED')],
    ['Enquiries in period', data.enquiries],
    ['Customers · current', data.customers],
    [
      'Available units · current',
      count(inventory, 'AVAILABLE', 'availability'),
    ],
    ['Reserved units · current', count(inventory, 'RESERVED', 'availability')],
    ['Sold units · current', count(inventory, 'SOLD', 'availability')],
    ['Lead-to-visit', text(data.leadToVisit) + '%'],
    ['Visit-to-win', text(data.visitToWin) + '%'],
  ];
  return (
    <>
      <p className="office-period">
        Activity created {date(data.since)} — {date(data.until)} IST. Inventory
        and customers reflect current records.
      </p>
      <div className="office-kpis">
        {metrics.map(([label, value]) => (
          <article key={scalar(label)}>
            <p>{text(label)}</p>
            <strong>{text(value)}</strong>
          </article>
        ))}
      </div>
      <div className="office-two">
        <section className="office-panel">
          <p className="office-eyebrow">RELATIONSHIPS IN MOTION</p>
          <h2>The pipeline.</h2>
          <Bars items={stages} keyName="status" />
        </section>
        <section className="office-panel">
          <p className="office-eyebrow">WHERE INTEREST BEGINS</p>
          <h2>{analytics ? 'Lead sources.' : 'Upcoming visits.'}</h2>
          {analytics ? (
            <Bars items={rows(data.sources)} keyName="label" />
          ) : (
            <Table items={rows(data.upcoming)} resource="visits" compact />
          )}
        </section>
      </div>
      {analytics ? (
        <>
          <div className="office-two">
            <section className="office-panel">
              <h2>Project interest.</h2>
              <Bars items={rows(data.interest)} keyName="label" />
            </section>
            <section className="office-panel">
              <h2>Inventory position.</h2>
              <Bars items={inventory} keyName="availability" />
            </section>
          </div>
          <p className="office-muted">
            Conversions use leads created in this period: {text(data.withVisit)}{' '}
            of {text(data.cohortTotal)} have a visit;{' '}
            {text(data.winsAfterVisit)} have a completed visit and a won lead.
            Zero denominators display 0%. Budgets express customer interest, not
            booked revenue.
          </p>
        </>
      ) : (
        <>
          <section className="office-panel">
            <h2>Your next conversations.</h2>
            <p>Pending follow-ups, earliest first. Dates and times are IST.</p>
            <Table
              items={rows(data.followUps).map((v) => ({
                ...v,
                displayStatus:
                  new Date(scalar(v.dueAt)) < new Date()
                    ? 'OVERDUE'
                    : 'PENDING',
              }))}
              resource="follow-ups"
              compact
            />
          </section>
          <section className="office-panel">
            <h2>Recent relationships.</h2>
            <Table items={rows(data.recentLeads)} resource="leads" compact />
          </section>
          <section className="office-panel">
            <h2>Recent enquiries.</h2>
            <Table
              items={rows(data.recentEnquiries)}
              resource="enquiries"
              compact
            />
          </section>
          <section className="office-panel">
            <h2>Inventory watch.</h2>
            <p>
              {count(inventory, 'HOLD', 'availability')} on hold ·{' '}
              {count(inventory, 'RESERVED', 'availability')} reserved ·{' '}
              {count(inventory, 'NOT_RELEASED', 'availability')} not released.
            </p>
            <Link href="/admin/inventory/">Review the address book ↗</Link>
          </section>
        </>
      )}
    </>
  );
}
function Filters({
  resource,
  query,
  choices,
}: {
  resource: string;
  query: Record<string, string>;
  choices: Row;
}) {
  const select = (
    name: string,
    label: string,
    values: { value: string; label: string }[],
  ) => (
    <label key={name}>
      {label}
      <select name={name} defaultValue={query[name] || ''}>
        <option value="">All</option>
        {values.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
  const analytics = ['analytics', 'dashboard'].includes(resource);
  return (
    <form
      className="office-filters"
      action={'/admin/' + (resource === 'dashboard' ? '' : resource + '/')}
      method="get"
    >
      {analytics ? (
        <>
          <label>
            Period
            <select name="days" defaultValue={query.days || '30'}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <label>
            From
            <input type="date" name="from" defaultValue={query.from} />
          </label>
          <label>
            Through
            <input type="date" name="to" defaultValue={query.to} />
          </label>
        </>
      ) : (
        <>
          <label>
            Find a record
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Name, email or reference"
              maxLength={100}
            />
          </label>
          {statusOptions[resource] &&
            select('status', 'Status', enums(statusOptions[resource]))}
          {choices.projects &&
            select('projectId', 'Project', options(rows(choices.projects)))}
          <details className="office-refine">
            <summary>Refine selection</summary>
            <div className="office-filter-more">
              {['leads', 'visits', 'follow-ups'].includes(resource) &&
                select(
                  'agentId',
                  'Assigned staff',
                  options(rows(choices.agents)),
                )}
              {resource === 'leads' && (
                <>
                  {select(
                    'priority',
                    'Priority',
                    enums(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
                  )}
                  {select(
                    'sourceId',
                    'Source',
                    options(rows(choices.sources), 'label'),
                  )}
                </>
              )}
              {['leads', 'follow-ups'].includes(resource) &&
                select(
                  'followUp',
                  'Follow-up',
                  enums(['today', 'overdue', 'upcoming']),
                )}
              {resource === 'inventory' ? (
                <>
                  {select('towerId', 'Tower', options(rows(choices.towers)))}
                  {select(
                    'floorId',
                    'Floor',
                    options(rows(choices.floors), 'label'),
                  )}
                  {select(
                    'unitTypeId',
                    'Configuration',
                    options(rows(choices.configurations)),
                  )}
                  <label>
                    Minimum price (INR)
                    <input
                      type="number"
                      min="0"
                      name="minPrice"
                      defaultValue={query.minPrice}
                    />
                  </label>
                  <label>
                    Maximum price (INR)
                    <input
                      type="number"
                      min="0"
                      name="maxPrice"
                      defaultValue={query.maxPrice}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    From
                    <input type="date" name="from" defaultValue={query.from} />
                  </label>
                  <label>
                    Through
                    <input type="date" name="to" defaultValue={query.to} />
                  </label>
                </>
              )}
              <label>
                Arrange by
                <select name="sort" defaultValue={query.sort || 'newest'}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  {resource === 'inventory' && (
                    <>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                    </>
                  )}
                </select>
              </label>
            </div>
          </details>
        </>
      )}
      <button className="office-primary">Apply selection</button>
      <Link href={'/admin/' + (resource === 'dashboard' ? '' : resource + '/')}>
        Reset
      </Link>
    </form>
  );
}
function Detail({
  data,
  resource,
  staff,
}: {
  data: AdminPayload;
  resource: string;
  staff: { id: string; role: StaffRole };
}) {
  const r = obj(data.record),
    id = scalar(r.id),
    choices = obj(data.options),
    version = Number(r.version),
    write = can(staff.role, 'crm');
  const stage = scalar(r.status),
    allowedLead = [stage, ...(leadTransitions[stage] || [])];
  const info = Object.entries(r).filter(
    ([k]) =>
      ![
        'id',
        'version',
        'customerId',
        'sourceId',
        'projectId',
        'agentId',
        'leadId',
        'unitId',
        'followUps',
        'updatedAt',
      ].includes(k),
  );
  const timeline: Row[] = (
    [
      ...rows(data.history).map((v) => ({
        ...v,
        event: [v.oldStatus, v.newStatus].filter(Boolean).map(text).join(' → '),
      })),
      ...rows(data.activity).map((v) => ({ ...v, event: v.action })),
      ...rows(data.enquiries).map((v) => ({ ...v, event: 'Enquiry received' })),
      ...rows(data.visits).map((v) => ({ ...v, event: 'Visit requested' })),
    ] as Row[]
  ).sort((a, b) => scalar(b.createdAt).localeCompare(scalar(a.createdAt)));
  return (
    <>
      <Link className="office-back" href={'/admin/' + resource + '/'}>
        ← Back to {title(resource).toLowerCase()}
      </Link>
      <section className="office-panel">
        <div className="office-record-head">
          <div>
            <p className="office-eyebrow">{title(resource)} / PRIVATE RECORD</p>
            <h2>{text(r.name || r.title || r.unitNumber || r.action)}</h2>
          </div>
          {!!r.status && <span className="office-badge">{title(stage)}</span>}
        </div>
        <dl className="office-facts">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt>{title(k)}</dt>
              <dd>
                {k.includes('Price')
                  ? money(v)
                  : k.endsWith('At')
                    ? date(v)
                    : text(v)}
              </dd>
            </div>
          ))}
        </dl>
        {write && ['leads','visits','enquiries'].includes(resource) && <OpenCommunication leadId={resource==='leads'?id:scalar(r.leadId)} visitId={resource==='visits'?id:undefined} enquiryId={resource==='enquiries'?id:undefined}/>}
        {!!r.leadId && (
          <Link href={'/admin/leads/' + scalar(r.leadId) + '/'}>
            Open the lead for assignment, notes and follow-ups ↗
          </Link>
        )}
      </section>
      {resource === 'leads' && write && (
        <section className="office-panel">
          <h2>Move the relationship forward.</h2>
          <EditForm
            key={version}
            resource="leads"
            id={id}
            hidden={{ version }}
            fields={[
              {
                name: 'status',
                label: 'Stage',
                value: stage,
                options: enums(allowedLead),
                required: true,
              },
              {
                name: 'priority',
                label: 'Priority',
                value: r.priority,
                options: enums(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
                required: true,
              },
              ...(can(staff.role, 'assign')
                ? [
                    {
                      name: 'agentId',
                      label: 'Assigned staff',
                      value: r.agentId,
                      options: options(rows(choices.agents)),
                    },
                  ]
                : []),
              {
                name: 'budgetMin',
                label: 'Minimum budget (INR)',
                type: 'number',
                value: r.budgetMin,
                min: 0,
                max: 100_000_000_000,
              },
              {
                name: 'budgetMax',
                label: 'Maximum budget (INR)',
                type: 'number',
                value: r.budgetMax,
                min: 0,
                max: 100_000_000_000,
              },
            ]}
          />
        </section>
      )}
      {resource === 'leads' && write && (
        <div className="office-two">
          <section className="office-panel">
            <h2>A note for the team.</h2>
            <p>Private CRM notes are never shared with the customer.</p>
            <EditForm
              resource="notes"
              hidden={{ leadId: id }}
              fields={[
                {
                  name: 'text',
                  label: 'Internal note',
                  type: 'textarea',
                  required: true,
                },
              ]}
              label="Add private note"
            />
            {rows(data.notes).map((n) => (
              <article className="office-note" key={scalar(n.id)}>
                <p>{text(n.text)}</p>
                <small>
                  {text(n.author)} · {date(n.createdAt)}
                </small>
              </article>
            ))}
          </section>
          <section className="office-panel">
            <h2>The next conversation.</h2>
            <p>
              Assign the lead before adding a follow-up. All dates and times are
              IST.
            </p>
            <EditForm
              key={`${id}-${scalar(r.agentId)}`}
              resource="follow-ups"
              hidden={{ leadId: id }}
              fields={[
                { name: 'title', label: 'Follow-up title', required: true },
                {
                  name: 'agentId',
                  label: 'Assigned staff',
                  value: r.agentId,
                  options: options(rows(choices.agents)),
                  required: true,
                },
                {
                  name: 'dueAt',
                  label: 'Due date and time (IST)',
                  type: 'datetime-local',
                  required: true,
                },
                {
                  name: 'notes',
                  label: 'Private task notes',
                  type: 'textarea',
                },
              ]}
              label="Plan follow-up"
            />
          </section>
        </div>
      )}
      {resource === 'enquiries' && write && (
        <section className="office-panel">
          <h2>Continue the conversation.</h2>
          <p>
            The original submission is preserved. Assignment and notes are
            managed through its linked lead.
          </p>
          <EditForm
            key={version}
            resource={resource}
            id={id}
            hidden={{ version }}
            fields={[
              {
                name: 'status',
                label: 'Enquiry status',
                value: stage,
                options: enums(['NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED']),
                required: true,
              },
              ...(can(staff.role, 'assign')
                ? [
                    {
                      name: 'leadId',
                      label: 'Link to matching lead ID (optional)',
                      value: r.leadId,
                    },
                  ]
                : []),
            ]}
          />
        </section>
      )}
      {resource === 'visits' && write && (
        <section className="office-panel">
          <h2>A considered appointment.</h2>
          <p>
            Requested dates remain unchanged. Confirmation and rescheduling
            store a separate schedule and append history. All times are IST.
          </p>
          <VisitEditor key={version} id={id} record={r} />
        </section>
      )}
      {resource === 'inventory' && can(staff.role, 'inventory') && (
        <section className="office-panel">
          <h2>Manage this residence.</h2>
          <p>
            Hierarchy is immutable here. Every price/status change retains its
            previous value and actor.
          </p>
          <EditForm
            key={version}
            resource={resource}
            id={id}
            hidden={{ version, projectId: r.projectId }}
            fields={[
              {
                name: 'availability',
                label: 'Availability',
                value: r.availability,
                options: enums([
                  scalar(r.availability),
                  ...(unitTransitions[scalar(r.availability)] || []),
                ]),
                required: true,
              },
              {
                name: 'currentPrice',
                label: 'Current price (INR)',
                value: r.currentPrice,
                type: 'number',
                min: 0,
                max: 100_000_000_000,
                required: true,
              },
              {
                name: 'reason',
                label: 'Reason for change',
                type: 'textarea',
                required: true,
              },
            ]}
          />
        </section>
      )}
      {resource === 'staff' && can(staff.role, 'staff') && (
        <section className="office-panel">
          <h2>Responsibility & access.</h2>
          {id === staff.id ? (
            <p>Your own role/status cannot be changed here.</p>
          ) : (
            <EditForm
              key={version}
              resource="staff"
              id={id}
              hidden={{ version }}
              fields={[
                {
                  name: 'role',
                  label: 'Business role',
                  value: r.role,
                  options: enums(staffRoles),
                  required: true,
                },
                {
                  name: 'active',
                  label: 'Access status',
                  value: scalar(r.active),
                  options: [
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ],
                  required: true,
                },
              ]}
            />
          )}
        </section>
      )}
      {resource === 'follow-ups' && write && r.status === 'PENDING' && (
        <section className="office-panel">
          <h2>Close the loop.</h2>
          <EditForm
            resource={resource}
            id={id}
            hidden={{ version }}
            fields={[
              {
                name: 'status',
                label: 'Outcome',
                options: enums(['COMPLETED', 'CANCELLED']),
                required: true,
              },
            ]}
            label="Update follow-up"
          />
        </section>
      )}
      {['leads', 'visits', 'enquiries', 'followUps', 'favorites'].map((k) =>
        rows(data[k]).length ? (
          <section className="office-panel" key={k}>
            <h2>{title(k)}.</h2>
            {k === 'favorites' ? (
              <ul>
                {rows(data[k]).map((v) => (
                  <li key={scalar(v.id)}>{text(v.project)}</li>
                ))}
              </ul>
            ) : (
              <Table
                items={rows(data[k])}
                resource={k === 'followUps' ? 'follow-ups' : k}
              />
            )}
          </section>
        ) : null,
      )}
      {rows(data.prices).length > 0 && (
        <section className="office-panel">
          <h2>Price history.</h2>
          {rows(data.prices).map((p) => (
            <article className="office-timeline" key={scalar(p.id)}>
              <strong>
                {money(p.oldPrice)} → {money(p.newPrice)}
              </strong>
              <p>{text(p.changeReason)}</p>
              <small>{date(p.effectiveFrom)}</small>
            </article>
          ))}
        </section>
      )}
      <section className="office-panel">
        <h2>A history, preserved.</h2>
        {timeline.length ? (
          timeline.map((v, i) => (
            <article className="office-timeline" key={scalar(v.id) + i}>
              <strong>{title(text(v.event))}</strong>
              <small>{date(v.createdAt)}</small>
              {!!v.previousDate && (
                <p>
                  Previous: {text(v.previousDate).slice(0, 10)}{' '}
                  {text(v.previousTime)} · Scheduled:{' '}
                  {text(v.scheduledDate).slice(0, 10)} {text(v.scheduledTime)}{' '}
                  IST
                </p>
              )}
            </article>
          ))
        ) : (
          <p>No recorded changes yet.</p>
        )}
      </section>
    </>
  );
}
function VisitEditor({ id, record: r }: { id: string; record: Row }) {
  const actions = visitTransitions[scalar(r.status)] || [];
  const [action, setAction] = useState(actions[0] || '');
  if (!actions.length) return <p>This visit lifecycle is closed.</p>;
  return (
    <>
      <label className="office-action-select">
        Next action
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          {actions.map((v) => (
            <option key={v} value={v}>
              {title(v)}
            </option>
          ))}
        </select>
      </label>
      <EditForm
        key={action}
        resource="visits"
        id={id}
        hidden={{ version: r.version, status: action }}
        fields={[
          ...(['CONFIRMED', 'RESCHEDULED'].includes(action)
            ? [
                {
                  name: 'scheduledDate',
                  label: 'Scheduled date (YYYY-MM-DD, IST)',
                  value: text(r.scheduledDate || r.preferredDate).slice(0, 10),
                  required: true,
                },
                {
                  name: 'scheduledTime',
                  label: 'Scheduled time (IST)',
                  value: r.scheduledTime || r.preferredTime,
                  options: enums(VISIT_SLOTS),
                  required: true,
                },
              ]
            : []),
          { name: 'note', label: 'Private operational note', type: 'textarea' },
        ]}
        label={title(action) + ' visit'}
      />
    </>
  );
}
export function AdminWorkspace({
  staff,
  resource,
  id,
  query,
  data,
}: {
  staff: { id: string; name: string; role: StaffRole };
  resource: string;
  id?: string;
  query: Record<string, string>;
  data: AdminPayload;
}) {
  const [menu, setMenu] = useState(false),
    [board, setBoard] = useState(false);
  const choices = obj(data.options),
    items = rows(data.items),
    router = useRouter();
  const nav = [
    'dashboard',
    'leads',
    'customers',
    'enquiries',
    'visits',
    'follow-ups',
    'inventory',
    'communications',
    ...(can(staff.role, 'inventory') ? ['locations'] : []),
    ...(can(staff.role, 'analytics') ? ['analytics'] : []),
    ...(can(staff.role, 'staff') ? ['staff'] : []),
    ...(can(staff.role, 'audit') ? ['audit'] : []),
  ];
  const page = Number(data.page || 1),
    total = Number(data.total || 0),
    size = Number(data.pageSize || 20),
    pageLink = (p: number) => {
      const params = new URLSearchParams(query);
      params.set('page', scalar(p));
      return '/admin/' + resource + '/?' + params;
    };
  return (
    <div className="office-layout">
      <aside className={'office-sidebar ' + (menu ? 'is-open' : '')}>
        <Link className="office-brand" href="/admin/">
          AURELIA <span>PRIVATE OFFICE</span>
        </Link>
        <p className="office-eyebrow">A CONSIDERED BUSINESS</p>
        <nav aria-label="Business administration">
          {nav.map((v, i) => (
            <Link
              key={v}
              aria-current={v === resource ? 'page' : undefined}
              href={'/admin/' + (v === 'dashboard' ? '' : v + '/')}
              onClick={() => setMenu(false)}
            >
              <span>{scalar(i + 1).padStart(2, '0')}</span>
              {v === 'dashboard' ? 'Overview' : title(v)}
            </Link>
          ))}
        </nav>
        <div className="office-sidebar-foot">
          <p>{staff.name}</p>
          <small>{title(staff.role)}</small>
          <Link href="/">View public website ↗</Link>
          <button
            onClick={async () => {
              await fetch('/api/auth/sign-out/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
              router.replace('/admin/sign-in/');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="office-main">
        <header className="office-topbar">
          <button
            aria-label="Toggle office navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <span>AURELIA / {title(resource).toUpperCase()}</span>
          <span>PRIVATE & CONSIDERED</span>
        </header>
        <main id="office-content">
          <div className="office-page-title">
            <p className="office-eyebrow">
              THE AURELIA OFFICE / {title(resource).toUpperCase()}
            </p>
            <h1>
              {labelMap[resource]}
              <em>.</em>
            </h1>
            <p>Thoughtful decisions. Lasting relationships.</p>
          </div>
          {!id && (
            <Filters
              key={JSON.stringify(query)}
              resource={resource}
              query={query}
              choices={choices}
            />
          )}
          {id ? (
            <Detail data={data} resource={resource} staff={staff} />
          ) : ['dashboard', 'analytics'].includes(resource) ? (
            <Dashboard data={data} analytics={resource === 'analytics'} />
          ) : (
            <>
              {resource === 'leads' && can(staff.role, 'crm') && (
                <details className="office-panel">
                  <summary>Create a considered introduction</summary>
                  <EditForm
                    resource="leads"
                    fields={[
                      { name: 'name', label: 'Full name', required: true },
                      {
                        name: 'email',
                        label: 'Email address',
                        type: 'email',
                        required: true,
                      },
                      {
                        name: 'phone',
                        label: 'Indian mobile',
                        type: 'tel',
                        required: true,
                      },
                      {
                        name: 'projectId',
                        label: 'Project',
                        options: options(rows(choices.projects)),
                        required: true,
                      },
                      {
                        name: 'sourceId',
                        label: 'Source',
                        options: options(rows(choices.sources), 'label'),
                        required: true,
                      },
                      {
                        name: 'priority',
                        label: 'Priority',
                        options: enums(['MEDIUM', 'LOW', 'HIGH', 'URGENT']),
                        required: true,
                      },
                      {
                        name: 'budgetMin',
                        label: 'Minimum budget (INR)',
                        type: 'number',
                        min: 0,
                        max: 100_000_000_000,
                      },
                      {
                        name: 'budgetMax',
                        label: 'Maximum budget (INR)',
                        type: 'number',
                        min: 0,
                        max: 100_000_000_000,
                      },
                      {
                        name: 'customerId',
                        label: 'Existing customer ID (optional)',
                      },
                      {
                        name: 'unitId',
                        label: 'Interested unit ID (optional)',
                      },
                      {
                        name: 'notes',
                        label: 'Private introduction note',
                        type: 'textarea',
                      },
                    ]}
                    label="Create lead"
                  />
                </details>
              )}
              {resource === 'staff' && can(staff.role, 'staff') && (
                <details className="office-panel">
                  <summary>Grant access to an existing account</summary>
                  <p>
                    Use a verified account ID from the customer directory. This
                    grants business access and is recorded in the audit trail.
                  </p>
                  <EditForm
                    resource="staff"
                    fields={[
                      {
                        name: 'customerId',
                        label: 'Existing customer ID',
                        required: true,
                      },
                      {
                        name: 'role',
                        label: 'Business role',
                        options: enums(staffRoles),
                        required: true,
                      },
                    ]}
                    label="Grant staff access"
                  />
                </details>
              )}
              <section className="office-panel">
                <div className="office-list-title">
                  <p>
                    {total} {title(resource).toLowerCase()} in this selection
                  </p>
                  {resource === 'leads' && (
                    <div className="office-view-toggle">
                      <button
                        aria-pressed={!board}
                        onClick={() => setBoard(false)}
                      >
                        List
                      </button>
                      <button
                        aria-pressed={board}
                        onClick={() => setBoard(true)}
                      >
                        Pipeline
                      </button>
                    </div>
                  )}
                </div>
                {board && resource === 'leads' ? (
                  <>
                    <p className="office-muted">
                      Pipeline shows this page of filtered records. Open a card
                      to change its stage with an accessible selector.
                    </p>
                    <div
                      className="office-board"
                      tabIndex={0}
                      aria-label="Lead pipeline, scroll horizontally"
                    >
                      {leadStages.map((stage) => (
                        <section key={stage}>
                          <h2>
                            {title(stage)}{' '}
                            <span>
                              {items.filter((v) => v.status === stage).length}
                            </span>
                          </h2>
                          {items
                            .filter((v) => v.status === stage)
                            .map((v) => (
                              <Link
                                className="office-pipeline-card"
                                key={scalar(v.id)}
                                href={'/admin/leads/' + v.id + '/'}
                              >
                                <span className="office-badge">
                                  {title(text(v.priority))}
                                </span>
                                <h3>{text(v.name)}</h3>
                                <p>{text(v.project)}</p>
                                <small>{text(v.agent)}</small>
                                <p>
                                  {rows(v.followUps)[0]
                                    ? 'Next: ' +
                                      date(rows(v.followUps)[0].dueAt)
                                    : 'No follow-up planned'}
                                </p>
                              </Link>
                            ))}
                        </section>
                      ))}
                    </div>
                  </>
                ) : (
                  <Table items={items} resource={resource} />
                )}
                <nav className="office-pagination" aria-label="Record pages">
                  {page > 1 && (
                    <Link href={pageLink(page - 1)}>← Previous</Link>
                  )}
                  <span>
                    Page {page} of {Math.max(1, Math.ceil(total / size))}
                  </span>
                  {page * size < total && (
                    <Link href={pageLink(page + 1)}>Next →</Link>
                  )}
                </nav>
              </section>
            </>
          )}
          <footer className="office-footer">
            AURELIA ESTATES / THE PRIVATE OFFICE{' '}
            <span>
              All times IST. Fictional property platform. Real records.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
