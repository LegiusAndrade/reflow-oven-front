import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/authCookie";

/**
 * BFF logout: best-effort backend notice for the audit/security log (carrying the token explicitly,
 * since the server has no in-memory token), then clear the httpOnly cookie. Never fails the logout.
 */
export async function POST() {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (token) {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  jar.delete(AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}
