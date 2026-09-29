'use client';
import { useState } from 'react';
import {
  categories,
  locationEditSchema,
  type LocationEdit,
} from '@/lib/location/contracts';
import './editor.css';
import { CoordinateFields } from './coordinate-fields';
export function LocationEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: LocationEdit;
}) {
  const [value, setValue] = useState(initial),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="location-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const parsed = locationEditSchema.safeParse(value);
        if (!parsed.success) {
          setMessage(
            parsed.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join(' '),
          );
          return;
        }
        setBusy(true);
        setMessage('');
        try {
          const response = await fetch(`/api/admin/locations/${slug}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });
          const result = await response.json();
          if (!response.ok) throw Error(result.error || 'Unable to save.');
          const refreshed = await fetch(`/api/admin/locations/${slug}/`, {
            cache: 'no-store',
          });
          if (!refreshed.ok) {
            setMessage('Saved. Reload this page before making another edit.');
            return;
          }
          setValue((await refreshed.json()).edit);
          setMessage('Location saved. Changes recorded in the audit trail.');
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to save.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Only publish checked public location information. Existing concept
        distances remain illustrative. Verification expires after 180 days.
      </p>
      <fieldset disabled={busy}>
        <legend>Project location</legend>
        {(['address', 'label', 'source', 'narrative'] as const).map((key) => (
          <label key={key}>
            {key === 'source' ? 'Verification source / reference' : key}
            <textarea
              value={value[key] || ''}
              maxLength={
                key === 'narrative'
                  ? 1600
                  : key === 'source'
                    ? 500
                    : key === 'address'
                      ? 400
                      : 160
              }
              onChange={(e) =>
                setValue((v) => ({ ...v, [key]: e.target.value || null }))
              }
            />
          </label>
        ))}
        <CoordinateFields
          initial={initial.coordinates}
          onChange={(coordinates) => setValue((v) => ({ ...v, coordinates }))}
        />
        <label className="location-editor-check">
          <input
            type="checkbox"
            checked={value.verified}
            onChange={(e) =>
              setValue((v) => ({ ...v, verified: e.target.checked }))
            }
          />
          I verified this exact site, address and source.
        </label>
      </fieldset>
      {value.nearby.map((n, i) => {
        const update = (patch: Partial<LocationEdit['nearby'][number]>) =>
          setValue((v) => ({
            ...v,
            nearby: v.nearby.map((p, j) => (j === i ? { ...p, ...patch } : p)),
          }));
        return (
          <fieldset key={n.id || `new-${i}`} disabled={busy}>
            <legend>Nearby connection {i + 1}</legend>
            <label>
              Name
              <input
                value={n.name}
                maxLength={160}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={n.category}
                onChange={(e) =>
                  update({ category: e.target.value as typeof n.category })
                }
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="location-editor-pair">
              <label>
                Stored distance (km)
                <input
                  type="number"
                  min="0"
                  max="9999"
                  step="0.01"
                  value={n.distanceKm}
                  onChange={(e) =>
                    update({ distanceKm: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Estimated minutes
                <input
                  type="number"
                  min="1"
                  max="10080"
                  value={n.minutes ?? ''}
                  onChange={(e) =>
                    update({
                      minutes: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
            <CoordinateFields
              initial={n.coordinates}
              onChange={(coordinates) => update({ coordinates })}
            />
            <label>
              Source
              <input
                value={n.source || ''}
                maxLength={500}
                onChange={(e) => update({ source: e.target.value || null })}
              />
            </label>
            <label>
              Editorial note
              <textarea
                value={n.note || ''}
                maxLength={800}
                onChange={(e) => update({ note: e.target.value || null })}
              />
            </label>
            <label className="location-editor-check">
              <input
                type="checkbox"
                checked={n.illustrative}
                onChange={(e) => update({ illustrative: e.target.checked })}
              />
              Illustrative / unverified
            </label>
          </fieldset>
        );
      })}
      <button
        type="button"
        disabled={busy || value.nearby.length >= 30}
        onClick={() =>
          setValue((v) => ({
            ...v,
            nearby: [
              ...v.nearby,
              {
                name: '',
                category: 'PARK',
                coordinates: null,
                distanceKm: 0,
                minutes: null,
                illustrative: true,
                source: null,
                note: null,
              },
            ],
          }))
        }
      >
        Add nearby connection
      </button>
      <output>{message}</output>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save location & audit change'}
      </button>
    </form>
  );
}
