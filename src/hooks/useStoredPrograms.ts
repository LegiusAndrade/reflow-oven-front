"use client";

import { useEffect, useState } from "react";
import type { Program } from "@/lib/programs";
import { loadStoredPrograms, PROGRAMS_CHANGED_EVENT } from "@/lib/programStore";

/**
 * User-created programs from localStorage, kept in sync with changes in this tab
 * (PROGRAMS_CHANGED_EVENT) and other tabs (the native `storage` event). Starts empty so
 * the server and the first client render match, then fills in after mount.
 */
export function useStoredPrograms(): Program[] {
  const [stored, setStored] = useState<Program[]>([]);

  useEffect(() => {
    const sync = () => setStored(loadStoredPrograms());
    sync();
    window.addEventListener(PROGRAMS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRAMS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return stored;
}
