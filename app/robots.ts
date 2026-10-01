import type { MetadataRoute } from 'next';
// This is a fictional portfolio, not a set of real property listings.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
