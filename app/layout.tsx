import type { Metadata } from 'next';
import './globals.css';
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
      <body>{children}</body>
    </html>
  );
}
