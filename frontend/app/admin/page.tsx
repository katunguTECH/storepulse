"use client";

import { useState } from "react";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) {
        throw new Error("Incorrect password. Try again.");
      }
      
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-emerald-600"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Storepulse Admin</h1>
            <p className="text-gray-500">Live site metrics and waitlist</p>
          </div>
          <button onClick={() => setData(null)} className="text-sm text-gray-500 hover:text-gray-900 underline">
            Log out
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Visits</p>
            <p className="text-4xl font-bold text-gray-900">{data.stats.totalVisits}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Visits (Last 24h)</p>
            <p className="text-4xl font-bold text-emerald-600">{data.stats.visits24h}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Waitlist Signups</p>
            <p className="text-4xl font-bold text-indigo-600">{data.stats.totalWaitlist}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Signups</h2>
            <div className="space-y-3">
              {data.recentWaitlist.map((w: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-gray-50 pb-2 text-sm last:border-0">
                  <span className="font-medium text-gray-800">{w.email}</span>
                  <span className="text-gray-500">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Top Locations</h2>
            <div className="space-y-3">
              {data.locations.map((l: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-gray-50 pb-2 text-sm last:border-0">
                  <span className="font-medium text-gray-800">{l.country || "Unknown"}</span>
                  <span className="text-gray-500">{l.count} visits</span>
                </div>
              ))}
              {data.locations.length === 0 && <p className="text-sm text-gray-500">No visits recorded yet.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentVisits.map((v: any, i: number) => (
              <div key={i} className="flex justify-between border-b border-gray-50 pb-2 text-sm last:border-0">
                <span className="font-medium text-gray-800">{v.path}</span>
                <span className="text-gray-500">{v.city}, {v.country}</span>
              </div>
            ))}
            {data.recentVisits.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
          </div>
        </div>

      </div>
    </main>
  );
}
