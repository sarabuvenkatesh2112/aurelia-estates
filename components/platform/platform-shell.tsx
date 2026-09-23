'use client';
import { AccountLink } from '@/components/account/customer-context';
import Link from 'next/link';

import { ExperienceProvider } from '@/components/layout/experience-provider';
import { ExperiencePanels } from '@/components/layout/experience-panels';
import type { Property } from '@/types/property';
import { useExperience } from '@/components/layout/experience-provider';
import { ArrowUpRight } from 'lucide-react';
function PlatformHeader() {
  const { open } = useExperience();
  return (
    <header className="platform-header">
      <Link prefetch={false} className="platform-brand" href="/">
        AURELIA<small>ESTATES</small>
      </Link>
      <nav aria-label="Property platform">
        <AccountLink />
        <Link prefetch={false} href="/residences">
          The collection
        </Link>
        <button onClick={() => open({ kind: 'visit' })}>
          Schedule a visit <ArrowUpRight size={15} />
        </button>
      </nav>
    </header>
  );
}
export function PlatformShell({
  children,
  properties,
}: {
  children: React.ReactNode;
  properties: Property[];
}) {
  return (
    <ExperienceProvider properties={properties}>
      <PlatformHeader />
      {children}
      <footer className="platform-footer">
        <Link prefetch={false} href="/">
          AURELIA ESTATES
        </Link>
        <p>
          Fictional residences. Real request storage. Requests are not confirmed
          bookings.
        </p>
        <button
          className="text-link"
          onClick={() => location.assign('/#contact')}
        >
          Contact Aurelia
        </button>
      </footer>
      <ExperiencePanels />
    </ExperienceProvider>
  );
}
