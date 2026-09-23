import { SaveResidence } from '@/components/account/save-controls';
import Link from 'next/link';
import Image from 'next/image';
import type { Property } from '@/types/property';
import { formatPrice } from '@/lib/format';
export function CatalogCard({ property: p }: { property: Property }) {
  return (
    <article className="catalog-card">
      <Link
        prefetch={false}
        className="catalog-image"
        href={`/residences/${p.slug}`}
      >
        <Image
          src={p.image}
          alt={`${p.name} architectural mood photography`}
          fill
          sizes="(max-width:767px) 90vw, (max-width:1100px) 45vw, 30vw"
        />
        <span>{p.availability}</span>
      </Link>
      <p className="eyebrow">
        {p.neighbourhood} / {p.city}
      </p>
      <h2>
        <Link prefetch={false} href={`/residences/${p.slug}`}>
          {p.name}
        </Link>
      </h2>
      <div className="catalog-facts">
        <span>
          {formatPrice(p.price)} <small>onwards</small>
        </span>
        <span>
          {(p.minArea || p.area).toLocaleString('en-IN')}–
          {(p.maxArea || p.area).toLocaleString('en-IN')} sq.ft.
        </span>
      </div>
      <p>
        {p.type} · {p.status}
      </p>
      <Link
        prefetch={false}
        className="text-link"
        href={`/residences/${p.slug}`}
      >
        Discover this address ↗
      </Link>
      <SaveResidence projectId={p.id} />
    </article>
  );
}
