type EventKind =
  | 'PROJECT_VIEWED'
  | 'UNIT_VIEWED'
  | 'FILTER_USED'
  | 'SEARCH_PERFORMED'
  | 'SCHEDULE_VISIT_STARTED'
  | 'AI_ASSISTANT_OPENED';
// Anonymous events: no cookies, storage, fingerprint, IP, contact details or prompt text.
export function emitEvent(
  kind: EventKind,
  detail: {
    projectId?: string;
    unitId?: string;
    metadata?: { filterCount?: number; resultCount?: number };
  } = {},
) {
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventKey: crypto.randomUUID(), kind, ...detail }),
    keepalive: true,
  }).catch(() => {});
}
