import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "anonspace_token";
// Anyone may reset their password, including visitors who no longer have a session.
// The other pages are guest-only entry points and should still redirect authenticated
// users to the appropriate home page.
const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];
const GUEST_ONLY_PATHS = ["/", "/login", "/register"];
// Superadmins inherit the complete admin panel and additionally manage admin accounts.
// Accounts remains their landing page so their extra supervisory tools are immediately
// available after login.
const SUPERADMIN_HOME = "/admin/accounts";
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
    if (!PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const role = roleFromToken(token);

  if (GUEST_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  // Keep password recovery available from Settings, even for admin accounts.
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const onAdminArea = pathname === ADMIN_AREA || pathname.startsWith(`${ADMIN_AREA}/`);
  if ((role === "admin" || role === "superadmin") && !onAdminArea) {
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  // Managing staff accounts is the one admin-panel capability reserved for superadmins.
  const onAdminAccounts = pathname === SUPERADMIN_HOME || pathname.startsWith(`${SUPERADMIN_HOME}/`);
  if (role === "admin" && onAdminAccounts) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
