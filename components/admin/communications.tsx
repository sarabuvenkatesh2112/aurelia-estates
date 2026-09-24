'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { can, type StaffRole } from '@/lib/admin/policy';
type Row = Record<string, unknown>;
const object = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const text = (v: unknown) =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const date = (v: unknown) =>
  v
    ? new Date(text(v)).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const label = (v: unknown) => text(v).replaceAll('_', ' ').toLowerCase();
export function OpenCommunication({
  leadId,
  visitId,
  enquiryId,
}: {
  leadId: string;
  visitId?: string;
  enquiryId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div>
      <Link href={'/admin/communications/?leadId=' + leadId}>
        View WhatsApp history ↗
      </Link>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch('/api/admin/communications/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId, visitId, enquiryId }),
            });
            const data = await r.json();
            if (!r.ok) throw Error(data.error);
            router.push('/admin/communications/' + data.id + '/');
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Unable to open communication.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Open WhatsApp conversation
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function Communications({
  data,
  staff,
  id,
  query,
}: {
  data: Row;
  staff: { name: string; id: string; role: StaffRole };
  id?: string;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [draft, setDraft] = useState(''),
    [review, setReview] = useState(false),
    [templateId, setTemplate] = useState(''),
    [parameters, setParameters] = useState<string[]>([]),
    [sendKey, setSendKey] = useState(() => crypto.randomUUID());
  const t = object(data.thread),
    contact = object(t.contact),
    customer = object(contact.customer),
    lead = object(t.lead),
    project = object(t.project),
    visit = object(t.visit),
    enquiry = object(t.enquiry);
  const write = can(staff.role, 'crm'),
    assign = can(staff.role, 'assign');
  const templates = list(data.templates),
    template = templates.find((v) => v.id === templateId);
  const sendText = template
    ? text(template.body).replace(
        /\{\{(\d+)\}\}/g,
        (_m, n) => parameters[Number(n) - 1] || '',
      )
    : draft;
  async function command(body: Row, endpoint = id) {
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch(
        '/api/admin/communications/' + (endpoint ? endpoint + '/' : ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const value = await r.json();
      if (!r.ok)
        throw Error(value.error || 'This action could not be completed.');
      router.refresh();
      return value as Row;
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : 'This action could not be completed.',
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  function editText(value: string) {
    setDraft(value);
    setReview(false);
    setSendKey(crypto.randomUUID());
  }
  const nav = [
    '',
    'leads',
    'customers',
    'visits',
    'enquiries',
    'follow-ups',
    'inventory',
    'communications',
    ...(can(staff.role, 'analytics') ? ['analytics'] : []),
  ];
  return (
    <div className="office-layout">
      <aside className={'office-sidebar ' + (menu ? 'is-open' : '')}>
        <Link className="office-brand" href="/admin/">
          AURELIA <span>PRIVATE OFFICE</span>
        </Link>
        <p className="office-eyebrow">A CONSIDERED BUSINESS</p>
        <nav aria-label="Business administration">
          {nav.map((n, i) => (
            <Link
              key={n}
              aria-current={n === 'communications' ? 'page' : undefined}
              href={'/admin/' + (n ? n + '/' : '')}
              onClick={() => setMenu(false)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {n || 'Overview'}
            </Link>
          ))}
        </nav>
        <div className="office-sidebar-foot">
          <p>{staff.name}</p>
          <small>{label(staff.role)}</small>
          <Link href="/">View public website ↗</Link>
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
          <span>AURELIA / COMMUNICATIONS</span>
          <span>PRIVATE & CONSIDERED</span>
        </header>
        <main id="office-content">
          <div className="office-page-title">
            <p className="office-eyebrow">RELATIONSHIPS / WHATSAPP BUSINESS</p>
            <h1>
              A considered conversation<em>.</em>
            </h1>
            <p>One relationship. A continuous history.</p>
          </div>
          {!data.ready && (
            <output className="comm-notice">
              WhatsApp Cloud API is not connected. History and CRM tools remain
              available. No message will be sent until the official provider is
              configured.
            </output>
          )}
          {notice && (
            <p className="comm-notice" role="alert">
              {notice}
            </p>
          )}
          {!id ? (
            <>
              <div className="office-stats">
                {Object.entries(object(data.metrics)).map(([k, v]) => (
                  <div className="office-panel" key={k}>
                    <small>{label(k)}</small>
                    <h2>{text(v)}</h2>
                  </div>
                ))}
              </div>
              <form
                className="office-form comm-filters"
                action="/admin/communications/"
              >
                <label>
                  Find a relationship
                  <input
                    name="q"
                    defaultValue={query.q}
                    maxLength={80}
                    placeholder="Name, phone, lead or project"
                  />
                </label>
                <label>
                  Thread mode
                  <select name="mode" defaultValue={query.mode || ''}>
                    <option value="">All modes</option>
                    {['HUMAN', 'AI_ASSISTED', 'PAUSED'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Unread
                  <select name="unread" defaultValue={query.unread || 'false'}>
                    <option value="false">All conversations</option>
                    <option value="true">Unread only</option>
                  </select>
                </label>
                {query.leadId && (
                  <input type="hidden" name="leadId" value={query.leadId} />
                )}
                <button>Apply filters</button>
                <Link href="/admin/communications/">Clear</Link>
              </form>
              <section
                aria-label="WhatsApp conversations"
                className="comm-list"
              >
                {list(data.items).map((row) => {
                  const c = object(row.contact),
                    last = list(row.messages)[0] || {};
                  return (
                    <Link
                      className="comm-thread"
                      key={text(row.id)}
                      href={'/admin/communications/' + row.id + '/'}
                    >
                      <div>
                        <span className="office-eyebrow">
                          {label(row.mode)} ·{' '}
                          {Number(row.unreadCount) > 0
                            ? `${text(row.unreadCount)} unread`
                            : 'UP TO DATE'}
                        </span>
                        <h2>
                          {text(object(c.customer).name) ||
                            text(c.displayName) ||
                            text(c.phone)}
                        </h2>
                        <p>
                          {text(c.phone)} ·{' '}
                          {text(object(row.project).name) ||
                            'Property interest to be discussed'}
                        </p>
                        <p className="comm-excerpt">
                          {text(last.body) || 'No text message yet'}
                        </p>
                      </div>
                      <div>
                        <time>{date(row.lastActivityAt)}</time>
                        <p>{text(object(row.agent).name) || 'Unassigned'}</p>
                        <span>
                          {label(last.direction)} · {label(last.status)} ↗
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {!list(data.items).length && (
                  <div className="office-panel">
                    <h2>A space for the next conversation.</h2>
                    <p>
                      No conversations match these filters. Signed inbound
                      messages appear here; staff can also open a thread from a
                      permitted CRM lead.
                    </p>
                  </div>
                )}
              </section>
              <div className="comm-pagination">
                {Number(data.page) > 1 && (
                  <Link
                    href={
                      '?' +
                      new URLSearchParams({
                        ...query,
                        page: String(Number(data.page) - 1),
                      })
                    }
                  >
                    Previous
                  </Link>
                )}
                <span>
                  {text(data.total)} conversations · page {text(data.page)}
                </span>
                {Number(data.page) * 20 < Number(data.total) && (
                  <Link
                    href={
                      '?' +
                      new URLSearchParams({
                        ...query,
                        page: String(Number(data.page) + 1),
                      })
                    }
                  >
                    Next
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <Link className="office-back" href="/admin/communications/">
                ← All conversations
              </Link>
              <div className="comm-grid">
                <section className="office-panel comm-history">
                  <p className="office-eyebrow">CUSTOMER-VISIBLE CHANNEL</p>
                  <h2>
                    {text(customer.name) ||
                      text(contact.displayName) ||
                      text(contact.phone)}
                  </h2>
                  <p>
                    {text(contact.phone)} · {label(t.mode)} ·{' '}
                    {label(contact.consent)}
                  </p>
                  <p>
                    {data.windowOpen
                      ? 'Customer-service window open.'
                      : 'Service window closed: an approved utility template and recorded opt-in are required.'}
                  </p>
                  {write && (
                    <button
                      disabled={busy}
                      onClick={() => void command({ action: 'read' })}
                    >
                      Mark conversation read
                    </button>
                  )}
                  <ol aria-label="Message history" className="comm-messages">
                    {list(data.messages).map((m) => (
                      <li
                        key={text(m.id)}
                        className={
                          m.direction === 'OUTBOUND' ? 'is-outbound' : ''
                        }
                      >
                        <div className="comm-message-meta">
                          <strong>
                            {m.direction === 'INBOUND'
                              ? 'Customer → Aurelia'
                              : 'Aurelia → Customer'}
                          </strong>
                          <span>{label(m.status)}</span>
                        </div>
                        <p>
                          {text(m.body) ||
                            `Unsupported ${text(m.type)} message. Review in the official WhatsApp tools.`}
                        </p>
                        <small>
                          {date(m.providerAt || m.createdAt)}{' '}
                          {object(m.staff).name
                            ? '· ' + text(object(m.staff).name)
                            : ''}
                        </small>
                        {!!m.errorCode && (
                          <output>
                            Provider outcome: {text(m.errorCode)}. Do not resend
                            an uncertain submission.
                          </output>
                        )}
                        {list(m.history).length > 0 && (
                          <details>
                            <summary>Delivery history</summary>
                            <ul>
                              {list(m.history).map((h) => (
                                <li key={text(h.id)}>
                                  {label(h.status)} · {date(h.occurredAt)}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="comm-pagination">
                    {Number(data.page) > 1 && (
                      <Link href={'?page=' + (Number(data.page) - 1)}>
                        Newer messages
                      </Link>
                    )}
                    {Number(data.page) * 50 < Number(data.total) && (
                      <Link href={'?page=' + (Number(data.page) + 1)}>
                        Older messages
                      </Link>
                    )}
                  </div>
                  {write && (
                    <form
                      className="office-form comm-composer"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!review) {
                          setReview(true);
                          return;
                        }
                        const result = await command({
                          action: 'send',
                          idempotencyKey: sendKey,
                          text: sendText,
                          confirm: true,
                          ...(templateId ? { templateId, parameters } : {}),
                        });
                        if (result) {
                          setNotice(
                            'Message outcome: ' +
                              label(result.status) +
                              '. Delivery is confirmed only by Meta webhooks.',
                          );
                          setReview(false);
                          setDraft('');
                          setTemplate('');
                          setSendKey(crypto.randomUUID());
                        }
                      }}
                    >
                      <h3>Write with care.</h3>
                      <label>
                        Message format
                        <select
                          value={templateId}
                          onChange={(e) => {
                            setTemplate(e.target.value);
                            setParameters([]);
                            setReview(false);
                            setSendKey(crypto.randomUUID());
                          }}
                        >
                          <option value="">Service-window text</option>
                          {templates.map((v) => (
                            <option key={text(v.id)} value={text(v.id)}>
                              {text(v.name)} · {text(v.language)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {template ? (
                        Array.from(
                          { length: Number(template.parameterCount) },
                          (_, i) => (
                            <label key={i}>
                              Template value {i + 1}
                              <input
                                required
                                maxLength={300}
                                value={parameters[i] || ''}
                                onChange={(e) => {
                                  const values = [...parameters];
                                  values[i] = e.target.value;
                                  setParameters(values);
                                  setReview(false);
                                  setSendKey(crypto.randomUUID());
                                }}
                              />
                            </label>
                          ),
                        )
                      ) : (
                        <label>
                          Customer-visible message
                          <textarea
                            required
                            maxLength={2000}
                            rows={5}
                            value={draft}
                            onChange={(e) => editText(e.target.value)}
                          />
                        </label>
                      )}
                      {(review || template) && (
                        <div className="comm-preview">
                          <strong>
                            {review
                              ? 'Confirm this exact message'
                              : 'Template preview'}
                          </strong>
                          <p>{sendText}</p>
                          <small>
                            To {text(contact.phone)}. This leaves Aurelia
                            through WhatsApp.
                          </small>
                        </div>
                      )}
                      <button
                        disabled={
                          busy ||
                          !data.ready ||
                          t.mode === 'PAUSED' ||
                          contact.consent === 'OPTED_OUT'
                        }
                      >
                        {busy
                          ? 'Working…'
                          : review
                            ? 'Confirm and send on WhatsApp'
                            : 'Review message'}
                      </button>
                      {review && (
                        <button type="button" onClick={() => setReview(false)}>
                          Return to editing
                        </button>
                      )}
                      <small>
                        API acceptance is not delivery. Unknown outcomes are
                        never automatically retried.
                      </small>
                    </form>
                  )}
                </section>
                <aside className="comm-context">
                  <section className="office-panel">
                    <p className="office-eyebrow">
                      PRIVATE CRM CONTEXT · NEVER SENT
                    </p>
                    <h2>The relationship.</h2>
                    <dl className="office-facts">
                      <div>
                        <dt>Project</dt>
                        <dd>{text(project.name) || 'Not linked'}</dd>
                      </div>
                      <div>
                        <dt>Assigned staff</dt>
                        <dd>{text(object(t.agent).name) || 'Unassigned'}</dd>
                      </div>
                      <div>
                        <dt>Handoff</dt>
                        <dd>
                          {t.handoffAt ? date(t.handoffAt) : 'None requested'}
                        </dd>
                      </div>
                    </dl>
                    <div className="comm-links">
                      {!!customer.id && (
                        <Link href={'/admin/customers/' + text(customer.id) + '/'}>
                          Customer record ↗
                        </Link>
                      )}
                      {!!lead.id && (
                        <Link href={'/admin/leads/' + text(lead.id) + '/'}>
                          Lead, private notes & follow-ups ↗
                        </Link>
                      )}
                      {!!visit.id && (
                        <Link href={'/admin/visits/' + text(visit.id) + '/'}>
                          Visit {text(visit.reference)} · {label(visit.status)}{' '}
                          ↗
                        </Link>
                      )}
                      {!!enquiry.id && (
                        <Link href={'/admin/enquiries/' + text(enquiry.id) + '/'}>
                          Enquiry {text(enquiry.reference)} ↗
                        </Link>
                      )}
                    </div>
                    {write && !!lead.id && <details><summary>Plan a private CRM follow-up</summary><form className="office-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const dueRaw=f.get('dueAt');const result=await command({action:'follow_up',title:f.get('title'),dueAt:(typeof dueRaw==='string'?dueRaw:'')+':00+05:30',...(f.get('notes')?{notes:f.get('notes')}:{})});if(result)setNotice('Follow-up saved in the existing CRM task list.');}}><label>Follow-up title<input name="title" required maxLength={160}/></label><label>Due date and time (IST)<input type="datetime-local" name="dueAt" required/></label><label>Private notes<textarea name="notes" maxLength={2000}/></label><button disabled={busy}>Save CRM follow-up</button></form></details>}
                    {write && (
                      <>
                        <label className="comm-label">
                          Conversation control
                          <select
                            disabled={busy}
                            value={text(t.mode)}
                            onChange={(e) =>
                              void command({
                                action: 'mode',
                                mode: e.target.value,
                                version: t.version,
                              })
                            }
                          >
                            {['HUMAN', 'AI_ASSISTED', 'PAUSED'].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                        {assign && (
                          <label className="comm-label">
                            Assigned staff
                            <select
                              disabled={busy}
                              value={text(t.agentId)}
                              onChange={(e) =>
                                void command({
                                  action: 'assign',
                                  agentId: e.target.value || null,
                                  version: t.version,
                                })
                              }
                            >
                              <option value="">Unassigned</option>
                              {list(data.agents).map((a) => (
                                <option key={text(a.id)} value={text(a.id)}>
                                  {text(a.name)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <details>
                          <summary>Link verified CRM context</summary>
                          <form
                            className="office-form"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              await command({
                                action: 'link',
                                version: t.version,
                                leadId: f.get('leadId'),
                                ...(f.get('visitId')
                                  ? { visitId: f.get('visitId') }
                                  : {}),
                                ...(f.get('enquiryId')
                                  ? { enquiryId: f.get('enquiryId') }
                                  : {}),
                              });
                            }}
                          >
                            <label>
                              Existing lead ID
                              <input
                                name="leadId"
                                required
                                defaultValue={text(t.leadId)}
                              />
                            </label>
                            <label>
                              Visit ID (optional)
                              <input
                                name="visitId"
                                defaultValue={text(t.visitId)}
                              />
                            </label>
                            <label>
                              Enquiry ID (optional)
                              <input
                                name="enquiryId"
                                defaultValue={text(t.enquiryId)}
                              />
                            </label>
                            <small>
                              Only exact phone matches and permitted records can
                              be linked.
                            </small>
                            <button disabled={busy}>Verify and link</button>
                          </form>
                        </details>
                        <details>
                          <summary>Record consent</summary>
                          <form
                            className="office-form"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              await command({
                                action: 'consent',
                                version: t.version,
                                consent: f.get('consent'),
                                evidence: f.get('evidence'),
                              });
                            }}
                          >
                            <label>
                              Customer choice
                              <select name="consent">
                                <option value="OPTED_OUT">Opted out</option>
                                <option value="OPTED_IN">Opted in</option>
                              </select>
                            </label>
                            <label>
                              Consent evidence
                              <textarea
                                name="evidence"
                                required
                                maxLength={2000}
                              />
                            </label>
                            <button disabled={busy}>
                              Record customer consent
                            </button>
                          </form>
                        </details>
                      </>
                    )}
                  </section>
                  {write && (
                    <section className="office-panel">
                      <p className="office-eyebrow">
                        ASSISTANCE, WITH OVERSIGHT
                      </p>
                      <h2>A thoughtful next step.</h2>
                      <p>
                        Gemini uses public catalogue tools. Private notes and
                        customer accounts are never passed to the model. Every
                        draft needs staff review and a separate send.
                      </p>
                      <button
                        disabled={busy || t.mode !== 'AI_ASSISTED'}
                        onClick={async () => {
                          const result = await command({ action: 'draft' });
                          if (result) editText(text(result.text));
                        }}
                      >
                        Prepare grounded AI draft
                      </button>
                      {!!t.aiDraft && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            setTemplate('');
                            editText(text(t.aiDraft));
                          }}
                        >
                          Use saved draft
                        </button>
                      )}
                      <label className="comm-label">
                        Prepare verified update
                        <select
                          defaultValue=""
                          disabled={busy}
                          onChange={async (e) => {
                            const kind = e.target.value;
                            if (!kind) return;
                            const result = await command({
                              action: 'prepare',
                              kind,
                            });
                            if (result) {
                              setTemplate('');
                              editText(text(result.text));
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">Choose an update</option>
                          {[
                            'PROPERTY_HANDOFF',
                            'VISIT_REQUEST_RECEIVED',
                            'VISIT_CONFIRMED',
                            'VISIT_RESCHEDULED',
                            'VISIT_CANCELLED',
                            'ENQUIRY_RECEIVED',
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                      {assign && (
                        <button
                          disabled={busy || !data.ready}
                          onClick={() => void command({}, 'templates')}
                        >
                          Refresh approved Meta templates
                        </button>
                      )}
                    </section>
                  )}
                  <section className="office-panel">
                    <p className="office-eyebrow">INTERNAL ACTIVITY</p>
                    <ol className="comm-audit">
                      {list(data.audits).map((a) => (
                        <li key={text(a.id)}>
                          {label(a.action)}
                          <small>{date(a.createdAt)}</small>
                        </li>
                      ))}
                    </ol>
                  </section>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
