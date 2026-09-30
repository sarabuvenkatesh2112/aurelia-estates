'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocation } from '@/lib/location/contracts';
import { mountLocationMap, type MapHandle } from '@/lib/location/browser-map';
import './location.css';

export function ProjectLocation({ location: p }: { location: PublicLocation }) {
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState('ALL');
  const [route, setRoute] = useState<Record<string, string>>({});
  const canvas = useRef<HTMLDivElement>(null);
  const map = useRef<MapHandle | null>(null);
  const requests = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const pending = requests.current;
    return () => {
      pending.forEach((c) => c.abort());
      pending.clear();
    };
  }, []);
  useEffect(() => {
    if (!requested || !canvas.current) return;
    const exact = p.verified && p.coordinates;
    const cleanup = mountLocationMap(
      canvas.current,
      {
        // Regional overview is not a project coordinate or a distance claim.
        center: exact || { lat: 22, lng: 79 },
        zoom: exact ? 13 : 3.5,
        points: exact
          ? [
              { id: null, name: p.label, coordinates: exact },
              ...p.nearby.flatMap((n) =>
                !n.illustrative && n.coordinates
                  ? [{ id: n.id, name: n.name, coordinates: n.coordinates }]
                  : [],
              ),
            ]
          : [],
        select: setSelected,
      },
      (instance) => {
        map.current = instance;
        setStatus('ready');
      },
      () => {
        map.current = null;
        setStatus('error');
      },
    );
    return () => {
      cleanup();
      map.current = null;
    };
  }, [requested, p]);
  async function estimate(id: string) {
    if (requests.current.has(id)) return;
    const controller = new AbortController();
    requests.current.set(id, controller);
    setRoute((r) => ({ ...r, [id]: 'Checking driving route…' }));
    try {
      const response = await fetch(
        `/api/projects/${p.slug}/location/route-estimate/?nearby=${id}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      const text =
        response.ok && data.status === 'available'
          ? `${data.distanceKm} km · approximately ${data.minutes} min driving. openrouteservice / OpenStreetMap, checked ${new Date(data.checkedAt).toLocaleTimeString()}. Traffic not included.`
          : 'Live route unavailable. Stored context remains below; use the external maps link for your journey.';
      setRoute((r) => ({ ...r, [id]: text }));
    } catch {
      if (!controller.signal.aborted)
        setRoute((r) => ({
          ...r,
          [id]: 'Live route unavailable. Please try again later.',
        }));
    } finally {
      requests.current.delete(id);
    }
  }
  const visible = p.nearby.filter(
    (n) => category === 'ALL' || n.category === category,
  );
  return (
    <section
      className="location-experience"
      id="location"
      aria-labelledby="location-title"
    >
      <div className="location-heading">
        <div>
          <p className="eyebrow">A SENSE OF PLACE</p>
          <h2 id="location-title">
            Connected to <em>your world.</em>
          </h2>
        </div>
        <p>
          {p.locality}
          <br />
          {p.city}, {p.state} {p.postalCode}
        </p>
      </div>
      <div className="location-layout">
        <div className="location-context">
          <h3>{p.label}</h3>
          <p>{p.address || `${p.locality}, ${p.city}`}</p>
          <p>
            {p.narrative ||
              `Explore the setting around ${p.locality}. Aurelia is a fictional collection; precise site details require confirmation with your advisor.`}
          </p>
          <p className="location-provenance">
            {p.verified
              ? `Stored location checked ${p.verifiedAt?.slice(0, 10)}. Source: ${p.source}`
              : 'Concept locality only. An exact project pin and site directions are not yet verified.'}
          </p>
          <div className="location-actions">
            <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer">
              {p.verified
                ? 'Open Google Maps ↗'
                : 'Explore locality on Google Maps ↗'}
            </a>
            {p.directionsUrl && (
              <a
                href={p.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions ↗
              </a>
            )}
            <Link
              href={`/residences/?${new URLSearchParams({ city: p.city, locality: p.locality })}`}
            >
              Homes in this locality ↗
            </Link>
          </div>
        </div>
        <div className="location-map-shell">
          <div
            ref={canvas}
            className="location-map"
            style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
            aria-hidden={status !== 'ready'}
            aria-label={`Street map for ${p.label}`}
          />
          {status !== 'ready' && (
            <div className="location-map-fallback">
              <span className="location-compass" aria-hidden="true">
                N<br />⌖
              </span>
              <span className="eyebrow">{p.city}</span>
              <h3>{p.locality}</h3>
              <output>
                {status === 'loading'
                  ? 'Opening the neighbourhood…'
                  : status === 'error'
                    ? 'The map could not be loaded. Location details and Google Maps links remain available.'
                    : !p.verified
                      ? 'Explore a regional overview. The exact site is unverified; no project marker is shown.'
                      : 'Explore this address and its surroundings.'}
              </output>
              {status === 'idle' && (
                <button
                  onClick={() => {
                    setStatus('loading');
                    setRequested(true);
                  }}
                >
                  Load interactive map
                </button>
              )}
            </div>
          )}
          {status === 'ready' && (
            <button
              className="location-reset"
              onClick={() => {
                map.current?.setCenter(
                  p.verified && p.coordinates
                    ? p.coordinates
                    : { lat: 22, lng: 79 },
                );
                map.current?.setZoom(p.verified && p.coordinates ? 13 : 3.5);
                setSelected(null);
              }}
            >
              {p.verified ? 'Return to project' : 'Regional overview'}
            </button>
          )}
        </div>
      </div>
      <div className="location-nearby-heading">
        <h3>The neighbourhood, considered.</h3>
        <label>
          Explore nearby
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">All connections</option>
            {[...new Set(p.nearby.map((n) => n.category))].map((c) => (
              <option key={c} value={c}>
                {c.replaceAll('_', ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="location-nearby-grid">
        {visible.map((n) => (
          <article
            key={n.id}
            className={selected === n.id ? 'is-selected' : ''}
          >
            <p className="eyebrow">{n.category.replaceAll('_', ' ')}</p>
            <h4>{n.name}</h4>
            <p>
              {n.illustrative
                ? 'Illustrative connection · distance and travel time not verified.'
                : `${n.distanceKm} km${n.minutes ? ` · approx. ${n.minutes} min` : ''} · stored editorial estimate`}
            </p>
            {n.note && <p>{n.note}</p>}
            {!n.illustrative && (
              <small>
                Source: {n.source} · checked {n.verifiedAt?.slice(0, 10)}.
                Conditions may change.
              </small>
            )}
            {n.routeEligible && (
              <div className="location-actions">
                {status === 'ready' && (
                  <button
                    onClick={() => {
                      if (n.coordinates) map.current?.setCenter(n.coordinates);
                      map.current?.setZoom(14);
                      setSelected(n.id);
                    }}
                  >
                    Show on map
                  </button>
                )}
                <button
                  onClick={() => void estimate(n.id)}
                  disabled={route[n.id]?.startsWith('Checking driving route')}
                >
                  Check driving route
                </button>
              </div>
            )}
            {route[n.id] && <output>{route[n.id]}</output>}
          </article>
        ))}
      </div>
      {!visible.length && (
        <p>Verified neighbourhood information will follow.</p>
      )}
      <p className="location-provenance">
        Fictional property collection. Editorial context is separate from live
        provider routing. Visit dates remain requests until staff confirmation.
      </p>
    </section>
  );
}
