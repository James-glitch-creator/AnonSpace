import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "anonspace_token";
const PUBLIC_ONLY_PATHS = ["/", "/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE);

  if (!isAuthenticated && !PUBLIC_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAuthenticated && PUBLIC_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
