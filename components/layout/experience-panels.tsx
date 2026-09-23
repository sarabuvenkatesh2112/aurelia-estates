'use client';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { motionTokens, propertyImageId } from '@/lib/motion/config';
import { ArrowUpRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContactForm } from '@/components/platform/contact-form';
import { useExperience } from '@/components/layout/experience-provider';
import { formatPrice } from '@/lib/format';
import type { Property } from '@/types/property';
const Assistant = dynamic(() => import('@/components/concierge/concierge'), {
  ssr: false,
  loading: () => (
    <div className="form-panel">
      <DialogTitle>Aurelia Concierge</DialogTitle>
        <DialogDescription>Opening your concierge…</DialogDescription>
    </div>
  ),
});
function PropertyDetail({ property }: { property: Property }) {
  const { open } = useExperience();
  return (
    <>
      <motion.div
        className="detail-image"
        layoutId={propertyImageId(property.id)}
        transition={motionTokens.spring}
      >
        <Image
          src={property.image}
          alt={`${property.name} concept architecture`}
          fill
          sizes="(max-width:700px) 95vw, 760px"
        />
      </motion.div>
      <div className="detail-copy">
        <p className="eyebrow">
          {property.neighbourhood}, {property.city} · {property.id}
        </p>
        <DialogTitle className="dialog-heading">{property.name}</DialogTitle>
        <DialogDescription>{property.description}</DialogDescription>
        <div className="detail-facts">
          <span>
            <small>STARTING FROM</small>
            {formatPrice(property.price)}
          </span>
          <span>
            <small>RESIDENCE</small>
            {property.bedrooms} BHK {property.type}
          </span>
          <span>
            <small>BUILT-UP AREA</small>
            {property.area.toLocaleString('en-IN')} sq.ft.
          </span>
        </div>
        <div className="detail-columns">
          <div>
            <h4>Considered amenities</h4>
            <ul>
              {property.amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>In the neighbourhood</h4>
            <ul>
              {property.landmarks.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="fine-print">
              Illustrative distances, not verified travel data.
            </p>
          </div>
        </div>
        <p>
          {property.status} · Possession: {property.possession}
        </p>
        <p className="fine-print">
          Concept developer: {property.developer}. Fictional listing and mood
          photography.
        </p>
        {property.slug && (
          <a className="text-link" href={`/residences/${property.slug}`}>
            Explore the full project, gallery &amp; inventory ?
          </a>
        )}
        <button
          className="button dark"
          onClick={() => open({ kind: 'visit', property })}
        >
          Schedule a private visit <ArrowUpRight size={18} />
        </button>
      </div>
    </>
  );
}
export function ExperiencePanels() {
  const { panel, isOpen, open, finishClose } = useExperience();
  return (
    <Dialog
      open={isOpen}
      onOpenChangeComplete={(value) => {
        if (!value) finishClose();
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen) open(null);
      }}
    >
      <DialogContent
        className={`experience-dialog ${panel?.kind === 'property' ? 'property-dialog' : panel?.kind === 'assistant' ? 'concierge-dialog' : ''}`}
        data-lenis-prevent
      >
        {panel?.kind === 'property' ? (
          <PropertyDetail property={panel.property} />
        ) : panel?.kind === 'visit' ? (
          <ContactForm
            key={`${panel.property?.id}-${panel.advisor}`}
            property={panel.property}
            advisor={panel.advisor}
            unitId={panel.unitId}
          />
        ) : panel?.kind === 'assistant' ? (
          <Assistant />
        ) : panel?.kind === 'info' ? (
          <div className="form-panel">
            <p className="eyebrow">AURELIA ESTATES / CONCEPT NOTES</p>
            <DialogTitle className="dialog-heading">{panel.title}</DialogTitle>
            <DialogDescription className="info-copy">
              {panel.text}
            </DialogDescription>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
