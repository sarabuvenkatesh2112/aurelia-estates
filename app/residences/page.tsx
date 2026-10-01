import { SaveSearch } from '@/components/account/save-controls';

import Link from 'next/link';
import { PlatformShell } from '@/components/platform/platform-shell';
import { SearchForm } from '@/components/platform/search-form';
import { CatalogCard } from '@/components/platform/catalog-card';
import {
  collectionFacets,
  searchCollection,
  homepageCollection,
} from '@/lib/services/projectService';
import { parseSearch } from '@/lib/validation/search';
export const dynamic = 'force-dynamic';
export const metadata = {
  alternates: { canonical: '/residences/' },
  title: 'The collection | Aurelia Estates',
  description:
    'Explore fictional Indian residences by location, budget, configuration and available inventory.',
};
export default async function Collection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : [])
      params.append(key, v);
  }
  const values = Object.fromEntries(params);
  values.amenities = params.getAll('amenities').join(',');
  const [facets, home] = await Promise.all([
    collectionFacets(),
    homepageCollection(),
  ]);
  const parsed = (() => {
    try {
      return { filters: parseSearch(params), error: '' };
    } catch {
      return {
        filters: null,
        error:
          'Some filters could not be read. Check prices, areas and dates, or reset your selection.',
      };
    }
  })();
  const result = parsed.filters ? await searchCollection(parsed.filters) : null;
  const pageLink = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    return `/residences?${next}`;
  };
  return (
    <PlatformShell properties={home.properties}>
      <main className="catalog-page">
        <div className="catalog-intro">
          <p className="eyebrow">THE AURELIA COLLECTION</p>
          <h1>
            A place that feels <em>like you.</em>
          </h1>
          <p>
            Individual addresses. Considered possibilities. Explore our
            fictional collection across India.
          </p>
        </div>
        <SearchForm key={params.toString()} facets={facets} values={values} />
        {parsed.filters && (
          <SaveSearch
            key={'saved-' + params.toString()}
            filters={parsed.filters}
          />
        )}
        {parsed.error ? (
          <p role="alert" className="catalog-empty">
            {parsed.error}
          </p>
        ) : (
          <>
            <div className="catalog-result-heading">
              <p>
                {result!.total} {result!.total === 1 ? 'project' : 'projects'}{' '}
                in your selection
              </p>
              <span>Prices and inventory are illustrative.</span>
            </div>
            {result!.properties.length ? (
              <div className="catalog-grid">
                {result!.properties.map((p) => (
                  <CatalogCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                <h2>No residences match this collection.</h2>
                <p>
                  A little more room in your search may reveal the right
                  address.
                </p>
                <Link
                  prefetch={false}
                  className="button dark"
                  href="/residences"
                >
                  Explore featured projects
                </Link>
                <Link
                  prefetch={false}
                  className="text-link"
                  href={(() => {
                    const p = new URLSearchParams(params);
                    p.delete('maxPrice');
                    p.delete('minPrice');
                    p.delete('page');
                    return `/residences?${p}`;
                  })()}
                >
                  Broaden price
                </Link>
              </div>
            )}
            <nav className="catalog-pagination" aria-label="Collection pages">
              {result!.page > 1 && (
                <Link prefetch={false} href={pageLink(result!.page - 1)}>
                  ← Previous
                </Link>
              )}
              <span>
                Page {result!.page} of {Math.max(1, result!.pages)}
              </span>
              {result!.page < result!.pages && (
                <Link prefetch={false} href={pageLink(result!.page + 1)}>
                  Next →
                </Link>
              )}
            </nav>
          </>
        )}
      </main>
    </PlatformShell>
  );
}
