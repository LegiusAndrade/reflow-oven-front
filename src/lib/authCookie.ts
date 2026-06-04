/**
 * Auth cookie definition — kept in its own pure module (no `next/headers`) so the Edge middleware
 * can import the name without pulling server-only APIs into the Edge bundle.
 */

/** Name of the httpOnly cookie holding the backend JWT (set by the BFF /api/auth/login route). */
export const AUTH_COOKIE = "reflow_token";

/**
 * Cookie attributes for the JWT. `httpOnly` keeps it out of client JS (the client gets the token via
 * /api/auth/ws-token); `SameSite=Strict` blocks CSRF; `secure` is OFF because the kiosk serves over
 * http on localhost — turn it ON behind https. `maxAge` matches the JWT lifetime so they expire together.
 */
export function authCookie(value: string, maxAgeSec: number) {
  return { name: AUTH_COOKIE, value, httpOnly: true, sameSite: "strict" as const, secure: false, path: "/", maxAge: maxAgeSec };
}
