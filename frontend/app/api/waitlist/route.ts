import { addEmail } from "@/lib/db";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const hits = new Map<string, number[]>();

// Simple in-memory limit: 5 signups per hour per visitor IP (per server instance).
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600 * 1000);
  if (recent.length >= 5) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ detail: "Invalid request." }, { status: 400 });
  }
  // Honeypot: real people never fill this field in.
  if (typeof body.website === "string" && body.website) {
    return Response.json({ ok: true });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (limited(ip)) {
    return Response.json({ detail: "Too many attempts. Please try again later." }, { status: 429 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ detail: "Please enter a valid email address." }, { status: 400 });
  }
  try {
    await addEmail(email);
  } catch {
    return Response.json({ detail: "We could not save your email right now. Please try again later." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
