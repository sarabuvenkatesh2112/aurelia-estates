'use client';
import { useEffect, useState } from 'react';
import { Menu, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useExperience } from './experience-provider';
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
  const { open } = useExperience();
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <a className="wordmark" href="#home" aria-label="Aurelia Estates home">
          AURELIA<span>ESTATES</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`}>
              {n}
            </a>
          ))}
        </nav>
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
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="mobile-menu">
          <DialogTitle className="wordmark">
            AURELIA<span>ESTATES</span>
          </DialogTitle>
          <DialogDescription className="eyebrow">
            A considered way of living
          </DialogDescription>
          <nav aria-label="Mobile navigation">
            {navItems.map((n, i) => (
              <motion.a
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.055 }}
                key={n}
                href={`#${n.toLowerCase()}`}
                onClick={() => setMenu(false)}
              >
                <small>0{i + 1}</small>
                {n}
                <ArrowUpRight />
              </motion.a>
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
