'use client';
import Link from 'next/link';

import { useMotionPreference } from '@/components/animation/motion-preference';
import { navigateToSection } from '@/lib/scroll';
import { AnimatePresence, motion } from 'motion/react';
import { useResidenceJourney } from '@/hooks/use-residence-journey';
import { motionTokens } from '@/lib/motion/config';
import { useEffect, useRef, useState } from 'react';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PropertyCard } from '@/components/property/property-card';
import { useExperience } from '@/components/layout/experience-provider';
import { emitEvent } from '@/lib/events';
const emptyFilters = { city: '', type: '', bedrooms: '', price: '' };
import type { Property, PropertyFilters } from '@/types/property';
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="filter-field">
      <span id={`filter-${label.replaceAll(' ', '-')}`} className="eyebrow">
        {label}
      </span>
      <Select value={value} onValueChange={(v) => onChange(v || '')}>
        <SelectTrigger
          aria-labelledby={`filter-${label.replaceAll(' ', '-')}`}
          className="filter-select"
        >
          <SelectValue>
            {options.find((o) => o.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Residences() {
  const { properties } = useExperience();
  const [results, setResults] = useState<Property[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search(filters: PropertyFilters) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    const params = new URLSearchParams({ pageSize: '24' });
    if (filters.city) params.set('city', filters.city);
    if (filters.type) params.set('type', filters.type.toUpperCase());
    if (filters.bedrooms) params.set('bhk', filters.bedrooms);
    if (filters.price)
      params.set('maxPrice', String(Number(filters.price) * 1e7));
    try {
      const response = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.properties);
      setActive(filters);
      setSearched(true);
      setSearchInitiated(true);
      emitEvent('SEARCH_PERFORMED', {
        metadata: {
          resultCount: data.total,
          filterCount: Object.values(filters).filter(Boolean).length,
        },
      });
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  const [draft, setDraft] = useState<PropertyFilters>(emptyFilters);
  const [active, setActive] = useState<PropertyFilters>(emptyFilters);
  const [searched, setSearched] = useState(false);
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const journey = useResidenceJourney(section, rail, searched);
  const { reduced } = useMotionPreference();
  const [searchInitiated, setSearchInitiated] = useState(false);
  const featured = properties.filter((p) => p.featured).slice(0, 4);
  const display = searched ? results : featured;
  useEffect(() => {
    if (!searchInitiated) return;
    const frame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      navigateToSection('residences');
    });
    return () => cancelAnimationFrame(frame);
  }, [active, searched, searchInitiated]);
  const update = (key: keyof PropertyFilters) => (v: string) =>
    setDraft((prev) => ({ ...prev, [key]: v }));

  return (
    <>
      <section id="discovery" className="discovery section-pad">
        <div className="discovery-top">
          <p className="eyebrow">FIND YOUR PLACE</p>
          <span>A considered collection. A personal choice.</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search(draft);
          }}
        >
          <FilterSelect
            label="Location"
            value={draft.city}
            onChange={update('city')}
            options={[
              { value: '', label: 'All destinations' },
              ...[...new Set(properties.map((p) => p.city))].map((v) => ({
                value: v,
                label: v,
              })),
            ]}
          />
          <FilterSelect
            label="Property type"
            value={draft.type}
            onChange={update('type')}
            options={[
              { value: '', label: 'All residences' },
              ...['Apartment', 'Villa', 'Penthouse'].map((v) => ({
                value: v,
                label: v,
              })),
            ]}
          />
          <FilterSelect
            label="Bedrooms"
            value={draft.bedrooms}
            onChange={update('bedrooms')}
            options={[
              { value: '', label: 'Any configuration' },
              ...['3', '4', '5'].map((v) => ({ value: v, label: `${v} BHK` })),
            ]}
          />
          <FilterSelect
            label="Price range"
            value={draft.price}
            onChange={update('price')}
            options={[
              { value: '', label: 'No upper limit' },
              { value: '1.2', label: 'Up to ₹1.2 Cr' },
              { value: '3', label: 'Up to ₹3 Cr' },
              { value: '6', label: 'Up to ₹6 Cr' },
              { value: '10', label: 'Up to ₹10 Cr' },
            ]}
          />
          <button
            className="search-button"
            type="submit"
            disabled={pending}
            aria-label="Find a residence"
          >
            <Search size={18} />
            <span>{pending ? 'Finding residences?' : 'Find a residence'}</span>
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        <Link prefetch={false} className="text-link" href="/residences">
          Advanced search &amp; complete collection <ArrowRight size={16} />
        </Link>
      </section>
      <section
        id="residences"
        ref={section}
        className={`residences section-pad ${searched ? 'filtered' : ''}`}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / THE COLLECTION</p>
            <h2>
              Distinctive homes.
              <br />
              <em>Extraordinary possibilities.</em>
            </h2>
          </div>
          <div className="section-aside">
            <p>
              A collection of individual expressions,
              <br />
              united by an uncompromising point of view.
            </p>
            <button
              className="text-link"
              onClick={() => {
                setSearchInitiated(true);
                if (searched) {
                  setSearched(false);
                  setActive(emptyFilters);
                } else void search(emptyFilters);
                setDraft(emptyFilters);
              }}
            >
              {searched
                ? 'Back to selected residences'
                : `Explore all ${properties.length} residences`}{' '}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        {searched && (
          <output className="result-count">
            {results.length} {results.length === 1 ? 'residence' : 'residences'}{' '}
            in your selection{' '}
            <button
              onClick={() => {
                void search(emptyFilters);
                setDraft(emptyFilters);
              }}
            >
              Clear filters
            </button>
          </output>
        )}
        <div className="property-window">
          {searched ? (
            <motion.div
              className="filtered-grid"
              layout
              onLayoutAnimationComplete={() => ScrollTrigger.refresh()}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {display.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout="position"
                    initial={{
                      opacity: 0,
                      filter: reduced ? 'none' : 'blur(4px)',
                    }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{
                      opacity: 0,
                      transition: { duration: reduced ? 0 : 0.18 },
                    }}
                    transition={{
                      duration: reduced ? 0 : 0.45,
                      ease: motionTokens.curve,
                    }}
                  >
                    <PropertyCard property={p} index={i} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div
              className="property-rail"
              ref={rail}
              data-cursor="Drag"
              onFocusCapture={(event) => {
                const card = (event.target as HTMLElement).closest(
                  '.property-card',
                );
                if (
                  card &&
                  rail.current &&
                  event.target.matches(':focus-visible')
                )
                  journey.go(
                    Array.from(rail.current.children).indexOf(card),
                    true,
                  );
              }}
            >
              {display.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
          )}
        </div>
        {!display.length && (
          <div className="empty-results">
            <h3>A little more room to explore.</h3>
            <p>
              {properties.length
                ? 'No residences match these preferences. Adjust your search or clear the filters.'
                : 'The collection is temporarily unavailable. Please try again shortly.'}
            </p>
          </div>
        )}
        {!searched && (
          <div className="journey-readout">
            <span>
              {String(journey.active + 1).padStart(2, '0')}{' '}
              <small>/ {String(featured.length).padStart(2, '0')}</small>
            </span>
            <div className="journey-progress" aria-hidden="true">
              <span />
            </div>
            <nav aria-label="Residence journey">
              {featured.map((p, i) => (
                <button
                  key={p.id}
                  aria-label={`Go to residence ${i + 1}: ${p.name}`}
                  aria-current={journey.active === i ? 'step' : undefined}
                  onClick={() => journey.go(i)}
                >
                  0{i + 1}
                </button>
              ))}
            </nav>
          </div>
        )}
        <div className="collection-footer">
          <span>FICTIONAL RESIDENCES · ARCHITECTURAL MOOD IMAGERY</span>
          {!searched && (
            <div>
              <button
                aria-label="Previous residences"
                onClick={journey.previous}
                disabled={journey.active === 0}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                aria-label="Next residences"
                onClick={journey.next}
                disabled={journey.active === featured.length - 1}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
