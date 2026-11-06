import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;
  
  if (
    url.startsWith("/admin") || 
    url.startsWith("/api") || 
    url.startsWith("/_next") || 
    url.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get the IP from Netlify's headers
  const ip = 
    request.headers.get("x-nf-client-connection-ip") || 
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
    "Unknown";

  // Fire and forget - send IP to our tracking route
  fetch(new URL("/api/track", request.url).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, path: url }),
  }).catch(() => {});

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};