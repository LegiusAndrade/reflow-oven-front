import { cookies } from "next/headers";
import { AUTH_COOKIE } from "./authCookie";

/**
 * Read the JWT from the httpOnly cookie, server-side (Route Handlers + RSC). This is the server's
 * source of truth for auth — never a module variable, which would be shared across all users'
 * requests on the server. The Edge middleware reads `req.cookies` instead (it can't use next/headers).
 */
export async function getServerToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE)?.value ?? null;
}
