'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useExperience } from './experience-provider';
export function Footer() {
  const { open } = useExperience();
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer className="footer section-pad">
      <div className="footer-top">
        <div>
          <p className="eyebrow">STAY IN THE KNOW</p>
          <h3>
            A little inspiration.
            <br />
            An occasional invitation.
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubscribed(true);
            }}
          >
            <label className="sr-only" htmlFor="newsletter">
              Email address
            </label>
            <input
              required
              type="email"
              id="newsletter"
              placeholder="Your email address"
              autoComplete="email"
            />
            <button aria-label="Preview newsletter signup">
              <ArrowRight size={20} />
            </button>
          </form>
          <output className="fine-print">
            {subscribed
              ? 'Demo signup complete. Your email has not been saved or sent.'
              : 'Portfolio preview. No emails are collected or sent.'}
          </output>
        </div>
        <div className="footer-contact">
          <p className="eyebrow">LET’S START A CONVERSATION</p>
          <button onClick={() => open({ kind: 'visit', advisor: true })}>
            hello@aurelia.example <ArrowUpRight size={18} />
          </button>
          <p>A fictional brand. A considered vision.</p>
          <div>
            {['Instagram', 'LinkedIn'].map((s) => (
              <button
                key={s}
                className="text-link"
                onClick={() =>
                  open({
                    kind: 'info',
                    title: `Aurelia on ${s}`,
                    text: 'This social profile is a placeholder for the Aurelia Estates portfolio concept. No official account is connected.',
                  })
                }
              >
                {s} <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <a href="#home" className="footer-wordmark">
        AURELIA<span>ESTATES</span>
      </a>
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Aurelia Estates. A portfolio concept.
        </p>
        <nav aria-label="Footer">
          <a href="#residences">Residences</a>
          <a href="#about">Our philosophy</a>
          {['Privacy', 'Terms'].map((title) => (
            <button
              key={title}
              onClick={() =>
                open({
                  kind: 'info',
                  title: `${title} — portfolio preview`,
                  text:
                    title === 'Privacy'
                      ? 'This frontend demonstration does not send form details to a server, store contact information or connect to an AI service. Form and conversation values remain only in page memory and disappear when you reload. The deployed hosting provider may process normal access logs.'
                      : 'Aurelia Estates is a fictional portfolio brand. All residences, developers, prices, distances, possession dates, statistics and resident stories are illustrative. Photography is architectural mood imagery and does not depict the listed properties. Nothing on this site constitutes an offer for sale or a confirmed booking.',
                })
              }
            >
              {title}
            </button>
          ))}
        </nav>
      </div>
      <p className="footer-disclaimer">
        All developments, listings, prices, statistics and testimonials are
        fictional. Images are architectural mood references, not photographs of
        listed projects. No property sales, bookings or advice are provided.
      </p>
    </footer>
  );
}
