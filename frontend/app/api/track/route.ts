import { recordVisit } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { country, city, path } = await req.json();
    await recordVisit(country, city, path);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false }, { status: 500 });
  }
}
