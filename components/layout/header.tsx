'use client';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import { AccountLink } from '@/components/account/customer-context';
import { Menu, ArrowUpRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useExperience } from './experience-provider';
import { jumpToSection } from '@/lib/scroll';
export const navItems = [
  'Residences',
  'Developments',
  'Locations',
  'About',
  'Journal',
  'Contact',
];
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const pendingSection = useRef<string | null>(null);
  const { open } = useExperience();
  const arrive = (id: string) => {
    // Commit the sticky state with the jump rather than waiting for a scroll event.
    setScrolled(id !== 'home');
    jumpToSection(id);
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, mobile = false) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const id = event.currentTarget.hash.slice(1);
    if (mobile) {
      pendingSection.current = id;
      setMenu(false);
    } else arrive(id);
  };
  const activateSpace = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (
      event.key !== ' ' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    if (!event.repeat) event.currentTarget.click();
  };
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <a
          className="wordmark"
          href="#home"
          aria-label="Aurelia Estates home"
          onClick={navigate}
          onKeyDown={activateSpace}
        >
          AURELIA<span>ESTATES</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((n) => (
            <a
              key={n}
              href={`#${n.toLowerCase()}`}
              onClick={navigate}
              onKeyDown={activateSpace}
            >
              {n}
            </a>
          ))}
        </nav>
        <AccountLink />
        <button className="nav-visit" onClick={() => open({ kind: 'visit' })}>
          Schedule a visit <ArrowUpRight size={16} />
        </button>
        <button
          className="menu-trigger"
          aria-label="Open navigation"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </button>
      </header>
      <Dialog
        open={menu}
        onOpenChange={setMenu}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen && pendingSection.current) {
            const id = pendingSection.current;
            pendingSection.current = null;
            // Wait for the existing modal to release body scrolling/focus first.
            arrive(id);
          }
        }}
      >
        <DialogContent className="mobile-menu">
          <DialogTitle className="wordmark">
            AURELIA<span>ESTATES</span>
          </DialogTitle>
          <DialogDescription className="eyebrow">
            A considered way of living
          </DialogDescription>
          <nav aria-label="Mobile navigation">
            {navItems.map((n, i) => (
              <a
                style={{ '--link-index': i } as CSSProperties}
                key={n}
                href={`#${n.toLowerCase()}`}
                onClick={(event) => navigate(event, true)}
                onKeyDown={activateSpace}
              >
                <small>0{i + 1}</small>
                {n}
                <ArrowUpRight />
              </a>
            ))}
          </nav>
          <button
            className="button dark"
            onClick={() => {
              setMenu(false);
              open({ kind: 'visit' });
            }}
          >
            Arrange a private visit <ArrowUpRight size={18} />
          </button>
          <p className="fine-print">
            Exceptional residences. Extraordinary living.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
