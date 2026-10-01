import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  projectDetail,
  homepageCollection,
} from '@/lib/services/projectService';
import { PlatformShell } from '@/components/platform/platform-shell';
import { ProjectExperience } from '@/components/platform/project-experience';
import { publicWhatsAppLink } from '@/lib/communications/config';
import { getProjectRecord } from '@/lib/repositories/projectRepository';
import { applicationUrl } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unitsPage?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120
      ? await getProjectRecord(slug)
      : null;
  const title = d
    ? `${d.name} in ${d.location.city} | Aurelia Estates`
    : 'Residence not found | Aurelia Estates';
  const description = d
    ? `Fictional portfolio residence. ${d.shortDescription}`
    : 'This fictional residence is not available.';
  const url = `/residences/${encodeURIComponent(slug)}/`;
  const image =
    d?.media.find((m) => m.type === 'HERO')?.url || '/images/hero.webp';
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        { url: image, alt: 'Fictional residence architectural mood imagery' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
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
    '@type': 'CreativeWork',
    name: p.name,
    description: `Fictional project. ${p.description}`,
    genre: 'Fictional architectural portfolio',
    url: `${applicationUrl()}/residences/${slug}/`,
  };
  return (
    <PlatformShell properties={home.properties}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replaceAll('<', '\\u003c'),
        }}
      />
      <ProjectExperience
        detail={detail}
        whatsAppHref={publicWhatsAppLink(p.name)}
      />
    </PlatformShell>
  );
}
