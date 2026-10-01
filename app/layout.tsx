import './concierge.css';
import { CustomerProvider } from '@/components/account/customer-context';
import './account.css';
import type { Metadata } from 'next';
import { applicationUrl } from '@/lib/site-url';
import './globals.css';
import './motion.css';
import './architecture.css';
import './platform.css';
export const metadata: Metadata = {
  metadataBase: new URL(applicationUrl()),
  title: 'Aurelia Estates — Exceptional residences. Extraordinary living.',
  description:
    'A considered collection of fictional luxury residences across India. Explore the Aurelia Estates portfolio experience.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Aurelia Estates — fictional portfolio',
    title: 'Aurelia Estates — a fictional residential collection',
    description:
      'A cinematic property-platform portfolio. All residences and property claims are illustrative.',
    images: [
      {
        url: '/images/hero.webp',
        alt: 'Architectural mood imagery for a fictional portfolio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurelia Estates — fictional portfolio',
    description:
      'A cinematic property-platform portfolio; fictional residences.',
    images: ['/images/hero.webp'],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CustomerProvider>{children}</CustomerProvider>
      </body>
    </html>
  );
}
