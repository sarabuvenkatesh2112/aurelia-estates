'use client';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Send, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useExperience } from '@/components/layout/experience-provider';
import { properties } from '@/data/properties';
import { formatPrice, recommendProperties } from '@/lib/discovery';
import type { Property, Recommendation } from '@/types/property';
function PropertyDetail({ property }: { property: Property }) {
  const { open } = useExperience();
  return (
    <>
      <motion.div
        className="detail-image"
        layoutId={`property-image-${property.id}`}
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
function VisitForm({
  property,
  advisor,
}: {
  property?: Property;
  advisor?: boolean;
}) {
  const [complete, setComplete] = useState(false);
  const [residence, setResidence] = useState(property?.id || properties[0].id);
  const [date] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  return (
    <div className="form-panel">
      <p className="eyebrow">A PERSONAL INTRODUCTION</p>
      <DialogTitle className="dialog-heading">
        {complete
          ? 'A first step, thoughtfully made.'
          : advisor
            ? 'Let’s talk about home.'
            : 'Come a little closer.'}
      </DialogTitle>
      <DialogDescription>
        {complete
          ? 'Your demo request is complete. No appointment has been booked, and no details have been saved or sent.'
          : advisor
            ? 'Tell us a little about yourself. This is a local advisor-request preview.'
            : 'Choose a residence and a preferred day. This is a local visit-request preview.'}
      </DialogDescription>
      {complete ? (
        <div className="form-success">
          <Check size={42} />
          <p>Thank you for exploring Aurelia.</p>
          <button className="text-link" onClick={() => setComplete(false)}>
            Try another request <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <form
          className="visit-form"
          onSubmit={(e) => {
            e.preventDefault();
            setComplete(true);
          }}
        >
          <label>
            Full name
            <input
              name="name"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
          <div className="form-row">
            <label>
              Email address
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                required
                type="tel"
                autoComplete="tel"
                pattern="[+0-9 ]{10,18}"
                title="Enter a phone number with 10–18 characters"
                placeholder="+91"
              />
            </label>
          </div>
          <label htmlFor="visit-residence">
            Preferred residence
            <Select
              value={residence}
              onValueChange={(v) => setResidence(v || properties[0].id)}
            >
              <SelectTrigger
                id="visit-residence"
                className="form-select"
                aria-label="Preferred residence"
              >
                <SelectValue>
                  {properties.find((p) => p.id === residence)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            Preferred {advisor ? 'callback' : 'visit'} date
            <input name="date" required type="date" min={date} />
          </label>
          <p className="fine-print">
            Demo only. These details stay in page memory and are cleared when
            this panel closes.
          </p>
          <button type="submit" className="button dark">
            Preview {advisor ? 'advisor' : 'visit'} request{' '}
            <ArrowUpRight size={17} />
          </button>
        </form>
      )}
    </div>
  );
}
function Assistant() {
  const { open } = useExperience();
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState<Recommendation | null>(null);
  const [asked, setAsked] = useState('');
  const [pending, setPending] = useState(false);
  async function ask(value: string) {
    if (!value.trim() || pending) return;
    setPending(true);
    setAsked(value);
    setPrompt('');
    const result = recommendProperties(value);
    await new Promise((r) => setTimeout(r, 450));
    setAnswer(result);
    setPending(false);
  }
  return (
    <div className="assistant-panel">
      <div className="assistant-heading">
        <Sparkles size={25} />
        <span>
          AURELIA AI<small>LOCAL COLLECTION GUIDE</small>
        </span>
      </div>
      <DialogTitle className="dialog-heading">
        Let’s find your place.
      </DialogTitle>
      <DialogDescription>
        A scripted frontend preview, powered by our sample collection. No AI
        service is connected.
      </DialogDescription>
      <div className="conversation" aria-live="polite">
        {!asked ? (
          <>
            <p>
              Tell me about the space, the city and the budget you have in mind.
            </p>
            <button
              className="suggestion"
              onClick={() =>
                ask('Show 3 BHK properties under ₹1.2 Cr in Visakhapatnam')
              }
            >
              3 BHK in Visakhapatnam under ₹1.2 Cr <ArrowUpRight size={16} />
            </button>
            <button
              className="suggestion"
              onClick={() => ask('Show villas in Goa')}
            >
              A private villa in Goa <ArrowUpRight size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="user-message">{asked}</div>
            {pending ? (
              <p className="assistant-thinking">Considering the collection…</p>
            ) : (
              answer && (
                <>
                  <p>{answer.message}</p>
                  {answer.properties.map((p) => (
                    <button
                      className="recommendation"
                      key={p.id}
                      onClick={() => open({ kind: 'property', property: p })}
                    >
                      <Image
                        src={p.image}
                        alt={`${p.name} mood image`}
                        width={100}
                        height={84}
                      />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.city} · {p.bedrooms} BHK
                        </small>
                        {formatPrice(p.price)}
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </>
              )
            )}
          </>
        )}
      </div>
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(prompt);
        }}
      >
        <label htmlFor="assistant-prompt" className="sr-only">
          Your property preferences
        </label>
        <input
          id="assistant-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="City, BHK, budget…"
          maxLength={400}
          required
        />
        <button
          disabled={pending || !prompt.trim()}
          aria-label="Send preferences"
        >
          <Send size={18} />
        </button>
      </form>
      <p className="fine-print">
        Try: city + 3 BHK + under ₹1.2 Cr. No messages are stored.
      </p>
    </div>
  );
}
export function ExperiencePanels() {
  const { panel, open } = useExperience();
  return (
    <Dialog
      open={panel !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) open(null);
      }}
    >
      <DialogContent
        className={`experience-dialog ${panel?.kind === 'property' ? 'property-dialog' : ''}`}
        data-lenis-prevent
      >
        {panel?.kind === 'property' ? (
          <PropertyDetail property={panel.property} />
        ) : panel?.kind === 'visit' ? (
          <VisitForm
            key={`${panel.property?.id}-${panel.advisor}`}
            property={panel.property}
            advisor={panel.advisor}
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
