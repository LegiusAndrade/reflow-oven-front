import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/serverAuth";

/**
 * Hands the signed-in client its JWT (read from the httpOnly cookie) for the SignalR
 * accessTokenFactory and the in-memory token bootstrap on load. Returns 200 with `token: null` when
 * signed out — a normal state for the bootstrap, so it doesn't log a noisy console 401 on /login.
 */
export async function GET() {
  return NextResponse.json({ token: await getServerToken() });
}
