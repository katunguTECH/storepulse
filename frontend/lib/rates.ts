// Fetches daily USD-based exchange rates from open.er-api.com (free, no key).
// Next.js caches this fetch for 24h, so at most one request per day per server.
// If the fetch fails, we fall back to the hardcoded rates below so uploads never
// hard-fail because of a rates outage.

const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 1.087, GBP: 1.266, KES: 0.00775,
  AUD: 0.65, CAD: 0.72, NZD: 0.59, CHF: 1.13, SEK: 0.095, NOK: 0.092,
  DKK: 0.146, PLN: 0.25, JPY: 0.0066, INR: 0.012, NGN: 0.00065,
  ZAR: 0.055, GHS: 0.085, UGX: 0.00027, TZS: 0.00038, AED: 0.272,
  SAR: 0.267, BRL: 0.18, MXN: 0.052, SGD: 0.75, TRY: 0.029,
  PHP: 0.017, IDR: 0.000063, MYR: 0.22,
};

export type Rates = Record<string, number>;

let cached: Rates | null = null;

export async function getRates(): Promise<Rates> {
  if (cached) return cached;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
    });
    if (!r.ok) throw new Error(`rates fetch ${r.status}`);
    const j = (await r.json()) as { rates?: Record<string, number> };
    if (!j.rates || typeof j.rates.USD !== "number") throw new Error("rates payload shape unexpected");
    const out: Rates = {};
    for (const [code, perUsd] of Object.entries(j.rates)) {
      // open.er-api returns 1 USD = N <code>. We want 1 <code> = X USD.
      if (perUsd > 0) out[code.toUpperCase()] = 1 / perUsd;
    }
    if (!out.USD) out.USD = 1;
    cached = out;
    return out;
  } catch {
    cached = FALLBACK;
    return FALLBACK;
  }
}
