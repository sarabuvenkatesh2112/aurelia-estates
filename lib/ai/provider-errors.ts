export type ProviderStage = 'connect' | 'stream' | 'finalize' | 'tools';
export class ConciergeProviderError extends Error {
  constructor(
    public diagnostic: {
      stage: ProviderStage;
      code: string;
      status: number | null;
    },
  ) {
    super('The concierge response could not finish.');
  }
}
// Classify locally; never retain raw SDK messages, cause objects, request headers or URLs.
export function classifyProviderError(error: unknown, stage: ProviderStage) {
  if (error instanceof ConciergeProviderError) return error;
  const http = providerFailure(error);
  const e = error instanceof Error ? error : null;
  const name = e?.name;
  const cause = e?.cause as { code?: unknown } | undefined;
  const timeout =
    name === 'TimeoutError' ||
    /timeout|timed out/i.test(e?.message || '') ||
    cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
  return new ConciergeProviderError({
    stage,
    status: http?.status ?? null,
    code:
      http?.code ||
      (timeout
        ? 'TIMEOUT'
        : name === 'AbortError'
          ? 'ABORTED'
          : name === 'TypeError'
            ? 'TRANSPORT_ERROR'
            : 'PROVIDER_FAILURE'),
  });
}
// Only allowlisted metadata leaves the server; never raw SDK errors or request URLs.
export function providerFailure(error: unknown) {
  if (error instanceof ConciergeProviderError) return error.diagnostic;
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? error.status
      : null;
  const codes: Record<number, string> = {
    400: 'INVALID_ARGUMENT',
    401: 'UNAUTHENTICATED',
    403: 'PERMISSION_DENIED',
    404: 'NOT_FOUND',
    429: 'RESOURCE_EXHAUSTED',
    500: 'INTERNAL',
    503: 'UNAVAILABLE',
    504: 'DEADLINE_EXCEEDED',
  };
  return typeof status === 'number' && Object.hasOwn(codes, status)
    ? { status, code: codes[status] }
    : null;
}
