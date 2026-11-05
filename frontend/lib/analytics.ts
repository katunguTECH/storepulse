import { createHash } from "crypto";

export class UserError extends Error {}

type Line = {
  order: string;
  customer: string;
  product: string;
  quantity: number;
  date: number;
  amountUsd: number;
};
type OrderRow = { customer: string; date: number; amountUsd: number };
type Raw = { order: string; customer: string; product: string; qty: string; price: string; currency: string; date: string };
type Month = { month: string; revenue_usd: number; partial: boolean };

// Placeholder rates for testing only. Replace with a daily rates feed before relying on converted numbers.
const RATES_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.087, GBP: 1.266, KES: 0.00775,
  AUD: 0.65, CAD: 0.72, NZD: 0.59, CHF: 1.13, SEK: 0.095, NOK: 0.092,
  DKK: 0.146, PLN: 0.25, JPY: 0.0066, INR: 0.012, NGN: 0.00065,
  ZAR: 0.055, GHS: 0.085, UGX: 0.00027, TZS: 0.00038, AED: 0.272,
  SAR: 0.267, BRL: 0.18, MXN: 0.052, SGD: 0.75, TRY: 0.029,
  PHP: 0.017, IDR: 0.000063, MYR: 0.22,
};

const ALIASES: Record<string, string[]> = {
  order_id: ["name", "order id", "order_id", "order number", "order"],
  customer_id: ["email", "buyer email", "customer email", "buyer user id", "customer_id", "customer", "buyer", "full name"],
  product: ["lineitem name", "item name", "product", "product name", "title"],
  quantity: ["lineitem quantity", "quantity", "qty"],
  price: ["lineitem price", "price", "unit price"],
  currency: ["currency"],
  date: ["created at", "sale date", "date", "order date", "created_at"],
};

// Assumptions shown to the user, so estimates are never presented as facts.
const REORDER_RATE = 0.3;
const WIN_BACK_RATE = 0.1;

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseDate(s: string): number {
  const t = s.trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
    const tz = m[7];
    if (tz && tz !== "Z") {
      const sign = tz[0] === "-" ? -1 : 1;
      const digits = tz.slice(1).replace(":", "");
      const offsetMinutes = +digits.slice(0, 2) * 60 + +digits.slice(2, 4);
      ms -= sign * offsetMinutes * 60000;
    }
    return ms;
  }
  return Date.parse(t);
}

