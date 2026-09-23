'use client';
import Link from 'next/link';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { collectionFacets } from '@/lib/services/projectService';
import { emitEvent } from '@/lib/events';
type Facets = Awaited<ReturnType<typeof collectionFacets>>;
export function SearchForm({
  facets,
  values,
}: {
  facets: Facets;
  values: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="catalog-filters"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of data)
          if (typeof value === 'string' && value) params.append(key, value);
        emitEvent('FILTER_USED', {
          metadata: { filterCount: [...params].length },
        });
        startTransition(() => router.push(`/residences?${params}`));
      }}
    >
      <div className="search-primary">
        <label>
          Keyword
          <input
            name="keyword"
            placeholder="Project, address or character"
            defaultValue={values.keyword}
          />
        </label>
        <label>
          City
          <select name="city" defaultValue={values.city || ''}>
            <option value="">All destinations</option>
            {facets.cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          Configuration
          <select name="bhk" defaultValue={values.bhk || ''}>
            <option value="">Any BHK</option>
            {facets.bedrooms.map((b) => (
              <option key={b.value} value={b.value}>
                {b.value} BHK ({b.count})
              </option>
            ))}
          </select>
        </label>
        <button className="button dark" disabled={pending}>
          {pending ? 'Considering…' : 'Find residences'}
        </button>
      </div>
      <details
        className="advanced-filters"
        open={Boolean(
          Object.keys(values).some(
            (k) =>
              Boolean(values[k]) &&
              !['keyword', 'city', 'bhk', 'page', 'sort'].includes(k),
          ),
        )}
      >
        <summary>Refine your collection</summary>
        <div className="filter-grid">
          <label>
            Locality
            <input
              name="locality"
              list="localities"
              defaultValue={values.locality}
            />
            <datalist id="localities">
              {facets.localities.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            Property type
            <select name="type" defaultValue={values.type || ''}>
              <option value="">All residences</option>
              {['APARTMENT', 'VILLA', 'PENTHOUSE'].map((v) => (
                <option key={v} value={v}>
                  {v.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Developer
            <select name="developer" defaultValue={values.developer || ''}>
              <option value="">All developers</option>
              {facets.developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project status
            <select name="status" defaultValue={values.status || ''}>
              <option value="">Any stage</option>
              {[
                'PRE_LAUNCH',
                'NEW_LAUNCH',
                'UNDER_CONSTRUCTION',
                'READY_TO_MOVE',
                'SOLD_OUT',
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inventory
            <select
              name="availability"
              defaultValue={values.availability || ''}
            >
              <option value="">Released inventory</option>
              {[
                'AVAILABLE',
                'HOLD',
                'RESERVED',
                'BOOKED',
                'SOLD',
                'NOT_RELEASED',
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Possession by
            <input
              name="possessionBefore"
              type="date"
              defaultValue={values.possessionBefore}
            />
          </label>
          {(
            [
              ['minPrice', 'Minimum price (₹)'],
              ['maxPrice', 'Maximum price (₹)'],
              ['minArea', 'Minimum area (sq.ft.)'],
              ['maxArea', 'Maximum area (sq.ft.)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="0"
                step="1"
                name={key}
                defaultValue={values[key]}
                placeholder={
                  key.includes('Price') ? 'e.g. 12000000' : 'e.g. 1800'
                }
              />
            </label>
          ))}
        </div>
        <fieldset className="amenity-filters">
          <legend>Considered amenities</legend>
          {facets.amenities.map((a) => (
            <label key={a.slug}>
              <input
                type="checkbox"
                name="amenities"
                value={a.slug}
                defaultChecked={(values.amenities || '')
                  .split(',')
                  .includes(a.slug)}
              />
              {a.name}
            </label>
          ))}
        </fieldset>
      </details>
      <div className="filter-bottom">
        <label>
          Arrange by
          <select name="sort" defaultValue={values.sort || 'featured'}>
            {[
              ['featured', 'Featured'],
              ['newest', 'Newest'],
              ['price-asc', 'Price: low to high'],
              ['price-desc', 'Price: high to low'],
              ['area', 'Largest area'],
              ['possession', 'Possession date'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="text-link" disabled={pending}>
          Apply selection
        </button>
        <Link prefetch={false} className="text-link" href="/residences">
          Reset filters
        </Link>
      </div>
    </form>
  );
}
