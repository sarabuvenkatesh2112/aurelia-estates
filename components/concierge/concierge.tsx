'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUp,
  Square,
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  ChevronLeft,
} from 'lucide-react';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useExperience } from '@/components/layout/experience-provider';
import { useCustomer } from '@/components/account/customer-context';
import {
  safeText,
  savedFilters,
  type ChatMessage,
  type ToolReference,
  type ResidenceFact,
  type AiFilters,
} from '@/lib/ai/contracts';
import type { Property } from '@/types/property';
type Conversation = { id: string; title: string; updatedAt: string };
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
async function api(path = '', method = 'GET', body?: unknown) {
  const response = await fetch('/api/concierge/' + path, {
    method,
    cache: 'no-store',
    ...(body !== undefined
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(
      result.error || 'The concierge could not connect. Please try again.',
    );
  return result;
}
export default function Concierge() {
  const { user } = useCustomer();
  return <ConciergeSession key={user?.id || 'guest'} />;
}
function ConciergeSession() {
  const { open } = useExperience(),
    { user, refresh, favorites } = useCustomer(),
    pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]),
    [id, setId] = useState(''),
    [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState(''),
    [ready, setReady] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [status, setStatus] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false),
    [rename, setRename] = useState(''),
    [editing, setEditing] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(false),
    [preferences, setPreferences] = useState<AiFilters | null>(null);
  const [streamText, setStreamText] = useState(''),
    [refs, setRefs] = useState<ToolReference[]>([]),
    [actionBusy, setActionBusy] = useState(false),
    [notice, setNotice] = useState('');
  const abort = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null),
    sending = useRef(false),
    actionLock = useRef(false);
  const context = pathname.match(/^\/residences\/([a-z0-9-]+)/)?.[1] || null;
  async function listing() {
    const data = await api();
    setConversations(data.conversations);
    setReady(data.ready);
    return data;
  }
  async function load(next: string) {
    setLoading(true);
    setError('');
    try {
      const data = await api(next + '/');
      setId(next);
      setMessages(data.messages);
      setPreferences(data.preferences);
      setRename(data.title);
      setHistoryOpen(false);
      setDeleteConfirm(false);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    abort.current?.abort();
    api()
      .then(async (data) => {
        if (active) {
          setConversations(data.conversations);
          setReady(data.ready);
          const retained = sessionStorage.getItem('aurelia-conversation');
          if (user?.id && retained) {
            try {
              await api(retained + '/claim/', 'POST', {});
            } catch {
              /* Already owned or expired. The owned read below still enforces access. */
            }
            await load(retained);
            sessionStorage.removeItem('aurelia-conversation');
          }
        }
      })
      .catch(() => {
        if (active) setError('Conversations could not load. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [user?.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [messages.length, streamText, status]);
  async function send(text = prompt) {
    if (sending.current || !text.trim()) return;
    const parsed = safeText.safeParse(text);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    setStreamText('');
    setRefs([]);
    setNotice('');
    const controller = new AbortController();
    abort.current = controller;
    let current = id;
    try {
      if (!current) {
        const created = await api('', 'POST', {});
        current = created.id;
        setId(current);
      }
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'user', content: parsed.data },
      ]);
      setPrompt('');
      setStatus('Connecting to your concierge…');
      const response = await fetch(`/api/concierge/${current}/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: parsed.data, context }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw Error(data.error);
      }
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let pending = '',
        failed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === 'status') setStatus(event.text);
          if (event.type === 'text') {
            setStreamText(event.text);
            setStatus('');
          }
          if (event.type === 'references') setRefs(event.references);
          if (event.type === 'error') {
            failed = true;
            setError(event.text);
          }
        }
      }
      if (!failed) {
        await load(current);
        await listing();
      }
    } catch (e) {
      setError(
        controller.signal.aborted
          ? 'Response stopped. No request was submitted.'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      sending.current = false;
      setStatus('');
      setStreamText('');
      setRefs([]);
    }
  }
  async function action(
    message: ChatMessage,
    kind: string,
    unit?: ResidenceFact,
  ) {
    if (actionLock.current) return;
    actionLock.current = true;
    setActionBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api(id + '/actions/', 'POST', {
        messageId: message.id,
        action: kind,
        ...(unit ? { unitId: unit.id } : {}),
      });
      if (kind === 'visit' || kind === 'enquiry')
        open({
          kind: 'visit',
          property: result.property as Property,
          unitId: result.unitId,
          advisor: result.advisor,
        });
      else {
        setNotice(
          kind === 'save_search'
            ? 'Search saved to your account.'
            : kind === 'shortlist'
              ? 'Added to your shortlist.'
              : 'Removed from your shortlist.',
        );
        await refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      actionLock.current = false;
      setActionBusy(false);
    }
  }
  function card(
    unit: ResidenceFact,
    message: ChatMessage,
    interactive: boolean,
  ) {
    return (
      <article className="concierge-residence" key={unit.id}>
        <div className="concierge-card-top">
          <span>
            {unit.city} · {unit.locality}
          </span>
          <span>{unit.availability.replaceAll('_', ' ')}</span>
        </div>
        <h3>
          <Link
            href={'/residences/' + unit.slug + '/'}
            onClick={() => open(null)}
          >
            {unit.project} ↗
          </Link>
        </h3>
        <p>
          {unit.bhk} BHK · {unit.area.toLocaleString('en-IN')} sq ft ·{' '}
          {money(unit.price)}
        </p>
        <small>
          {unit.tower} · Floor {unit.floor} · Residence {unit.unit}
        </small>
        <p className="concierge-match">
          Exact catalogue match. Availability is rechecked before your request.
        </p>
        {interactive && (
          <div className="concierge-card-actions">
            <button
              disabled={actionBusy || busy}
              onClick={() => action(message, 'visit', unit)}
            >
              Review a visit
            </button>
            <button
              disabled={actionBusy || busy}
              onClick={() => action(message, 'enquiry', unit)}
            >
              Enquire
            </button>
            {user ? (
              <button
                disabled={actionBusy || busy}
                onClick={() =>
                  action(
                    message,
                    favorites.some((f) => f.projectId === unit.projectId)
                      ? 'remove_shortlist'
                      : 'shortlist',
                    unit,
                  )
                }
              >
                {favorites.some((f) => f.projectId === unit.projectId)
                  ? 'Remove shortlist'
                  : 'Shortlist project'}
              </button>
            ) : (
              <Link
                href={'/sign-in?returnTo=' + encodeURIComponent(pathname)}
                onClick={() => {
                  sessionStorage.setItem('aurelia-conversation', id);
                  open(null);
                }}
              >
                Sign in to shortlist
              </Link>
            )}
          </div>
        )}
      </article>
    );
  }
  function referenceView(
    references: ToolReference[],
    message: ChatMessage,
    interactive = true,
  ) {
    return references.map((ref, i) => (
      <div key={i}>
        {ref.kind === 'search_residences' && ref.facts?.length === 0 && (
          <p className="concierge-empty">
            No exact matches in the current collection. Your requirements have
            not been broadened.
          </p>
        )}
        {ref.kind === 'compare_units' && ref.facts && (
          <section
            className="concierge-comparison"
            aria-label="Residence comparison"
          >
            <table>
              <caption>Verified residence comparison</caption>
              <thead>
                <tr>
                  <th>Detail</th>
                  {ref.facts.map((f) => (
                    <th key={f.id}>
                      {f.project}
                      <br />
                      {f.unit}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  'bhk',
                  'area',
                  'price',
                  'availability',
                  'possession',
                  'amenities',
                ].map((key) => (
                  <tr key={key}>
                    <th>
                      {
                        (
                          {
                            bhk: 'BHK',
                            area: 'Area (sq ft)',
                            price: 'Price',
                            availability: 'Availability',
                            possession: 'Possession',
                            amenities: 'Project amenities',
                          } as Record<string, string>
                        )[key]
                      }
                    </th>
                    {ref.facts!.map((f) => (
                      <td key={f.id}>
                        {key === 'price'
                          ? money(f.price)
                          : key === 'amenities'
                            ? f.amenities.join(', ')
                            : String(
                                f[key as keyof ResidenceFact] ??
                                  'Not available',
                              )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {ref.facts?.map((unit) => card(unit, message, interactive))}
        {ref.filters && savedFilters(ref.filters) && interactive && user && (
          <button
            className="concierge-save"
            disabled={actionBusy || busy}
            onClick={() => action(message, 'save_search')}
          >
            Save these search preferences
          </button>
        )}
        {ref.kind === 'my_collection' && ref.details && (
          <div className="concierge-account-result">
            <p>
              Your account information is available below and in{' '}
              <Link href="/account/" onClick={() => open(null)}>
                My Account ↗
              </Link>
              .
            </p>
            {Array.isArray(ref.details.records) &&
              ref.details.records.length === 0 && (
                <p>No records in this section yet.</p>
              )}
            {Array.isArray(ref.details.records) &&
              ref.details.records.map(
                (record: Record<string, unknown>, index: number) => (
                  <p key={index}>
                    {(record.project as { name?: string })?.name ||
                      (typeof record.name === 'string'
                        ? record.name
                        : 'Saved record')}
                    {typeof record.reference === 'string'
                      ? ' · ' + record.reference
                      : ''}
                    {typeof record.status === 'string'
                      ? ' · ' + record.status
                      : ''}
                  </p>
                ),
              )}
          </div>
        )}
      </div>
    ));
  }
  return (
    <section className="concierge-shell">
      <header className="concierge-heading">
        <p className="eyebrow">AURELIA / PRIVATE CONCIERGE</p>
        <DialogTitle>Consider your next chapter.</DialogTitle>
        <DialogDescription>
          Discover residences, compare the details, and plan a visit.
        </DialogDescription>
      </header>
      <div className="concierge-toolbar">
        <button disabled={busy} onClick={() => setHistoryOpen(!historyOpen)}>
          <MessageSquare size={16} />
          Conversations
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            try {
              const c = await api('', 'POST', {});
              await load(c.id);
              await listing();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Plus size={16} />
          New
        </button>
        {id && (
          <>
            <button
              aria-label="Rename conversation"
              disabled={busy}
              onClick={() => setEditing(!editing)}
            >
              <Pencil size={16} />
            </button>
            <button
              aria-label="Delete conversation"
              disabled={busy}
              onClick={() => setDeleteConfirm(!deleteConfirm)}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
      {editing && (
        <form
          className="concierge-rename"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(id + '/', 'PATCH', { title: rename });
              setEditing(false);
              await listing();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <input
            aria-label="Conversation title"
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            maxLength={60}
            required
          />
          <button>Save title</button>
        </form>
      )}
      {deleteConfirm && (
        <div className="concierge-confirm">
          <p>Delete this conversation and its messages?</p>
          <button
            onClick={async () => {
              try {
                await api(id + '/', 'DELETE', {});
                setId('');
                setMessages([]);
                setPreferences(null);
                setDeleteConfirm(false);
                await listing();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Delete conversation
          </button>
          <button onClick={() => setDeleteConfirm(false)}>Keep it</button>
        </div>
      )}
      <div className="concierge-scroll" data-lenis-prevent>
        {historyOpen ? (
          <nav className="concierge-history" aria-label="Conversation history">
            <button onClick={() => setHistoryOpen(false)}>
              <ChevronLeft size={16} />
              Back to conversation
            </button>
            {conversations.length ? (
              conversations.map((c) => (
                <button key={c.id} onClick={() => load(c.id)}>
                  <span>{c.title}</span>
                  <small>{new Date(c.updatedAt).toLocaleDateString()}</small>
                </button>
              ))
            ) : (
              <p>Your conversations will appear here.</p>
            )}
          </nav>
        ) : (
          <>
            {loading && <output>Opening your concierge…</output>}
            {!messages.length && !loading && (
              <div className="concierge-welcome">
                <span className="concierge-monogram" aria-hidden>
                  A
                </span>
                <h3>A home, with your priorities in mind.</h3>
                <p>
                  Tell me where you would like to live, what matters to you, and
                  your budget.
                </p>
                <div className="concierge-prompts">
                  {[
                    'Find 3 BHK homes in Chennai under ₹2 crore',
                    'Compare residences in my budget',
                    'What amenities does this project offer?',
                    'Show my upcoming visits',
                  ].map((q) => (
                    <button
                      key={q}
                      disabled={busy || ready !== true}
                      onClick={() => send(q)}
                    >
                      {q} ↗
                    </button>
                  ))}
                </div>
              </div>
            )}
            {context && (
              <p className="concierge-context">
                Considering the project you are viewing
              </p>
            )}
            {preferences && (
              <div className="concierge-preferences">
                <span>Remembered preferences</span>
                <p>
                  {Object.entries(preferences)
                    .filter(([, v]) => v !== null && String(v) !== '')
                    .map(
                      ([k, v]) =>
                        `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
                    )
                    .join(' · ')}
                </p>
                <button
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await api(id + '/', 'PATCH', { clearPreferences: true });
                      setPreferences(null);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Clear preferences
                </button>
              </div>
            )}
            <div role="log" aria-label="Conversation" aria-relevant="additions">
              {messages.map((m) => (
                <div className={'concierge-message ' + m.role} key={m.id}>
                  <span>{m.role === 'user' ? 'YOU' : 'AURELIA'}</span>
                  <p>{m.content}</p>
                  {m.role === 'assistant' &&
                    referenceView(m.references || [], m)}
                </div>
              ))}
            </div>
            {busy && (
              <div className="concierge-message assistant">
                <span>AURELIA</span>
                <p>{streamText}</p>
                {referenceView(
                  refs,
                  { id: 'streaming', role: 'assistant', content: '' },
                  false,
                )}
                <output>{status || 'Writing your response…'}</output>
              </div>
            )}
            <div ref={bottom} />
          </>
        )}
      </div>
      {notice && <output className="concierge-notice">{notice}</output>}
      {error && (
        <p className="concierge-error" role="alert">
          {error}
        </p>
      )}
      {ready === false && (
        <p className="concierge-offline">
          The AI concierge is being prepared.{' '}
          <Link href="/residences/" onClick={() => open(null)}>
            Explore the collection ↗
          </Link>
        </p>
      )}
      <form
        className="concierge-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="concierge-message">
          Message Aurelia
        </label>
        <textarea
          id="concierge-message"
          rows={2}
          maxLength={2000}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Your city, budget, and idea of home…"
          disabled={busy || ready !== true}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop response"
            onClick={() => abort.current?.abort()}
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            disabled={ready !== true || loading || !prompt.trim()}
            aria-label="Send message"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </form>
      <p className="concierge-privacy">
        AI can make mistakes. Verify details on the residence page. Never share
        passwords or keys.{' '}
        {user
          ? 'Private to your account.'
          : 'Guest history stays in this browser.'}
      </p>
    </section>
  );
}
