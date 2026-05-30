"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Keyboard from "react-simple-keyboard";

/**
 * Global on-screen keyboard for the touchscreen device.
 *
 * Mounted once (in AppShell) it listens for focus on any typeable field and
 * pops a virtual keyboard docked at the bottom of the screen. Keys are written
 * straight into the focused <input>/<textarea> via the native value setter so
 * React's controlled `onChange` fires exactly as if the user had typed.
 *
 * Numeric fields (type="number" / inputMode numeric) get a numpad layout; all
 * other text fields get a pt-BR QWERTY with a symbols/accents layer.
 */

type LayoutName = "default" | "shift" | "symbols" | "numeric";

// pt-BR oriented layouts. Functional keys are wrapped in {} and handled in
// onKeyPress; the rest are typed by the library itself.
const LAYOUT: Record<string, string[]> = {
  default: [
    "1 2 3 4 5 6 7 8 9 0 {bksp}",
    "q w e r t y u i o p",
    "a s d f g h j k l ç",
    "{shift} z x c v b n m , . -",
    "{symbols} @ {space} {enter} {close}",
  ],
  shift: [
    "1 2 3 4 5 6 7 8 9 0 {bksp}",
    "Q W E R T Y U I O P",
    "A S D F G H J K L Ç",
    "{shift} Z X C V B N M ; : _",
    "{symbols} @ {space} {enter} {close}",
  ],
  symbols: [
    "á à â ã é ê í ó ô õ {bksp}",
    "ú + - * / = % ( ) ~",
    "! ? # $ & _ \" ' : ;",
    "{abc} . , {space} {enter} {close}",
  ],
  numeric: ["7 8 9 {bksp}", "4 5 6 -", "1 2 3 .", "{close} 0 {enter}"],
};

const DISPLAY: Record<string, string> = {
  "{bksp}": "⌫",
  "{enter}": "⏎",
  "{space}": "espaço",
  "{shift}": "⇧",
  "{symbols}": "?á#",
  "{abc}": "ABC",
  "{close}": "✕",
};

const TYPEABLE_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", "password", "number", ""]);

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function isEditable(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if ((el as HTMLElement).closest?.(".vk-sheet")) return false; // keys of the keyboard itself
  if ((el as HTMLElement).dataset?.noOsk != null) return false; // explicit opt-out
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (!TYPEABLE_INPUT_TYPES.has(type)) return false;
    return !el.readOnly && !el.disabled;
  }
  return false;
}

function isNumericField(el: HTMLInputElement | HTMLTextAreaElement) {
  if (el instanceof HTMLInputElement && el.type === "number") return true;
  const mode = el.getAttribute("inputmode");
  return mode === "numeric" || mode === "decimal" || mode === "tel";
}

/**
 * The on-screen keyboard is only useful on the physical 1024×600 touchscreen, which has no
 * hardware keyboard. On bigger screens (e.g. a developer's desktop) there is a real keyboard, so
 * it stays hidden. This query matches the device — and a window resized to roughly that size for
 * testing — while excluding laptops/desktops, which are taller. (The SSR snapshot is false, so the
 * keyboard never renders on the server either.)
 */
const DEVICE_MEDIA_QUERY = "(max-width: 1024px) and (max-height: 640px)";

/** Subscribe to a media query without set-state-in-effect (server snapshot = false). */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

export function VirtualKeyboard() {
  const [open, setOpen] = useState(false);
  const [layoutName, setLayoutName] = useState<LayoutName>("default");
  const [isTextarea, setIsTextarea] = useState(false);
  const [maxLen, setMaxLen] = useState<number | undefined>(undefined);
  const isDeviceScreen = useMediaQuery(DEVICE_MEDIA_QUERY);

  const keyboard = useRef<{ setInput: (_value: string) => void } | null>(null);
  const activeEl = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const pendingSync = useRef<string | null>(null);

  const syncBuffer = useCallback((value: string) => {
    if (keyboard.current) keyboard.current.setInput(value);
    else pendingSync.current = value;
  }, []);

  const openFor = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement) => {
      activeEl.current = el;
      const numeric = isNumericField(el);
      setIsTextarea(el instanceof HTMLTextAreaElement);
      setLayoutName(numeric ? "numeric" : "default");
      const ml = el.getAttribute("maxlength");
      setMaxLen(ml ? Number(ml) : undefined);
      setOpen(true);
      syncBuffer(el.value ?? "");
      // keep the focused field visible above the docked keyboard
      window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    },
    [syncBuffer]
  );

  const close = useCallback(() => {
    setOpen(false);
    activeEl.current?.blur();
    activeEl.current = null;
  }, []);

  useEffect(() => {
    if (!isDeviceScreen) return;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (isEditable(el)) openFor(el);
    };
    const onFocusOut = () => {
      // Defer so we can read where focus actually landed. With
      // preventMouseDownDefault the inputs keep focus while typing, so this only
      // fires on genuine focus changes.
      window.requestAnimationFrame(() => {
        const next = document.activeElement;
        if (isEditable(next)) return; // moved to another field (its focusin handles it)
        if (next && (next as HTMLElement).closest?.(".vk-sheet")) return;
        if (open || activeEl.current) close();
      });
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [openFor, close, open, isDeviceScreen]);

  const handleChange = useCallback((input: string) => {
    const el = activeEl.current;
    if (!el) return;
    setNativeValue(el, input);
    // number inputs reject invalid intermediate strings -> resync the buffer
    if (el.value !== input) keyboard.current?.setInput(el.value);
  }, []);

  const handleKeyPress = useCallback(
    (button: string) => {
      switch (button) {
        case "{shift}":
          setLayoutName((n) => (n === "shift" ? "default" : "shift"));
          return;
        case "{symbols}":
          setLayoutName("symbols");
          return;
        case "{abc}":
          setLayoutName("default");
          return;
        case "{close}":
          close();
          return;
        case "{enter}":
          // textarea inserts a newline (newLineOnEnter); single-line fields treat
          // Enter as "done" and dismiss the keyboard.
          if (!isTextarea) close();
          return;
        default:
          return;
      }
    },
    [close, isTextarea]
  );

  if (!isDeviceScreen || !open) return null;

  return createPortal(
    <div className='vk-sheet' role='group' aria-label='Teclado virtual' onMouseDown={(e) => e.preventDefault()}>
      <Keyboard
        keyboardRef={(r) => {
          keyboard.current = r;
          if (r && pendingSync.current != null) {
            r.setInput(pendingSync.current);
            pendingSync.current = null;
          }
        }}
        theme='hg-theme-default vk-keyboard'
        layoutName={layoutName}
        layout={LAYOUT}
        display={DISPLAY}
        mergeDisplay
        preventMouseDownDefault
        newLineOnEnter={isTextarea}
        maxLength={maxLen}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
      />
    </div>,
    document.body
  );
}
