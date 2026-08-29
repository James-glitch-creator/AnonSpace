import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "anonspace_token";
const PUBLIC_ONLY_PATHS = ["/", "/login", "/register"];
// Superadmins don't get the regular app UI or the rest of the admin panel - their job is
// registering/revoking admin accounts, plus Overview, looking up regular accounts and
// communities since they're still an admin, and their own Settings - so those are the only
// pages they're allowed on. Accounts stays their landing page. "/admin" is exact-only
// (Overview itself); the rest allow their own subpaths too (e.g. "/admin/users/{handle}").
const SUPERADMIN_HOME = "/admin/accounts";
const SUPERADMIN_EXACT_EXTRA_PATHS = ["/admin"];
const SUPERADMIN_EXTRA_PREFIXES = ["/admin/users", "/admin/communities", "/admin/settings"];
// Admins moderate, they don't use the site as a member - the admin panel is a wholly
// separate UI from the regular app, not just an extra page bolted onto it. Overview is
// their landing page after logging in.
const ADMIN_AREA = "/admin";
const ADMIN_HOME = "/admin";

/**
 * Reads the `role` claim straight off the JWT payload, unverified - a routing hint only.
 * Every protected backend action independently re-checks the live role from the
 * database, so a stale or forged claim here can't grant real access; at worst it sends
 * a request to the wrong page, which the page's own client-side guard also catches.
 */
function roleFromToken(token: string): string | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function homeFor(role: string | null): string {
  if (role === "superadmin") return SUPERADMIN_HOME;
  if (role === "admin") return ADMIN_HOME;
  return "/home";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token === undefined) {
    if (!PUBLIC_ONLY_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const role = roleFromToken(token);

  if (PUBLIC_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  const onSuperAdminHome = pathname === SUPERADMIN_HOME || pathname.startsWith(`${SUPERADMIN_HOME}/`);
  const onSuperAdminExtra =
    SUPERADMIN_EXACT_EXTRA_PATHS.includes(pathname) ||
    SUPERADMIN_EXTRA_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const onSuperAdminAllowed = onSuperAdminHome || onSuperAdminExtra;
  if (role === "superadmin" && !onSuperAdminAllowed) {
    return NextResponse.redirect(new URL(SUPERADMIN_HOME, request.url));
  }

  const onAdminArea = pathname === ADMIN_AREA || pathname.startsWith(`${ADMIN_AREA}/`);
  if (role === "admin" && !onAdminArea) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
