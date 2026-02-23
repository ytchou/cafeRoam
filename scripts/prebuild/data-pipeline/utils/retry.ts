// HTTP status codes that indicate a transient provider error worth retrying.
// 429/529 = rate-limited; 500/503 = transient server errors.
const RETRYABLE_STATUSES = new Set([429, 500, 503, 529]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelayMs = 1000 } = {}
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === maxRetries) throw error;

      const status = (error as { status?: number })?.status;
      // Throw immediately on known non-retryable HTTP errors (e.g. 400, 401, 403, 404).
      // Retry on retryable status codes OR when status is undefined (network-level errors:
      // ECONNRESET, ETIMEDOUT, DNS failures, etc.).
      if (status !== undefined && !RETRYABLE_STATUSES.has(status)) throw error;

      const delay = baseDelayMs * 2 ** attempt;
      const label = status !== undefined ? `HTTP ${status}` : 'Network error';
      console.log(
        `  ${label}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
