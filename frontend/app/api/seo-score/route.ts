import { scoreListing } from "@/lib/seo";

export async function POST(request: Request) {
  let b: Record<string, unknown> | null;
  try {
    b = await request.json();
  } catch {
    return Response.json({ detail: "Invalid request." }, { status: 400 });
  }
  if (!b || typeof b !== "object") {
    return Response.json({ detail: "Invalid request." }, { status: 400 });
  }
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const title = s(b.title, 300);
  if (!title.trim()) {
    return Response.json({ detail: "Please paste your listing title." }, { status: 400 });
  }
  return Response.json(
    scoreListing(title, s(b.description, 10000), s(b.tags, 1000), s(b.keyword, 100), s(b.platform, 20) || "etsy")
  );
}
