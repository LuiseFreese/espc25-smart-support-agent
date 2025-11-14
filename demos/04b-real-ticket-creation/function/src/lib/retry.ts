/**
 * Retry helper for handling transient Graph API errors (429 throttling, 5xx server errors).
 *
 * Uses exponential backoff with a maximum delay of 8 seconds.
 *
 * @param fn - Async function to retry
 * @param tries - Maximum number of attempts (default: 3)
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * const response = await withRetry(() =>
 *   client.api(`/sites/${siteId}/lists/${listId}/items`).post(item)
 * );
 */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;

  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.statusCode || e?.code;

      // Retry on throttling (429) or server errors (5xx)
      if (status === 429 || (status >= 500 && status < 600)) {
        const delay = Math.min(1000 * Math.pow(2, i), 8000);
        console.log(`[Retry] Attempt ${i + 1}/${tries} failed with ${status}, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        lastErr = e;
        continue;
      }

      // Don't retry on client errors (4xx except 429)
      throw e;
    }
  }

  throw lastErr;
}
