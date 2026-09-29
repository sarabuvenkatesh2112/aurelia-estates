'use client';
import Link from 'next/link';

import { SaveResidence } from '@/components/account/save-controls';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useExperience } from '@/components/layout/experience-provider';
import { useMotionPreference } from '@/components/animation/motion-preference';
import { MagneticButton } from '@/components/animation/magnetic-button';
import { CatalogCard } from './catalog-card';
import { emitEvent } from '@/lib/events';
import { formatPrice, formatRupees } from '@/lib/format';
import type { ProjectDetail } from '@/lib/services/projectService';
import { ProjectLocation } from '@/components/location/project-location';
export function ProjectExperience({
  detail: d,
  whatsAppHref,
}: {
  detail: ProjectDetail;
  whatsAppHref?: string | null;
}) {
  const { open } = useExperience();
  const { reduced } = useMotionPreference();
  const viewed = useRef(false);
  const p = d.property;
  const photos = d.media.filter((m) =>
    ['HERO', 'GALLERY', 'EXTERIOR', 'INTERIOR', 'AMENITY'].includes(m.type),
  );
  const [photo, setPhoto] = useState(0);
  const selectedPhoto = photos[photo] || {
    url: p.image,
    alt: 'Architectural mood reference; project gallery not yet available',
  };
  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      emitEvent('PROJECT_VIEWED', { projectId: p.id });
    }
  }, [p.id]);
  return (
    <main className="project-page">
      <section className="project-hero">
        <motion.div
          className="project-hero-image"
          initial={
            reduced ? false : { clipPath: 'inset(12% 6% 12% 6%)', opacity: 0.4 }
          }
          animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={p.image}
            alt={`${p.name} architectural mood photography`}
            fill
            sizes="100vw"
            priority
          />
        </motion.div>
        <div className="project-hero-copy">
          <p className="eyebrow">
            {p.neighbourhood} / {p.city}
          </p>
          <h1>{p.name}</h1>
          <p>
            {p.type} · {p.status}
          </p>
        </div>
        <span className="project-image-note">
          FICTIONAL PROJECT · ARCHITECTURAL MOOD PHOTOGRAPHY
        </span>
      </section>
      <section className="project-overview">
        <div>
          <p className="eyebrow">AN INDIVIDUAL EXPRESSION</p>
          <h2>
            Considered in <em>every detail.</em>
          </h2>
          <p>{d.description}</p>
          <p className="fine-print">Fictional developer: {p.developer}</p>
          {whatsAppHref && (
            <a
              className="text-link"
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask about this residence on WhatsApp ↗
            </a>
          )}
        </div>
        <div className="project-key-facts">
          <dl>
            <div>
              <dt>Price range</dt>
              <dd>
                {p.price
                  ? `${formatPrice(p.price)} – ${formatPrice(p.maxPrice || p.price)}`
                  : 'Price on request'}
              </dd>
            </div>
            <div>
              <dt>Built-up area</dt>
              <dd>
                {p.area.toLocaleString('en-IN')}–
                {p.maxArea?.toLocaleString('en-IN')} sq.ft.
              </dd>
            </div>
            <div>
              <dt>Possession</dt>
              <dd>{p.possession}</dd>
            </div>
            <div>
              <dt>Inventory</dt>
              <dd>
                {d.available
                  ? `${d.available} available units`
                  : 'No available units'}
              </dd>
            </div>
          </dl>
          <MagneticButton
            className="dark"
            onClick={() => open({ kind: 'visit', property: p })}
          >
            Request a private visit ↗
          </MagneticButton>
          <button
            className="text-link"
            onClick={() => open({ kind: 'visit', property: p, advisor: true })}
          >
            Make an enquiry ↗
          </button>
          <Link
            prefetch={false}
            className="text-link"
            href={`/api/projects/${p.slug}/brochure`}
          >
            Download collection brochure ↓
          </Link>
          <SaveResidence projectId={p.id} />
        </div>
      </section>
      <section className="project-gallery">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE SPACES BETWEEN</p>
            <h2>
              A sense of <em>belonging.</em>
            </h2>
          </div>
          <p>Illustrative mood studies.</p>
        </div>
        <div className="gallery-main">
          <motion.div
            key={photo}
            initial={reduced ? false : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.alt}
              fill
              sizes="90vw"
            />
          </motion.div>
        </div>
        <div
          className="gallery-thumbs"

          aria-label="Project gallery"
        >
          {photos.map((m, i) => (
            <button
              key={m.id}
              aria-label={`Gallery image ${i + 1}: ${m.alt}`}
              aria-pressed={i === photo}
              onClick={() => setPhoto(i)}
            >
              <Image src={m.url} alt="" width={160} height={100} />
            </button>
          ))}
        </div>
      </section>
      <section className="project-configurations">
        <p className="eyebrow">ROOM TO MAKE IT YOURS</p>
        <h2>
          Ways of <em>living.</em>
        </h2>
        <div className="configuration-grid">
          {d.configurations.map((c) => (
            <article key={c.id}>
              <h3>{c.name}</h3>
              <p>{c.area} sq.ft.</p>
              {c.plan && (
                <Link
                  prefetch={false}
                  href={c.plan}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    src={c.plan}
                    alt="Illustrative space diagram, not a measured floor plan"
                    width={600}
                    height={390}
                    unoptimized
                  />
                  <span className="text-link">Open concept layout ↗</span>
                </Link>
              )}
              <p className="fine-print">
                Schematic only. Not an approved, measured or construction floor
                plan.
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="project-inventory" id="inventory">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR PLACE IN THE COLLECTION</p>
            <h2>
              Explore the <em>residences.</em>
            </h2>
          </div>
          <p>
            {d.inventoryTotal} individual units · Current fictional inventory
          </p>
        </div>
        <section className="inventory-scroll" aria-label="Unit inventory">
          <table>
            <thead>
              <tr>
                {[
                  'Residence',
                  'Configuration',
                  'Area / carpet',
                  'Price',
                  'Availability',
                  '',
                ].map((h, i) => (
                  <th key={i} scope="col">
                    {h || 'Action'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.units.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.number}</strong>
                    <small>
                      {u.tower} · {u.floor} · {u.orientation}
                    </small>
                  </td>
                  <td>{u.configuration}</td>
                  <td>
                    {u.area.toLocaleString('en-IN')} /{' '}
                    {u.carpetArea.toLocaleString('en-IN')} sq.ft.
                  </td>
                  <td>{formatRupees(u.price)}</td>
                  <td>{u.availability.replaceAll('_', ' ').toLowerCase()}</td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {
                        emitEvent('UNIT_VIEWED', {
                          projectId: p.id,
                          unitId: u.id,
                        });
                        open({
                          kind: 'visit',
                          property: p,
                          unitId: u.id,
                          advisor: u.availability !== 'AVAILABLE',
                        });
                      }}
                    >
                      {u.availability === 'AVAILABLE'
                        ? 'Request visit'
                        : 'Enquire'}{' '}
                      ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {!d.units.length && (
          <p>No inventory has been released for this selection.</p>
        )}
        <nav className="catalog-pagination" aria-label="Inventory pages">
          {d.inventoryPage > 1 && (
            <Link
              prefetch={false}
              href={`?unitsPage=${d.inventoryPage - 1}#inventory`}
            >
              ← Previous
            </Link>
          )}
          <span>
            Page {d.inventoryPage} of{' '}
            {Math.max(1, Math.ceil(d.inventoryTotal / 12))}
          </span>
          {d.inventoryPage * 12 < d.inventoryTotal && (
            <Link
              prefetch={false}
              href={`?unitsPage=${d.inventoryPage + 1}#inventory`}
            >
              Next →
            </Link>
          )}
        </nav>
      </section>
      <section className="project-neighbourhood">
        <div>
          <p className="eyebrow">BEYOND YOUR FRONT DOOR</p>
          <h2>
            The everyday, <em>elevated.</em>
          </h2>
          <ul className="project-amenities">
            {p.amenities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <h3>Towers &amp; blocks</h3>
          {d.towers.map((t) => (
            <p key={t.id}>
              <strong>{t.name}</strong> · {t.totalFloors} levels
              <br />
              {t.description}
              <br />
              <small>Released floors: {t.floors.join(', ')}</small>
            </p>
          ))}
        </div>
      </section>
      {d.location && <ProjectLocation location={d.location} />}
      {d.related.length > 0 && (
        <section className="project-related">
          <p className="eyebrow">ANOTHER PERSPECTIVE</p>
          <h2>
            Further <em>possibilities.</em>
          </h2>
          <div className="catalog-grid">
            {d.related.map((r) => (
              <CatalogCard key={r.id} property={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
