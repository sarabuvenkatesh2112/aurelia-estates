import { notFound } from 'next/navigation';
import {
  projectDetail,
  homepageCollection,
} from '@/lib/services/projectService';
import { PlatformShell } from '@/components/platform/platform-shell';
import { ProjectExperience } from '@/components/platform/project-experience';
import { publicWhatsAppLink } from '@/lib/communications/config';
export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unitsPage?: string }>;
};
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const d = await projectDetail(slug);
  return {
    title: d
      ? `${d.property.name} in ${d.property.city} | Aurelia Estates`
      : 'Residence not found | Aurelia Estates',
    description: d?.property.description,
  };
}
export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Number(query.unitsPage || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) notFound();
  const [detail, home] = await Promise.all([
    projectDetail(slug, page),
    homepageCollection(),
  ]);
  if (!detail) notFound();
  const p = detail.property;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: p.name,
    description: `Fictional project. ${p.description}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.city,
      addressCountry: 'IN',
    },
    url: `${process.env.SITE_URL || 'http://localhost:3000'}/residences/${slug}`,
  };
  return (
    <PlatformShell properties={home.properties}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replaceAll('<', '\\u003c'),
        }}
      />
      <ProjectExperience detail={detail} whatsAppHref={publicWhatsAppLink(p.name)} />
    </PlatformShell>
  );
}
