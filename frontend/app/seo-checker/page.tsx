"use client";

import { useState } from "react";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

type Check = {
  name: string;
  status: "pass" | "warn" | "fail";
  earned: number;
  max: number;
  detail: string;
  fix: string;
};
type Result = {
  score: number;
  label: string;
  keyword_used: boolean;
  checks: Check[];
  top_fixes: string[];
  top_terms: string[];
  note: string;
};

const badge: Record<Check["status"], string> = {
  pass: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  fail: "bg-red-100 text-red-800",
};
const badgeText: Record<Check["status"], string> = { pass: "Good", warn: "Improve", fail: "Fix" };

export default function SeoChecker() {
  const [platform, setPlatform] = useState("etsy");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/seo-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, tags, keyword, platform }),
      });
      if (!r.ok) {
        let msg = "Something went wrong.";
        try {
          const j = await r.json();
          if (typeof j.detail === "string") msg = j.detail;
        } catch {}
        throw new Error(msg);
      }
      setResult(await r.json());
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const scoreColor = result ? (result.score >= 85 ? "text-emerald-700" : result.score >= 65 ? "text-amber-600" : "text-red-600") : "";
  const input = "w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-emerald-600";

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <nav className="flex items-center justify-between">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.jpg" 
            alt="Storepulse" 
            className="h-20 w-auto object-contain mix-blend-multiply" 
          />
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold md:text-4xl">Free listing SEO checker</h1>
        <p className="mt-2 text-gray-600">
          Paste your product listing and get a score with the three fixes most worth making. No signup needed.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Where do you sell?</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={input}>
            <option value="etsy">Etsy</option>
            <option value="shopify">Shopify</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Main keyword (what a buyer would search)</label>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. soy candle gift set" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Listing title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} maxLength={10000} className={input} />
        </div>
        {platform === "etsy" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Tags (separated by commas)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="soy candle, gift for her, ..." className={input} />
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Checking..." : "Check my listing"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <section className="space-y-6">
          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <p className={`text-6xl font-bold ${scoreColor}`}>{result.score}</p>
            <p className="mt-1 font-medium">{result.label}</p>
            {!result.keyword_used && (
              <p className="mt-2 text-sm text-gray-600">
                Add a main keyword above for a fuller score, including keyword placement checks.
              </p>
            )}
          </div>

          {result.top_fixes.length > 0 && (
            <div className="rounded-2xl bg-emerald-50 p-6">
              <p className="font-semibold text-emerald-900">Your top fixes</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-emerald-900">
                {result.top_fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-3">
            {result.checks.map((c) => (
              <div key={c.name} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{c.name}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge[c.status]}`}>{badgeText[c.status]}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{c.detail}</p>
                {c.fix && <p className="mt-1 text-sm text-gray-800">How to fix: {c.fix}</p>}
              </div>
            ))}
          </div>

          {result.top_terms.length > 0 && (
            <p className="text-sm text-gray-600">Words you use most: {result.top_terms.join(", ")}</p>
          )}
          <p className="text-xs text-gray-500">{result.note}</p>

          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">Want this for every listing, plus sales insights?</h2>
            <p className="mb-4 mt-1 text-gray-600">
              Storepulse will check all your listings and show which customers are due to reorder. Join the waitlist.
            </p>
            <WaitlistForm />
          </div>
        </section>
      )}
    </main>
  );
}