import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/authCookie";

/** Routes reachable without a session. Everything else needs the auth cookie. */
const PUBLIC_PATHS = ["/login"];

/**
 * Edge auth guard: redirect to /login when there's no auth cookie on a protected route, and bounce a
 * signed-in user away from /login. NOTE the app is currently fully client-rendered — every route ships
 * the same shell/spinner and hydrates on the client (see AppShell), so no page renders authed data on
 * the server. This guard therefore governs which URL is reachable, not server-withheld data; it's
 * ready for SSR if that's ever adopted. Role-based access stays in AppShell (it reads the decoded
 * session). The matcher below skips API routes, Next internals, fonts and static files.
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
