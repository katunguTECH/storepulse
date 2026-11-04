"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API = "http://127.0.0.1:8000";

type Report = {
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

export default function Home() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/report`)
      .then((r) => {
        if (!r.ok) throw new Error("bad response");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Cannot reach the Storepulse API. Is uvicorn running on port 8000?"));
  }, []);

  if (error) return <main className="p-10 text-red-600">{error}</main>;
  if (!data) return <main className="p-10 text-gray-500">Loading your report...</main>;

  const rows: Row[] = data.monthly_revenue
    .filter((m) => !m.partial)
    .map((m) => ({ month: m.month, actual: m.revenue_usd }));
  if (rows.length) rows[rows.length - 1].forecast = rows[rows.length - 1].actual;
  data.forecast.forEach((f) => rows.push({ month: f.month, forecast: f.forecast_usd }));
  const partial = data.monthly_revenue.find((m) => m.partial);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-bold">Storepulse</h1>
        <p className="text-gray-500">Your store, explained in plain numbers.</p>
      </header>

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
              {data.bundle.products[0]} and {data.bundle.products[1]} are bought together by{" "}
              {data.bundle.customers} customers ({Math.round(data.bundle.share_of_customers * 100)}% of your base).
              Try selling them as a bundle.
            </p>
          </div>
        )}
        <div className="rounded-xl border p-4">
          <p className="font-semibold">Concentration risk</p>
          <p className="text-sm text-gray-600">
            {data.concentration.product} brings in {Math.round(data.concentration.share * 100)}% of your revenue.
            Losing it would hurt, so consider growing your other products.
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
    </main>
  );
}
