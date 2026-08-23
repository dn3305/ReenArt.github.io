// Conservative fallback if the live rate lookup ever fails — better to use a
// slightly-stale-but-sane number than to block a checkout entirely.
const FALLBACK_USD_TO_INR = 88;

let cached: { rate: number; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdToInrRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.rate;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === 'number' && rate > 0) {
        cached = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch (e) {
    console.error('Exchange rate fetch failed:', e);
  }
  return cached?.rate ?? FALLBACK_USD_TO_INR;
}
