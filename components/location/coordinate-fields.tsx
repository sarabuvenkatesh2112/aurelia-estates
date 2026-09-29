'use client';
import { useState } from 'react';
import type { Coordinates } from '@/lib/location/contracts';
export function CoordinateFields({
  initial,
  onChange,
}: {
  initial: Coordinates | null;
  onChange: (value: Coordinates | null) => void;
}) {
  const [raw, setRaw] = useState({
    lat: initial?.lat.toString() || '',
    lng: initial?.lng.toString() || '',
  });
  return (
    <div className="location-editor-pair">
      {(['lat', 'lng'] as const).map((key) => (
        <label key={key}>
          {key === 'lat' ? 'Latitude' : 'Longitude'}
          <input
            type="number"
            step="0.0000001"
            min={key === 'lat' ? -90 : -180}
            max={key === 'lat' ? 90 : 180}
            value={raw[key]}
            onChange={(e) => {
              const next = { ...raw, [key]: e.target.value };
              setRaw(next);
              // A partially entered pair must fail validation, never silently use zero.
              onChange(
                next.lat === '' && next.lng === ''
                  ? null
                  : {
                      lat: next.lat === '' ? NaN : Number(next.lat),
                      lng: next.lng === '' ? NaN : Number(next.lng),
                    },
              );
            }}
          />
        </label>
      ))}
    </div>
  );
}
