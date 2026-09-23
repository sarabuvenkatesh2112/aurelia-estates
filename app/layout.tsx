import './concierge.css';
import { CustomerProvider } from '@/components/account/customer-context';
import './account.css';
import type { Metadata } from 'next';
import './globals.css';
import './motion.css';
import './architecture.css';
import './platform.css';
export const metadata: Metadata = {
  title: 'Aurelia Estates — Exceptional residences. Extraordinary living.',
  description:
    'A considered collection of fictional luxury residences across India. Explore the Aurelia Estates portfolio experience.',
  robots: { index: false, follow: false },
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
