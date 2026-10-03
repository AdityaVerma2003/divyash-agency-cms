import { NextResponse, type NextRequest } from "next/server";

// Paths that always stay reachable, even during maintenance — the staff
// portal, auth flow, and the maintenance page itself (avoids a redirect loop).
const ALWAYS_ALLOWED_PREFIXES = ["/admin", "/workspace", "/team", "/login", "/maintenance"];

async function isMaintenanceEnabled(): Promise<boolean> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const res = await fetch(`${apiBase}/public/site-settings`, {
      // Edge middleware re-fetches per request; the endpoint itself sets a
      // short Cache-Control, which is the main throttle here.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { maintenanceEnabled?: boolean };
    return Boolean(data.maintenanceEnabled);
  } catch {
    // Fail open — a settings-fetch hiccup must never take the whole site down.
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Everything else — the public marketing site and /client/* — gates on
  // the maintenance flag. Auth is a localStorage token, invisible to
  // middleware, so /client/* can't be told apart from the public site here;
  // that's fine, both are meant to go down together.
  if (await isMaintenanceEnabled()) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - _next/static, _next/image (build assets)
     * - favicon and other files with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
