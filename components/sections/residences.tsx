'use client';
import { preferredScrollBehavior } from '@/lib/scroll';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
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
import { properties } from '@/data/properties';
import { emptyFilters, filterProperties } from '@/lib/discovery';
import type { PropertyFilters } from '@/types/property';
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
  const [draft, setDraft] = useState<PropertyFilters>(emptyFilters);
  const [active, setActive] = useState<PropertyFilters>(emptyFilters);
  const [searched, setSearched] = useState(false);
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const results = filterProperties(active);
  const display = searched ? results : properties.slice(0, 4);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add(
      '(min-width: 1000px) and (prefers-reduced-motion: no-preference)',
      () => {
        if (searched || !rail.current || !section.current) return;
        const ctx = gsap.context(() => {
          const distance = () =>
            Math.max(0, rail.current!.scrollWidth - rail.current!.clientWidth);
          const tween = gsap.to(rail.current, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: section.current,
              start: 'top top+=70',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
          trigger.current = tween.scrollTrigger || null;
        }, section);
        return () => {
          ctx.revert();
          trigger.current = null;
        };
      },
    );
    return () => mm.revert();
  }, [searched]);
  const update = (key: keyof PropertyFilters) => (v: string) =>
    setDraft((prev) => ({ ...prev, [key]: v }));
  const navigate = (direction: number) => {
    const st = trigger.current;
    if (st) {
      window.scrollTo({
        top: Math.min(
          st.end,
          Math.max(
            st.start,
            window.scrollY + direction * window.innerWidth * 0.5,
          ),
        ),
        behavior: preferredScrollBehavior(),
      });
    } else {
      rail.current?.scrollBy({
        left: direction * 360,
        behavior: preferredScrollBehavior(),
      });
    }
  };
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
            setActive(draft);
            setSearched(true);
            setTimeout(
              () =>
                document
                  .getElementById('residences')
                  ?.scrollIntoView({ behavior: preferredScrollBehavior() }),
              50,
            );
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
            aria-label="Find a residence"
          >
            <Search size={18} />
            <span>Find a residence</span>
          </button>
        </form>
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
                setSearched(!searched);
                setActive(emptyFilters);
                setDraft(emptyFilters);
              }}
            >
              {searched
                ? 'Back to selected residences'
                : 'Explore all 8 residences'}{' '}
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
                setActive(emptyFilters);
                setDraft(emptyFilters);
              }}
            >
              Clear filters
            </button>
          </output>
        )}
        <div className="property-window">
          <div
            className="property-rail"
            ref={rail}
            onFocusCapture={(event) => {
              const card = (event.target as HTMLElement).closest<HTMLElement>(
                '.property-card',
              );
              const st = trigger.current;
              if (
                card &&
                rail.current &&
                st &&
                event.target.matches(':focus-visible')
              ) {
                const index = Array.from(rail.current.children).indexOf(card);
                window.scrollTo({
                  top: Math.min(
                    st.end,
                    st.start + index * (card.offsetWidth + 32),
                  ),
                  behavior: 'instant',
                });
              }
            }}
          >
            {display.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        </div>
        {!display.length && (
          <div className="empty-results">
            <h3>A little more room to explore.</h3>
            <p>
              No residences match these preferences. Adjust your search or clear
              the filters.
            </p>
          </div>
        )}
        <div className="collection-footer">
          <span>FICTIONAL RESIDENCES · ARCHITECTURAL MOOD IMAGERY</span>
          {!searched && (
            <div>
              <button
                aria-label="Previous residences"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={18} />
              </button>
              <button aria-label="Next residences" onClick={() => navigate(1)}>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
