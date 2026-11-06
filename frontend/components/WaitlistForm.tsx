"use client";

import { useState } from "react";

export default function WaitlistForm({ id }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      if (!r.ok) {
        let detail = "Something went wrong. Please try again.";
        try {
          const j = await r.json();
          if (j.detail) detail = j.detail;
        } catch {}
        throw new Error(detail);
      }
      
      setStatus("done");

      // Trigger the welcome email silently in the background.
      // We do this after setStatus("done") so the user sees the green box instantly.
      fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});

    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof TypeError
          ? "We could not reach the server. Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    }
  };

  if (status === "done") {
    return (
      <div id={id} className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
        <p className="font-semibold">You are on the list.</p>
        <p className="text-sm">We will email you when Storepulse opens. Thank you for your interest.</p>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={submit} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourstore.com"
          aria-label="Email address"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-emerald-600"
        />
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === "loading" ? "Joining..." : "Join the waitlist"}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-sm text-red-600">{message}</p>}
      <p className="mt-2 text-xs text-gray-500">
        We will only email you about Storepulse. Unsubscribe any time. <a href="/privacy" className="underline">Privacy policy</a>.
      </p>
    </form>
  );
}