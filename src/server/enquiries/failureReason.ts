export type EnquiryFailureReason =
  'not_configured' | 'not_acknowledged' | 'timeout' | 'http_error' | 'unknown';

export class MondayEnquiryError extends Error {
  constructor(public readonly reason: EnquiryFailureReason) {
    super('Monday enquiry write failed');
    this.name = 'MondayEnquiryError';
  }
}

export function enquiryFailureReason(error: unknown): EnquiryFailureReason {
  // Drizzle wraps pg errors in cause; inspect only typed signals, never messages or payloads.
  const seen = new Set<object>();
  while (typeof error === 'object' && error !== null && !seen.has(error)) {
    seen.add(error);
    if (error instanceof MondayEnquiryError) return error.reason;
    if (
      ('name' in error && (error.name === 'TimeoutError' || error.name === 'AbortError')) ||
      ('code' in error && error.code === '57014')
    ) {
      return 'timeout';
    }
    error = 'cause' in error ? error.cause : undefined;
  }
  return 'unknown';
}
