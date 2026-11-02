const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchOracleWithRetry(
  url: string | URL,
  makeInit: () => RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, makeInit());
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts - 1) return response;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await pause(300 * (2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error('Oracle request failed after retries.');
}