export function normalizeUpload(text: string): { lines: Line[]; warnings: string[] } {
  const warnings: string[] = [];
  const table = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length < 2) {
    throw new UserError("We could not find any order rows in this file.");
  }
  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    idx[field] = -1;
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) {
        idx[field] = i;
        break;
      }
    }
  }
  const required = ["order_id", "customer_id", "product", "price", "date"];
  const missing = required.filter((f) => idx[f] === -1);
  if (missing.length) {
    throw new UserError(
      `This file is missing columns we need (${missing.join(", ")}). Please upload an order export CSV from Shopify or Etsy.`
    );
  }
  const statusIdx = header.indexOf("financial status");
  const get = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");

  const totalRows = table.length - 1;
  const raws: Raw[] = [];
  let refunded = 0;
  for (const r of table.slice(1)) {
    if (statusIdx >= 0) {
      const st = get(r, statusIdx).toLowerCase();
      if (st === "refunded" || st === "voided") {
        refunded++;
        continue;
      }
    }
    raws.push({
      order: get(r, idx.order_id),
      customer: get(r, idx.customer_id),
      product: get(r, idx.product),
      qty: get(r, idx.quantity),
      price: get(r, idx.price),
      currency: get(r, idx.currency),
      date: get(r, idx.date),
    });
  }
  if (refunded) warnings.push(`Skipped ${refunded} refunded or voided rows.`);

  // Shopify only fills order-level fields on the first row of each order.
  const groups = new Map<string, Raw[]>();
  for (const r of raws) {
    if (!r.order) continue;
    const g = groups.get(r.order);
    if (g) g.push(r);
    else groups.set(r.order, [r]);
  }
  const rows: Raw[] = [];
  for (const g of groups.values()) {
    for (const f of ["customer", "date", "currency"] as const) {
      let last = "";
      for (const r of g) {
        if (r[f]) last = r[f];
        else if (last) r[f] = last;
      }
      let next = "";
      for (let i = g.length - 1; i >= 0; i--) {
        if (g[i][f]) next = g[i][f];
        else if (next) g[i][f] = next;
      }
    }
    for (const r of g) rows.push(r);
  }

  const hasCurrency = idx.currency !== -1;
  if (!hasCurrency) warnings.push("No currency column found, so all amounts were treated as USD.");

  const parsed: (Line & { currency: string })[] = [];
  for (const r of rows) {
    const date = r.date ? parseDate(r.date) : NaN;
    const cleaned = r.price.replace(/[^0-9.\-]/g, "");
    const price = cleaned === "" ? NaN : Number(cleaned);
    const q = r.qty === "" ? NaN : Number(r.qty);
    const quantity = Number.isNaN(q) ? 1 : q;
    const amount = price * quantity;
    if (!r.customer || !r.product || Number.isNaN(date) || Number.isNaN(amount)) continue;
    const currency = (hasCurrency ? r.currency || "USD" : "USD").toUpperCase();
    parsed.push({ order: r.order, customer: r.customer, product: r.product, quantity, date, amountUsd: amount, currency });
  }

  const unknown = Array.from(new Set(parsed.map((l) => l.currency).filter((c) => !(c in RATES_TO_USD)))).sort();
  let kept = parsed;
  if (unknown.length) {
    const n = parsed.filter((l) => unknown.includes(l.currency)).length;
    warnings.push(`Skipped ${n} rows in currencies we cannot convert yet: ${unknown.join(", ")}.`);
    kept = parsed.filter((l) => !unknown.includes(l.currency));
  }

  const dropped = totalRows - kept.length;
  if (dropped > 0 && !warnings.some((w) => w.includes("Skipped"))) {
    warnings.push(`Skipped ${dropped} rows with missing dates, customers, or prices.`);
  }
  if (kept.length < 20) {
    throw new UserError("We found fewer than 20 usable order rows. Upload a larger export (at least a few months of orders).");
  }

  // Customer identifiers are scrambled immediately and the originals are never kept.
  const lines: Line[] = kept.map((l) => ({
    order: l.order,
    customer: createHash("sha256").update(l.customer.trim().toLowerCase()).digest("hex").slice(0, 12),
    product: l.product,
    quantity: l.quantity,
    date: l.date,
    amountUsd: l.amountUsd * RATES_TO_USD[l.currency],
  }));
  return { lines, warnings };
}

function monthKey(ms: number): number {
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function monthLabel(k: number): string {
  const y = Math.floor(k / 12);
  const m = k % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function toOrders(lines: Line[]): OrderRow[] {
  const map = new Map<string, OrderRow>();
  for (const l of lines) {
    const o = map.get(l.order);
    if (o) {
      o.amountUsd += l.amountUsd;
      if (l.date < o.date) o.date = l.date;
    } else {
      map.set(l.order, { customer: l.customer, date: l.date, amountUsd: l.amountUsd });
    }
  }
  return Array.from(map.values());
}

function monthlyRevenue(lines: Line[]): Month[] {
  const totals = new Map<number, number>();
  let lo = Infinity;
  let hi = -Infinity;
  for (const l of lines) {
    const k = monthKey(l.date);
    totals.set(k, (totals.get(k) ?? 0) + l.amountUsd);
    if (k < lo) lo = k;
    if (k > hi) hi = k;
  }
  const cur = monthKey(Date.now());
  const out: Month[] = [];
  for (let k = lo; k <= hi; k++) {
    out.push({ month: monthLabel(k), revenue_usd: round(totals.get(k) ?? 0, 2), partial: k >= cur });
  }
  return out;
}

function forecast(months: Month[], horizon = 3, lookback = 12) {
  const full = months.filter((m) => !m.partial).slice(-lookback);
  if (full.length < 4) return [];
  const n = full.length;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  full.forEach((m, i) => {
    sx += i;
    sy += m.revenue_usd;
    sxy += i * m.revenue_usd;
    sxx += i * i;
  });
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  let ss = 0;
  full.forEach((m, i) => {
    const r = m.revenue_usd - (slope * i + intercept);
    ss += r * r;
  });
  const band = Math.sqrt(ss / n);
  const [ly, lm] = full[n - 1].month.split("-").map(Number);
  const lastKey = ly * 12 + (lm - 1);
  const out = [];
  for (let i = 1; i <= horizon; i++) {
    const v = slope * (n - 1 + i) + intercept;
    out.push({
      month: monthLabel(lastKey + i),
      forecast_usd: round(v, 2),
      low_usd: round(Math.max(v - band, 0), 2),
      high_usd: round(v + band, 2),
    });
  }
  return out;
}

function moneyLeft(orders: OrderRow[]) {
  let now = -Infinity;
  const byCustomer = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (o.date > now) now = o.date;
    const g = byCustomer.get(o.customer);
    if (g) g.push(o);
    else byCustomer.set(o.customer, [o]);
  }
  let dueN = 0;
  let lapsedN = 0;
  let dueVal = 0;
  let lapsedVal = 0;
  for (const g of byCustomer.values()) {
    if (g.length < 2) continue;
    const dates = g.map((o) => o.date).sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < dates.length; i++) diffs.push(dates[i] - dates[i - 1]);
    const gap = Math.max(median(diffs) / 86400000, 1);
    const since = (now - dates[dates.length - 1]) / 86400000;
    const aov = g.reduce((s, o) => s + o.amountUsd, 0) / g.length;
    if (since >= gap * 2.5) {
      lapsedN++;
      lapsedVal += aov * WIN_BACK_RATE;
    } else if (since >= gap) {
      dueN++;
      dueVal += aov * REORDER_RATE;
    }
  }
  return {
    total_usd: round(dueVal + lapsedVal, 2),
    items: [
      {
        title: `${dueN} customers are overdue to reorder`,
        detail: "They usually buy every few weeks and have gone past their normal gap. A reminder email could bring them back.",
        value_usd: round(dueVal, 2),
      },
      {
        title: `${lapsedN} customers have gone quiet`,
        detail: "They are far past their normal buying rhythm. A win-back offer is worth testing.",
        value_usd: round(lapsedVal, 2),
      },
    ],
    assumptions: `Estimate assumes ${Math.round(REORDER_RATE * 100)}% of overdue and ${Math.round(WIN_BACK_RATE * 100)}% of quiet customers respond to one targeted message, at their average order value.`,
  };
}

