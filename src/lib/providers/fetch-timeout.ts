/**
 * Every external provider call should bound how long it can hang — otherwise
 * a slow/unresponsive upstream API leaves the Add Item search spinner (and
 * the underlying server request) stuck indefinitely instead of failing
 * gracefully into the "enter manually" fallback.
 */
export const PROVIDER_FETCH_TIMEOUT_MS = 10_000;

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS);
}
