import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import { authCookie } from "@/lib/authCookie";

/** Fallback cookie lifetime when the backend doesn't send `expiresAt` (the seeded JWT lasts ~8h). */
const DEFAULT_MAX_AGE_SEC = 8 * 60 * 60;

/**
 * BFF login: takes the credentials, authenticates against the backend, and on success stores the JWT
 * in an httpOnly cookie (the server's source of truth). Returns the session + token so the client can
 * keep the token in memory (transient) for SignalR/fetches. The backend stays a plain Bearer API.
 */
export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const result = await api.login((body.username ?? "").trim(), body.password ?? "");
    if (!result.ok || !result.token || !result.session) {
      return NextResponse.json({ ok: false, error: result.error ?? "Falha no login." });
    }
    const maxAge = result.expiresAt ? Math.max(1, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000)) : DEFAULT_MAX_AGE_SEC;
    (await cookies()).set(authCookie(result.token, maxAge));
    return NextResponse.json({ ok: true, session: result.session, token: result.token });
  } catch (e) {
    // A transport failure to the backend (status 0) carries the troubleshooting message; flag it so
    // the login screen shows its connection-help block. Credential errors (401) stay inline.
    if (e instanceof ApiError && e.status === 0) return NextResponse.json({ ok: false, error: e.message, kind: "connection" });
    return NextResponse.json({ ok: false, error: e instanceof ApiError ? e.message : "Falha no login." });
  }
}
