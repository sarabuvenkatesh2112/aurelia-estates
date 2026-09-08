'use client';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import type { Property } from '@/types/property';
import { formatPrice } from '@/lib/discovery';
import { useExperience } from '@/components/layout/experience-provider';
export function PropertyCard({
  property,
  index = 0,
}: {
  property: Property;
  index?: number;
}) {
  const { open } = useExperience();
  return (
    <article className="property-card">
      <button
        className="property-image"
        data-cursor="View"
        onClick={() => open({ kind: 'property', property })}
        aria-label={`View ${property.name}`}
      >
        <motion.div layoutId={`property-image-${property.id}`}>
          <Image
            src={property.image}
            alt={`${property.name} architectural concept photography`}
            fill
            sizes="(max-width: 700px) 90vw, 48vw"
          />
        </motion.div>
        <span className="property-status">{property.status}</span>
        <span className="property-index">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="image-arrow">
          <ArrowUpRight size={22} />
        </span>
      </button>
      <div className="property-location">
        {property.neighbourhood}, {property.city}
      </div>
      <div className="property-title-row">
        <h3>
          <button onClick={() => open({ kind: 'property', property })}>
            {property.name}
          </button>
        </h3>
        <span>
          {formatPrice(property.price)}
          <small>onwards</small>
        </span>
      </div>
      <div className="property-meta">
        <span>
          {property.bedrooms} BHK {property.type}
        </span>
        <span>{property.area.toLocaleString('en-IN')} sq.ft.</span>
        <button onClick={() => open({ kind: 'property', property })}>
          View residence <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}
