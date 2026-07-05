import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import { authCookie } from "@/lib/authCookie";
import { getServerToken } from "@/lib/serverAuth";

/** Fallback cookie lifetime when the backend doesn't send `expiresAt` (the seeded JWT lasts ~8h). */
const DEFAULT_MAX_AGE_SEC = 8 * 60 * 60;

/**
 * BFF self-service password change. The backend revokes every token minted under the OLD password and
 * answers with a FRESH token + session (ChangePasswordResult) — so this route must swap the httpOnly
 * cookie for the new JWT in the same round-trip, exactly as login does; otherwise the next cookie read
 * (ws-token / a hard reload) would hand the client a revoked token and log the operator out. Returns
 * the login-like `{ ok, session, token }` so the client can adopt the new token in memory too.
 */
export async function POST(req: Request) {
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const token = await getServerToken();
  if (!token) return NextResponse.json({ ok: false, error: "Sessão expirada. Entre novamente." }, { status: 401 });

  try {
    // Server-side call: the in-memory token doesn't exist here, so the cookie JWT is passed explicitly.
    const result = await api.changePassword(body.currentPassword ?? "", body.newPassword ?? "", token);
    // Mirror login's guard: a 2xx body that isn't ok (or lacks the fresh token) must NOT touch the cookie.
    if (!result.ok || !result.token) {
      return NextResponse.json({ ok: false, error: "Não foi possível alterar a senha. Tente novamente." });
    }
    const maxAge = result.expiresAt ? Math.max(1, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000)) : DEFAULT_MAX_AGE_SEC;
    (await cookies()).set(authCookie(result.token, maxAge));
    return NextResponse.json({ ok: true, session: result.session, token: result.token });
  } catch (e) {
    // Forward the backend's pt-BR ProblemDetails message (e.g. "Senha atual incorreta.") with its
    // status; a transport failure (status 0) becomes a 502 with the connection-help message.
    if (e instanceof ApiError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status === 0 ? 502 : e.status });
    return NextResponse.json({ ok: false, error: "Não foi possível alterar a senha. Tente novamente." }, { status: 500 });
  }
}
