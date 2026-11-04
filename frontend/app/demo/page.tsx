"use client";

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Report = {
  meta: { source: string; orders: number; customers: number; start: string; end: string; warnings: string[] };
  money_left: { total_usd: number; assumptions: string; items: { title: string; detail: string; value_usd: number }[] };
  monthly_revenue: { month: string; revenue_usd: number; partial: boolean }[];
  forecast: { month: string; forecast_usd: number; low_usd: number; high_usd: number }[];
  top_products: { product: string; revenue_usd: number; units: number }[];
  bundle: { products: string[]; customers: number; share_of_customers: number } | null;
  concentration: { product: string; share: number };
};
type Row = { month: string; actual?: number; forecast?: number };

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

async function request(path: string, init?: RequestInit): Promise<Report> {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) {
    let msg = "Something went wrong.";
    try {
      const j = await r.json();
      if (j.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

function toMessage(err: unknown): string {
  if (err instanceof TypeError) return "Cannot reach the Storepulse API. Is uvicorn running on port 8000?";
  return err instanceof Error ? err.message : "Something went wrong.";
}

export default function Demo() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDemo = async () => {
    setError("");
    try {
      setData(await request("/report"));
    } catch (err) {
      setError(toMessage(err));
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
      setData(await request("/analyze", { method: "POST", body: fd }));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
      e.target.value = "";
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
          <h1 className="text-2xl font-bold">Storepulse</h1>
          <p className="text-gray-500">Your store, explained in plain numbers.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Analyzing..." : "Upload your orders (CSV)"}
          </button>
          {data?.meta.source === "upload" && (
            <button onClick={loadDemo} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
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
              ? "Showing sample data. Upload an order export from Shopify or Etsy to see your own store. "
              : "Your file was analyzed and not kept; customer emails were scrambled immediately. "}
            {data.meta.orders.toLocaleString()} orders, {data.meta.customers.toLocaleString()} customers, {data.meta.start} to {data.meta.end}.
            {data.meta.warnings.map((w) => (
              <span key={w} className="block text-amber-700">
                Note: {w}
              </span>
            ))}
          </div>

          <section className="rounded-2xl bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-800">Money left on the table (estimate)</p>
            <p className="text-4xl font-bold text-emerald-900">{usd(data.money_left.total_usd)}</p>
            <p className="mt-1 text-xs text-emerald-800">{data.money_left.assumptions}</p>
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
        </>
      )}
    </main>
  );
}


