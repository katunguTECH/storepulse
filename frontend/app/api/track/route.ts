import { recordVisit } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { ip, path } = await req.json();
    
    let country = "Unknown";
    let city = "Unknown";

    // Look up the city and country using the free ip-api.com service
    if (ip && ip !== "Unknown" && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
        if (res.ok) {
          const geo = await res.json();
          if (geo.status === "success") {
            country = geo.country || "Unknown";
            city = geo.city || "Unknown";
          }
        }
      } catch (e) {
        // If the lookup fails, fall back to Unknown
      }
    }

    await recordVisit(ip, country, city, path);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false }, { status: 500 });
  }
}