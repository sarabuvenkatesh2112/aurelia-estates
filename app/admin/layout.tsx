import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = {
  title: { default: 'Aurelia Office', template: '%s | Aurelia Office' },
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="aurelia-office">{children}</div>;
}
