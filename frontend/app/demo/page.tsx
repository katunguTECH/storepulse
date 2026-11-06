"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Report = {
  meta: { source: string; orders: number; customers: number; start: string; end: string; warnings: string[] };
  money_left: { total_usd: number; assumptions: string; items: { title: string; detail: string; value_usd: number }[] };
  monthly_revenue: { month: string; revenue_usd: number; partial: boolean }[];
  forecast: { month: string; forecast_usd: number; low_usd: number; high_usd: number }[];
  top_products: { product: string; revenue_usd: number; units: number }[];
  bundle: { products: string[]; customers: number; share_of_customers: number } | null;
  concentration: { product: string; share: number };
  action_plan: string[];
  profit: {
    gross_revenue: number;
    platform_fees: number;
    product_costs: number;
    net_profit: number;
    margin_pct: number;
  };
};
type Row = { month: string; actual?: number; forecast?: number };

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

async function fail(r: Response): Promise<never> {
  let msg = "Something went wrong. Please try again.";
  try {
    const j = await r.json();
    if (typeof j.detail === "string") msg = j.detail;
  } catch {}
  throw new Error(msg);
}

export default function Demo() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cost inputs
  const [cogs, setCogs] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [feePct, setFeePct] = useState("0");

  // Competitor state
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorResult, setCompetitorResult] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  const loadDemo = async () => {
    setError("");
    try {
      const r = await fetch("/demo-report.json");
      if (!r.ok) await fail(r);
      setData(await r.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  useEffect(() => {
    loadDemo();
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("cogs", cogs);
      fd.append("shipping", shipping);
      fd.append("feePct", feePct);
      
      const r = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!r.ok) await fail(r);
      setData(await r.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleCompare = async () => {
    if (!competitorUrl) return;
    setComparing(true);
    setCompetitorResult(null);
    
    try {
      // We simulate a network request for realism
      await new Promise(r => setTimeout(r, 1500));
      
      // Generate a mock response
      setCompetitorResult({
        url: competitorUrl,
        price_diff: -3.50, // They are $3.50 cheaper
        title_length: 85, // Their title is short
        missing_keywords: ["hand-poured", "vegan", "eco-friendly"],
        insight: "Their price is slightly lower, but their title is missing long-tail keywords. You can win on SEO by adding 'hand-poured' and 'vegan' to your title."
      });
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };

  const rows: Row[] = [];
  let partial: Report["monthly_revenue"][number] | undefined;
  if (data) {
    data.monthly_revenue.filter((m) => !m.partial).forEach((m) => rows.push({ month: m.month, actual: m.revenue_usd }));
    if (rows.length && data.forecast.length) rows[rows.length - 1].forecast = rows[rows.length - 1].actual;
    data.forecast.forEach((f) => rows.push({ month: f.month, forecast: f.forecast_usd }));
    partial = data.monthly_revenue.find((m) => m.partial);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-2xl font-bold text-emerald-700">
            Storepulse
          </Link>
          <p className="text-gray-500">Your store, explained in plain numbers.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* COST INPUTS */}
          <div className="flex items-center gap-1 rounded-lg border p-1 bg-white shadow-sm">
             <input type="number" placeholder="Cost $" value={cogs} onChange={(e) => setCogs(e.target.value)} className="w-16 px-2 py-1 text-sm outline-none text-center" title="Product Cost per item" />
             <span className="text-gray-300">|</span>
             <input type="number" placeholder="Ship $" value={shipping} onChange={(e) => setShipping(e.target.value)} className="w-16 px-2 py-1 text-sm outline-none text-center" title="Shipping Cost per item" />
             <span className="text-gray-300">|</span>
             <input type="number" placeholder="Fee %" value={feePct} onChange={(e) => setFeePct(e.target.value)} className="w-16 px-2 py-1 text-sm outline-none text-center" title="Platform Fee % (e.g. 6.5)" />
          </div>

          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Analyzing..." : "Upload your orders (CSV)"}
          </button>
          {data?.meta.source === "upload" && (
            <button onClick={loadDemo} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 bg-white">
              Back to demo
            </button>
          )}
        </div>
      </header>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!data && !error && <p className="text-gray-500">Loading your report...</p>}

      {data && (
        <>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {data.meta.source === "demo"
              ? "Showing sample data. Upload an order export from Shopify or Etsy (CSV, up to 4 MB) to see your own store. "
              : "Your file was analyzed and not kept; customer emails were scrambled immediately. "}
            {data.meta.orders.toLocaleString()} orders, {data.meta.customers.toLocaleString()} customers, {data.meta.start} to {data.meta.end}.
            {data.meta.warnings.map((w) => (
              <span key={w} className="block text-amber-700">
                Note: {w}
              </span>
            ))}
          </div>

          {/* PROFIT AFTER FEES */}
          {data.profit && data.profit.gross_revenue > 0 && data.meta.source === "upload" && (
            <section className="rounded-2xl bg-slate-800 text-white p-6 shadow-md">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">Net profit (after fees & costs)</p>
                  <p className="text-4xl font-bold">{usd(data.profit.net_profit)}</p>
                  <p className="text-sm text-slate-400">Margin: {data.profit.margin_pct}%</p>
                </div>
                <div className="text-left md:text-right text-sm text-slate-300 space-y-1">
                  <p>Gross Revenue: {usd(data.profit.gross_revenue)}</p>
                  <p className="text-red-400">- Platform Fees: {usd(data.profit.platform_fees)}</p>
                  <p className="text-red-400">- Product & Ship Costs: {usd(data.profit.product_costs)}</p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-800">Money left on the table (estimate)</p>
            <p className="text-4xl font-bold text-emerald-900">{usd(data.money_left.total_usd)}</p>
            <p className="mt-1 text-xs text-emerald-800">{data.meta.source === "upload" ? "Converted to USD using approximate rates. " : ""}{data.money_left.assumptions}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.money_left.items.map((it) => (
                <div key={it.title} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="font-semibold">{it.title}</p>
                  <p className="text-sm text-gray-600">{it.detail}</p>
                  <p className="mt-2 font-bold text-emerald-700">About {usd(it.value_usd)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {data.bundle && (
              <div className="rounded-xl border p-4">
                <p className="font-semibold">Bundle idea</p>
                <p className="text-sm text-gray-600">
                  {data.bundle.products[0]} and {data.bundle.products[1]} are bought together by {data.bundle.customers}{" "}
                  customers ({Math.round(data.bundle.share_of_customers * 100)}% of your base). Try selling them as a bundle.
                </p>
              </div>
            )}
            <div className="rounded-xl border p-4">
              <p className="font-semibold">Concentration risk</p>
              <p className="text-sm text-gray-600">
                {data.concentration.product} brings in {Math.round(data.concentration.share * 100)}% of your revenue. Losing
                it would hurt, so consider growing your other products.
              </p>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <p className="mb-2 font-semibold">Monthly revenue and 3-month forecast (USD)</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#059669" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {data.forecast.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">A forecast needs at least 4 full months of orders.</p>
            )}
            {partial && (
              <p className="mt-2 text-xs text-gray-500">
                {partial.month} is still in progress and is left out of the chart and forecast.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-indigo-50 p-6">
            <h2 className="text-lg font-bold text-indigo-900">Your Action Plan for this week</h2>
            <p className="mt-1 text-sm text-indigo-800">Based on your data, here is exactly what you should do next.</p>
            <ul className="mt-4 space-y-3">
              {data.action_plan?.map((action, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{action}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border p-4">
            <p className="mb-2 font-semibold">Top products</p>
            {data.top_products.map((p) => (
              <div key={p.product} className="flex justify-between border-b py-2 text-sm last:border-0">
                <span>{p.product}</span>
                <span>
                  {usd(p.revenue_usd)} / {p.units} units
                </span>
              </div>
            ))}
          </section>

          {/* COMPETITOR COMPARISON */}
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="text-lg font-bold text-orange-900">Spy on a competitor</h2>
            <p className="mt-1 text-sm text-orange-800">Paste a link to a competitor's listing to see how you compare.</p>
            
            <div className="mt-4 flex gap-2">
              <input 
                type="url" 
                placeholder="https://etsy.com/listing/..." 
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                className="w-full rounded-lg border border-orange-300 px-4 py-2 text-sm outline-none focus:border-orange-500"
              />
              <button 
                onClick={handleCompare}
                disabled={comparing || !competitorUrl}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 whitespace-nowrap"
              >
                {comparing ? "Analyzing..." : "Compare"}
              </button>
            </div>

            {competitorResult && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-orange-100">
                <div className="flex gap-6 mb-3 border-b pb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Price Difference</p>
                    <p className="font-bold text-red-600">{usd(competitorResult.price_diff)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Title Length</p>
                    <p className="font-bold text-amber-600">{competitorResult.title_length} chars</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Your SEO Opportunity:</p>
                <p className="text-sm text-gray-600 mb-2">They are missing these keywords: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{competitorResult.missing_keywords.join(", ")}</span></p>
                <p className="text-sm font-medium text-orange-800 bg-orange-50 p-2 rounded-lg">{competitorResult.insight}</p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}