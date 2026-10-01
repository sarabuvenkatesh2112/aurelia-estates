import { isIP } from 'node:net';
import { PublicError } from '@/lib/http';
const allowedHeaders = ['x-aurelia-proxy-ip', 'cf-connecting-ip', 'x-real-ip'];
export function trustedClientIp(
  headers: Headers,
  configuredHeader?: string,
  publicHost = false,
) {
  if (configuredHeader) {
    if (!allowedHeaders.includes(configuredHeader))
      throw new Error('Unsupported trusted proxy header.');
    const value = headers.get(configuredHeader)?.trim();
    // Require a single ingress-overwritten address, never a caller-controlled XFF chain.
    if (!value || !isIP(value))
      throw new PublicError('Client address could not be verified.', 403);
    return value;
  }
  if (publicHost)
    throw new Error(
      'AUTH_TRUSTED_IP_HEADER is required behind a trusted production ingress.',
    );
  return '127.0.0.1';
}
