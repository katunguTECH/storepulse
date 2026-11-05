import { buildReport, normalizeUpload, UserError } from "@/lib/analytics";
import { getRates } from "@/lib/rates";

const MAX_BYTES = 4 * 1024 * 1024;

// Simple in-memory limit: 5 uploads per hour per visitor IP (per server instance).
const hits = new Map<string, number[]>();

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
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (limited(ip)) {
    return Response.json(
      { detail: "Too many uploads. Please try again in an hour." },
      { status: 429 }
    );
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ detail: "We could not read this upload. Please choose a CSV file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ detail: "Please choose a CSV file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ detail: "File is too large (4 MB maximum)." }, { status: 413 });
  }
  try {
    const text = await file.text();
    const rates = await getRates();
    const { lines, warnings } = normalizeUpload(text, rates);
    return Response.json(buildReport(lines, "upload", warnings));
  } catch (e) {
    const detail =
      e instanceof UserError ? e.message : "We could not read this file. Please upload an order export in CSV format.";
    return Response.json({ detail }, { status: 400 });
  }
}
