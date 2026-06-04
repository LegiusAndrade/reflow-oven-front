/**
 * Auth cookie definition — kept in its own pure module (no `next/headers`) so the Edge middleware
 * can import the name without pulling server-only APIs into the Edge bundle.
 */

/** Name of the httpOnly cookie holding the backend JWT (set by the BFF /api/auth/login route). */
export const AUTH_COOKIE = "reflow_token";

/**
 * Cookie attributes for the JWT. `httpOnly` keeps it out of client JS (the client gets the token via
 * /api/auth/ws-token); `SameSite=Strict` blocks CSRF; `maxAge` matches the JWT lifetime so they expire
 * together. `secure` is OFF by default because the kiosk serves over http on localhost — set the env
 * `AUTH_COOKIE_SECURE=true` behind https (a `secure` cookie is dropped over plain http).
 */
export function authCookie(value: string, maxAgeSec: number) {
  return {
    name: AUTH_COOKIE,
    value,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: maxAgeSec,
  };
}
