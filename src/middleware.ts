import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/authCookie";

/** Routes reachable without a session. Everything else needs the auth cookie. */
const PUBLIC_PATHS = ["/login"];

/**
 * Server-side auth guard: redirect to /login when there's no auth cookie on a protected route (so an
 * authed page never renders — important once those pages fetch on the server), and bounce a signed-in
 * user away from /login. Role-based access stays in AppShell (it can read the decoded session). The
 * matcher below skips API routes, Next internals, fonts and static files.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasToken && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasToken && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|fonts|favicon.ico|.*\\.).*)"],
};