function topProducts(lines: Line[], n = 5) {
  const map = new Map<string, { revenue_usd: number; units: number }>();
  for (const l of lines) {
    const p = map.get(l.product);
    if (p) {
      p.revenue_usd += l.amountUsd;
      p.units += l.quantity;
    } else {
      map.set(l.product, { revenue_usd: l.amountUsd, units: l.quantity });
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].revenue_usd - a[1].revenue_usd)
    .slice(0, n)
    .map(([product, v]) => ({ product, revenue_usd: round(v.revenue_usd, 2), units: v.units }));
}

function bundleOpportunity(lines: Line[]) {
  const baskets = new Map<string, Set<string>>();
  for (const l of lines) {
    const s = baskets.get(l.customer);
    if (s) s.add(l.product);
    else baskets.set(l.customer, new Set([l.product]));
  }
  const counts = new Map<string, number>();
  const keys = Array.from(baskets.keys()).sort();
  for (const k of keys) {
    const prods = Array.from(baskets.get(k) as Set<string>).sort();
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const key = prods[i] + "\u0000" + prods[j];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  if (counts.size === 0) return null;
  let bestKey = "";
  let best = -1;
  for (const [k, c] of counts) {
    if (c > best) {
      best = c;
      bestKey = k;
    }
  }
  return {
    products: bestKey.split("\u0000"),
    customers: best,
    share_of_customers: round(best / baskets.size, 3),
  };
}

function concentration(lines: Line[]) {
  const rev = new Map<string, number>();
  let total = 0;
  for (const l of lines) {
    rev.set(l.product, (rev.get(l.product) ?? 0) + l.amountUsd);
    total += l.amountUsd;
  }
  let top = "";
  let topVal = -Infinity;
  for (const [p, v] of rev) {
    if (v > topVal) {
      topVal = v;
      top = p;
    }
  }
  return { product: top, share: round(topVal / total, 3) };
}

export function buildReport(lines: Line[], source: string, warnings: string[] = []) {
  const orders = toOrders(lines);
  const months = monthlyRevenue(lines);
  let start = Infinity;
  let end = -Infinity;
  for (const l of lines) {
    if (l.date < start) start = l.date;
    if (l.date > end) end = l.date;
  }
  return {
    meta: {
      source,
      orders: orders.length,
      customers: new Set(lines.map((l) => l.customer)).size,
      start: new Date(start).toISOString().slice(0, 10),
      end: new Date(end).toISOString().slice(0, 10),
      warnings,
    },
    money_left: moneyLeft(orders),
    monthly_revenue: months,
    forecast: forecast(months),
    top_products: topProducts(lines),
    bundle: bundleOpportunity(lines),
    concentration: concentration(lines),
  };
}
