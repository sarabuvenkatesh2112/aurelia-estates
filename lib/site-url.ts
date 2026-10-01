/** One validated public origin. Local fallback is development-only. */
export function applicationUrl(
  value = process.env.SITE_URL,
  production = process.env.NODE_ENV === 'production',
) {
  if (!value && production)
    throw new Error('SITE_URL is required for production.');
  const url = new URL(value || 'http://localhost:3000');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))
  )
    throw new Error(
      'SITE_URL must be an HTTPS origin (HTTP loopback is allowed for local previews).',
    );
  return url.origin;
}

// TLS may terminate at the trusted ingress; the internal Request can be HTTP.
export function secureApplicationCookie(requestUrl: string) {
  const configured = process.env.AUTH_BASE_URL || process.env.SITE_URL;
  return (
    new URL(configured ? applicationUrl(configured) : requestUrl).protocol ===
    'https:'
  );
}
