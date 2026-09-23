import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db/prisma';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const baseRoutes = [{ url: base }, { url: `${base}/residences` }];
  try {
    const projects = await getDb().project.findMany({
      where: { deletedAt: null, status: { not: 'ARCHIVED' } },
      select: { slug: true, updatedAt: true },
      take: 10000,
    });
    return [
      ...baseRoutes,
      ...projects.map((p) => ({
        url: `${base}/residences/${p.slug}`,
        lastModified: p.updatedAt,
      })),
    ];
  } catch {
    return baseRoutes;
  }
}
