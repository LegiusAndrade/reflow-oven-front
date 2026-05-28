"use client";

import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";

/** Light/dark theme toggle — flips `data-theme` on <html>. Mock: in-session only (resets on
 *  reload). TODO(backend/persist): remember the choice in localStorage and apply before paint. */
export function ThemeToggle() {
  const [dark, setDark] = useState(true); // layout defaults to data-theme="dark"

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label='Alterar tema'
      className='btn-press grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-white/10'
    >
      <IconGeneral icon={dark ? "dark_mode" : "light_mode"} fill={0} className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]' />
    </button>
  );
}
