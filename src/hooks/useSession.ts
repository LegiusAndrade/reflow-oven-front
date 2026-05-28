"use client";

import { useStore } from "@/hooks/useStore";
import { type Session, sessionStore } from "@/lib/auth";

/** The current logged-in session (or null). */
export function useSession(): Session | null {
  return useStore(sessionStore);
}
