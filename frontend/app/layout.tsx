import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Storepulse | Find the money your store is leaving on the table",
  description:
    "Upload your Shopify or Etsy orders to find out who is due to reorder, calculate your true profit, and get a weekly action plan. Built for small online sellers worldwide.",
  icons: {
    icon: "/logo.jpg",
  },
  openGraph: {
    title: "Storepulse | Find the money your store is leaving on the table",
    description:
      "Upload your Shopify or Etsy orders and see which customers are due to reorder, what to bundle, and where your revenue is heading.",
    url: "https://storepulse1.netlify.app",
    siteName: "Storepulse",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}