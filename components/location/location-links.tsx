'use client';
import { useEffect, useRef, useState } from 'react';
import type { PublicLocation } from '@/lib/location/contracts';
export function LocationLinks({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicLocation | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    'idle',
  );
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  return (
    <details
      onToggle={async (e) => {
        if (!e.currentTarget.open || data || request.current) return;
        request.current = new AbortController();
        setState('loading');
        try {
          const response = await fetch(
            `/api/projects/${encodeURIComponent(slug)}/location/`,
            { signal: request.current.signal },
          );
          if (!response.ok) throw Error('Unavailable');
          setData(await response.json());
          setState('ready');
        } catch {
          if (!request.current.signal.aborted) setState('error');
        } finally {
          request.current = null;
        }
      }}
    >
      <summary style={{ minHeight: 44, paddingBlock: 12, cursor: 'pointer' }}>
        Open maps &amp; directions
      </summary>
      {state === 'loading' && <output>Loading public location…</output>}
      {state === 'error' && (
        <output>
          Location is temporarily unavailable. Please confirm the meeting point
          with your advisor.
        </output>
      )}
      {data && (
        <div>
          <p>{data.address || `${data.locality}, ${data.city}`}</p>
          <a
            style={{
              display: 'inline-flex',
              minHeight: 44,
              alignItems: 'center',
            }}
            href={data.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.verified
              ? 'Open Google Maps ↗'
              : 'Explore concept locality ↗'}
          </a>
          {data.directionsUrl && (
            <a
              style={{
                display: 'inline-flex',
                minHeight: 44,
                alignItems: 'center',
                marginLeft: 16,
              }}
              href={data.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions ↗
            </a>
          )}
          <p className="fine-print">
            {data.verified
              ? 'Use the staff-confirmed meeting point for your visit.'
              : 'Exact site directions await verification.'}{' '}
            A request is not a confirmed appointment.
          </p>
        </div>
      )}
    </details>
  );
}
