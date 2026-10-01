import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db/prisma';
import { applicationUrl } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = applicationUrl();
  const baseRoutes = [{ url: `${base}/` }, { url: `${base}/residences/` }];
  try {
    const projects = await getDb().project.findMany({
      where: { deletedAt: null, status: { not: 'ARCHIVED' } },
      select: { slug: true, updatedAt: true },
      take: 10000,
    });
    return [
      ...baseRoutes,
      ...projects.map((p) => ({
        url: `${base}/residences/${p.slug}/`,
        lastModified: p.updatedAt,
      })),
    ];
  } catch {
    return baseRoutes;
  }
}
