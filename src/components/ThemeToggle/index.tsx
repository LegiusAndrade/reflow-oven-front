"use client";

import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { preferencesStore, setTheme } from "@/lib/preferences";
import { resolveTheme } from "@/lib/theme";

/** Light/dark theme toggle — flips `data-theme` on <html>. The choice is persisted per-user via
 *  setTheme() (applies it immediately and saves to the backend). A "system" value arriving from the
 *  backend is honored by reflecting its resolved (dark/light) state here. */
export function ThemeToggle() {
  const prefs = useStore(preferencesStore);
  const dark = resolveTheme(prefs.theme) === "dark";

  const toggle = () => {
    void setTheme(dark ? "light" : "dark");
  };

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label='Alterar tema'
      className='btn-press grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-(--hover)'
    >
      <IconGeneral icon={dark ? "dark_mode" : "light_mode"} fill={0} className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]' />
    </button>
  );
}
