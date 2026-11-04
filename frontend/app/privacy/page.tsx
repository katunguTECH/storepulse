import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy | Storepulse",
  description: "How Storepulse handles your email address, order files and listing text.",
};

export default function Privacy() {
  const h2 = "mt-8 text-xl font-bold";
  const p = "mt-2 text-gray-700";
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <Link href="/" className="text-xl font-bold text-emerald-700">
        Storepulse
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy policy</h1>
      <p className="mt-1 text-sm text-gray-500">Last updated: November 4, 2026</p>

      <h2 className={h2}>Who we are</h2>
      <p className={p}>
        Storepulse is operated by Henry Munyoki. You can reach us at katungu@gmail.com with any
        question about your data.
      </p>

      <h2 className={h2}>What we collect</h2>
      <p className={p}>
        Waitlist: if you join the waitlist, we store your email address and the date and time you signed up.
      </p>
      <p className={p}>
        Order files: if you upload an order export to the demo, we analyze it to produce your report. We do not save the
        file. Customer identifiers in it, such as email addresses, are scrambled as soon as they are read and are never
        stored in readable form.
      </p>
      <p className={p}>
        SEO checker: the listing text you paste is used to calculate your score. We do not save it.
      </p>
      <p className={p}>
        Technical data: our hosting providers may keep standard server logs, such as IP addresses and request times, for
        security and reliability. We also briefly hold your IP address in memory to limit repeated signups.
      </p>

      <h2 className={h2}>How we use it</h2>
      <p className={p}>
        We use your email address only to tell you about Storepulse, such as when it opens and important product
        updates. We do not sell your data, and we do not use it for advertising.
      </p>

      <h2 className={h2}>Who we share it with</h2>
      <p className={p}>
        We use service providers to run Storepulse, such as website hosting, a database, and later an email delivery
        service. They process data only to provide those services to us. We may also share information if the law
        requires it.
      </p>

      <h2 className={h2}>Cookies and tracking</h2>
      <p className={p}>We do not currently use advertising cookies or analytics trackers. If that changes, we will update this page.</p>

      <h2 className={h2}>How long we keep it</h2>
      <p className={p}>
        We keep waitlist emails until you ask us to remove them or until we no longer need the list for launching
        Storepulse, whichever comes first.
      </p>

      <h2 className={h2}>Your rights</h2>
      <p className={p}>
        You can ask us at any time to show you the data we hold about you, correct it, delete it, or stop emailing you.
        Email katungu@gmail.com and we will respond promptly. Depending on where you live, you may also have the
        right to complain to your local data protection authority.
      </p>

      <h2 className={h2}>International use</h2>
      <p className={p}>
        Storepulse is used worldwide, so your information may be processed in countries other than your own, where our
        providers operate.
      </p>

      <h2 className={h2}>Children</h2>
      <p className={p}>Storepulse is for business owners and is not directed at anyone under 18.</p>

      <h2 className={h2}>Changes</h2>
      <p className={p}>If we change this policy, we will update the date at the top of this page.</p>
    </main>
  );
}



