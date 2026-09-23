'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { CinematicImage } from '@/components/animation/cinematic-image';
import { motionTokens } from '@/lib/motion/config';
import { useExperience } from '@/components/layout/experience-provider';
import { MagneticButton } from '@/components/animation/magnetic-button';
import { locations, testimonials } from '@/data/editorial';
export function Introduction() {
  return (
    <section id="about" className="introduction section-pad">
      <p className="eyebrow">
        NOT JUST AN ADDRESS.
        <br />A WAY OF LIFE.
      </p>
      <div>
        <h2>
          For those who see a home
          <br />
          as more than <em>a place.</em>
        </h2>
        <div className="intro-bottom">
          <span className="architectural-mark" aria-hidden="true">
            A
          </span>
          <p>
            We believe the finest homes are felt before they are understood. In
            the quality of light. The honesty of materials. The quiet confidence
            of a space that feels entirely yours.
          </p>
          <span className="eyebrow">THIS IS AURELIA.</span>
        </div>
      </div>
    </section>
  );
}
export function Developments() {
  const { open, properties } = useExperience();
  return (
    <section id="developments" className="developments section-pad">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / SIGNATURE ADDRESSES</p>
          <h2>
            Places with
            <br />
            <em>a point of view.</em>
          </h2>
        </div>
        <p className="section-aside">
          An individual character.
          <br />
          An unmistakable Aurelia sensibility.
        </p>
      </div>
      <div className="development-pair">
        {properties.slice(0, 2).map((p, i) => (
          <article key={p.id} className="development">
            <button
              data-cursor="Explore"
              className="development-image"
              onClick={() => open({ kind: 'property', property: p })}
            >
              <Image
                src={i ? '/images/pool.webp' : '/images/exterior.webp'}
                alt={`${p.name} concept exterior`}
                fill
                sizes="(max-width: 700px) 90vw, 50vw"
              />
              <span>0{i + 1}</span>
              <ArrowUpRight />
            </button>
            <div className="development-caption">
              <p className="eyebrow">
                {p.city} / {p.type.toUpperCase()} COLLECTION
              </p>
              <h3>
                <button
                  data-preview={i}
                  data-cursor="Explore"
                  onClick={() => open({ kind: 'property', property: p })}
                >
                  {p.name}
                </button>
              </h3>
              <p>
                {i
                  ? 'Sunlit spaces. A slower kind of luxury.'
                  : 'Rooted in nature. Composed for living.'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function Statistics() {
  const root = useRef<HTMLElement>(null);
  useMotionScene(root, ({ reduced }) => {
    const nodes = Array.from(
      root.current?.querySelectorAll<HTMLElement>('[data-count]') || [],
    );
    if (reduced) {
      nodes.forEach(
        (node) =>
          (node.textContent = Number(node.dataset.count).toLocaleString(
            'en-IN',
          )),
      );
      return;
    }
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
    });
    nodes.forEach((node, i) => {
      const counter = { value: 0 };
      tl.to(
        counter,
        {
          value: Number(node.dataset.count),
          duration: 1.8 + i * 0.15,
          ease: 'power3.out',
          onUpdate: () => {
            node.textContent = Math.round(counter.value).toLocaleString(
              'en-IN',
            );
          },
        },
        i * 0.12,
      );
      tl.from(
        node.parentElement,
        { y: 22, opacity: 0.1, duration: 1, ease: motionTokens.ease.reveal },
        i * 0.12,
      );
    });
  });
  return (
    <section ref={root} className="statistics section-pad">
      <p className="eyebrow">
        A VISION, IN PERSPECTIVE <span>ILLUSTRATIVE DEMO-BRAND STATISTICS</span>
      </p>
      <div>
        {[
          [12, 'Luxury developments'],
          [850, 'Premium residences'],
          [18, 'Prime locations'],
          [2500, 'Crores in portfolio value'],
        ].map(([n, label]) => (
          <article key={label}>
            <strong>
              {Number(n) === 2500 && <small className="stat-currency">₹</small>}
              <span data-count={n}>{Number(n).toLocaleString('en-IN')}</span>
              <em>{Number(n) === 2500 ? 'Cr+' : '+'}</em>
            </strong>
            <p>{label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function Locations() {
  const { properties } = useExperience();
  const [selected, setSelected] = useState(0);
  return (
    <section id="locations" className="locations section-pad">
      <div className="location-editorial">
        <p className="eyebrow">03 / A SENSE OF BELONGING</p>
        <h2>
          The right place.
          <br />
          <em>Your own pace.</em>
        </h2>
        <p>
          From the energy of the city to the ease of the coast. Find a setting
          that feels like you.
        </p>
        <div
          className="location-list"
          role="tablist"
          aria-label="Explore destinations"
        >
          {locations.map((l, i) => (
            <button
              id={`location-tab-${i}`}
              role="tab"
              aria-selected={selected === i}
              tabIndex={selected === i ? 0 : -1}
              onKeyDown={(event) => {
                const directions: Record<string, number> = {
                  ArrowDown: 1,
                  ArrowRight: 1,
                  ArrowUp: -1,
                  ArrowLeft: -1,
                };
                const offset = directions[event.key];
                if (
                  offset !== undefined ||
                  event.key === 'Home' ||
                  event.key === 'End'
                ) {
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? locations.length - 1
                        : (i + offset + locations.length) % locations.length;
                  setSelected(next);
                  document.getElementById(`location-tab-${next}`)?.focus();
                }
              }}
              aria-controls="location-view"
              key={l.city}
              onClick={() => setSelected(i)}
              onFocus={() => setSelected(i)}
              onMouseEnter={() => setSelected(i)}
              className={selected === i ? 'active' : ''}
            >
              <small>0{i + 1}</small>
              {l.city}
              <ArrowUpRight size={20} />
            </button>
          ))}
        </div>
        <motion.div
          className="location-connectivity"
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: motionTokens.curve }}
        >
          <div>
            <strong>
              {String(
                properties.filter((p) => p.city === locations[selected].city)
                  .length,
              ).padStart(2, '0')}
            </strong>
            <span>RESIDENCES IN THE COLLECTION</span>
          </div>
          <p>
            {properties
              .find((p) => p.city === locations[selected].city)
              ?.landmarks.slice(0, 2)
              .join(' · ')}
          </p>
          <small>Illustrative connections and distances.</small>
        </motion.div>{' '}
      </div>
      <div
        className="location-visual"
        id="location-view"
        role="tabpanel"
        aria-labelledby={`location-tab-${selected}`}
      >
        <CinematicImage
          src={locations[selected].image}
          alt={`Architectural mood for ${locations[selected].city}`}
          sizes="(max-width: 700px) 100vw, 55vw"
        />
        <motion.div
          className="location-caption"
          key={selected}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: motionTokens.curve }}
        >
          <p>{locations[selected].caption}</p>
          <span>{locations[selected].area}</span>
          <small>CONCEPT DESTINATION STUDY · NO LIVE MAP</small>
        </motion.div>
      </div>
    </section>
  );
}
const amenityCopy = [
  [
    'Wellness, without an appointment.',
    'A quiet swim, a sunlit studio and room to breathe. Everyday rituals, thoughtfully accommodated.',
  ],
  [
    'A club that feels like your own.',
    'Intimate lounges and considered gathering spaces bring a sense of occasion to the everyday.',
  ],
  [
    'Nature, woven into your day.',
    'Shaded walks, private courtyards and layered gardens make the outdoors part of home.',
  ],
  [
    'A welcome, quietly anticipated.',
    'Thoughtful concierge spaces create a warm arrival and a natural place to ask for a little assistance.',
  ],
  [
    'Room for one more lap.',
    'An open sky, still water and generous poolside terraces invite a moment away from the pace of the city.',
  ],
  [
    'A little energy, every day.',
    'Flexible fitness spaces and outdoor movement areas make a daily practice feel entirely your own.',
  ],
];
export function Lifestyle() {
  const [active, setActive] = useState(0);
  return (
    <section className="lifestyle section-pad">
      <div className="lifestyle-photo" data-image-reveal>
        <CinematicImage
          src={
            [
              '/images/pool.webp',
              '/images/interior.webp',
              '/images/garden.webp',
              '/images/lounge.webp',
              '/images/villa.webp',
              '/images/exterior.webp',
            ][Math.max(0, active)]
          }
          alt={amenityCopy[Math.max(0, active)][0]}
          sizes="(max-width:700px) 100vw, 55vw"
          direction="vertical"
        />{' '}
        <span className="eyebrow">THE EVERYDAY, ELEVATED.</span>
      </div>
      <div className="lifestyle-copy">
        <p className="eyebrow">04 / THE ART OF LIVING</p>
        <h2>
          Room for
          <br />
          <em>the good things.</em>
        </h2>
        <p>
          Beyond beautiful spaces, a more considered everyday. Our concept
          amenities are designed around what matters.
        </p>
        <div className="amenities">
          {amenityCopy.map(([title, description], i) => (
            <div key={title} className={active === i ? 'active' : ''}>
              <button
                aria-expanded={active === i}
                aria-controls={`amenity-${i}`}
                onClick={() => setActive(active === i ? -1 : i)}
              >
                {title}
                {active === i ? <Minus size={17} /> : <Plus size={17} />}
              </button>
              <AnimatePresence initial={false}>
                {active === i && (
                  <motion.div
                    className="amenity-description"
                    id={`amenity-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: motionTokens.curve }}
                  >
                    <p>{description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Concierge · Private clubs · Wellness · Considered security
        </p>
      </div>
    </section>
  );
}
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const t = testimonials[index];
  return (
    <section className="testimonials section-pad">
      <p className="eyebrow">THE FEELING OF HOME</p>
      <div className="quote-mark" aria-hidden="true">
        “
      </div>
      <AnimatePresence mode="wait">
        <motion.blockquote
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <p>{t.quote}</p>
          <footer>
            <strong>{t.name}</strong>
            <span>{t.role}</span>
          </footer>
        </motion.blockquote>
      </AnimatePresence>
      <div className="quote-controls">
        <button
          aria-label="Previous sample testimonial"
          onClick={() =>
            setIndex((index + testimonials.length - 1) % testimonials.length)
          }
        >
          <ArrowLeft size={17} />
        </button>
        <span>0{index + 1} / 02</span>
        <button
          aria-label="Next sample testimonial"
          onClick={() => setIndex((index + 1) % testimonials.length)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
      <p className="fine-print">
        Fictional portfolio testimonials. Not verified customer reviews.
      </p>
    </section>
  );
}
export function Journal() {
  const { open } = useExperience();
  return (
    <section id="journal" className="journal section-pad">
      <div>
        <p className="eyebrow">05 / THE AURELIA JOURNAL</p>
        <h2>
          On the art
          <br />
          of <em>living well.</em>
        </h2>
      </div>
      <button
        className="journal-feature"
        data-cursor="Read"
        onClick={() =>
          open({
            kind: 'info',
            title: 'The quiet luxury of natural light',
            text: 'A room changes with the sun. Morning light brings clarity to a workspace; the late afternoon softens stone and timber. In the Aurelia design philosophy, windows are considered as carefully as walls. Deep reveals temper glare. Courtyards carry daylight into the centre of a plan. A generous balcony becomes a threshold between interior and landscape. This concept editorial explores a simple idea: the most enduring luxury is a home that makes ordinary moments feel extraordinary.',
          })
        }
      >
        <div>
          <Image
            src="/images/interior.webp"
            alt="Natural light falling across a considered residential interior"
            fill
            sizes="(max-width:700px) 100vw, 35vw"
          />
        </div>
        <span className="eyebrow">DESIGN NOTES / 1 MIN READ</span>
        <h3>
          The quiet luxury
          <br />
          of natural light. <ArrowUpRight size={24} />
        </h3>
      </button>
    </section>
  );
}
export function AssistantTeaser() {
  const { open } = useExperience();
  return (
    <section className="assistant-teaser section-pad">
      <div className="assistant-symbol">
        <Sparkles size={32} />
      </div>
      <div>
        <p className="eyebrow">INTRODUCING AURELIA AI · LOCAL PREVIEW</p>
        <h2>
          A more personal
          <br />
          way to <em>find your place.</em>
        </h2>
        <p>
          Tell us what home looks like to you.
          <br />
          Explore considered matches from our concept collection.
        </p>
        <button
          className="text-link"
          onClick={() => open({ kind: 'assistant' })}
        >
          Start a conversation <ArrowUpRight size={18} />
        </button>
      </div>
      <motion.button
        layoutId="assistant-surface"
        className="prompt-preview"
        onClick={() => open({ kind: 'assistant' })}
      >
        <span>YOU MIGHT ASK</span>
        <p>
          “A 3 BHK in Visakhapatnam,
          <br />
          under ₹1.2 Cr.”
        </p>
        <span className="prompt-bottom">
          LET’S FIND YOUR PLACE <ArrowRight size={20} />
        </span>
      </motion.button>
    </section>
  );
}
export function Contact() {
  const { open } = useExperience();
  return (
    <section id="contact" className="contact">
      <Image
        src="/images/villa.webp"
        alt="A private residence at the edge of a tranquil pool"
        fill
        sizes="100vw"
      />
      <div className="contact-shade" />
      <div className="contact-content">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>
          Some things
          <br />
          are better <em>experienced.</em>
        </h2>
        <p>Step inside. Take your time. Make yourself at home.</p>
        <div>
          <MagneticButton
            className="light"
            onClick={() => open({ kind: 'visit' })}
          >
            Schedule a private visit
          </MagneticButton>
          <button
            className="text-link"
            onClick={() => open({ kind: 'visit', advisor: true })}
          >
            Talk to an advisor <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
