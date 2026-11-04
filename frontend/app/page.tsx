import type { Metadata } from "next";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Storepulse: find the money your store is leaving on the table",
  description:
    "Upload your Shopify or Etsy orders and see which customers are due to reorder, what to bundle, and where your revenue is heading. Built for small online sellers worldwide.",
};

const features = [
  {
    title: "Money left on the table",
    text: "See how many customers are overdue to reorder or have gone quiet, with an estimate of what a simple email could win back.",
  },
  {
    title: "What to sell next",
    text: "Spot products your customers buy together and ideas to bundle, plus which single product your revenue depends on too much.",
  },
  {
    title: "A forecast you can read",
    text: "Monthly revenue and a clear three-month outlook, without spreadsheets or jargon.",
  },
  {
    title: "Coming soon",
    text: "Free listing SEO checks, competitor comparison, profit after fees, and weekly action emails.",
  },
];

const steps = [
  { n: "1", title: "Export your orders", text: "Download a CSV from Shopify or Etsy. It takes about a minute." },
  { n: "2", title: "Drop it in", text: "Upload the file. No store login or password needed." },
  { n: "3", title: "Get your report", text: "See opportunities and next steps in plain language." },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8 md:py-12">
      <nav className="flex items-center justify-between">
        <span className="text-xl font-bold text-emerald-700">Storepulse</span>
        <Link href="/demo" className="text-sm font-medium text-gray-700 hover:text-emerald-700">
          See the live demo
        </Link>
      </nav>

      <section className="py-16 md:py-24">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-emerald-700">
          For small online sellers, anywhere in the world
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Find the money your store is leaving on the table.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-gray-600">
          Upload your Shopify or Etsy orders and see who is due to reorder, what to bundle, and where your revenue is
          heading. It is like having an analyst, without paying for one.
        </p>
        <div className="mt-8">
          <WaitlistForm id="top-form" />
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Curious first?{" "}
          <Link href="/demo" className="font-medium text-emerald-700 underline">
            Try the demo with sample data
          </Link>
          .
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-gray-600">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="py-16">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-gray-50 p-6 md:p-8">
        <h2 className="text-xl font-bold">Your data stays yours</h2>
        <p className="mt-2 max-w-3xl text-gray-600">
          Your file is analyzed and not kept. Customer emails are scrambled the moment they are read, so we never store
          who your customers are. Numbers are estimates and we show you exactly how we calculate them.
        </p>
      </section>

      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold">Be first in line</h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          Early members get a founding price and a say in what we build next.
        </p>
        <div className="mt-6 flex justify-center">
          <WaitlistForm />
        </div>
      </section>

      <footer className="border-t pt-6 text-sm text-gray-500">
        <Link href="/seo-checker" className="underline">Free listing SEO checker</Link> | <Link href="/privacy" className="underline">Privacy</Link> | Storepulse. Built for small sellers everywhere.
      </footer>
    </main>
  );
}





