import { clsx } from "clsx";

export interface IMenuToggleProps {
  /** Whether the menu is open (drives the hamburger → X morph). */
  open: boolean;
  onClick?: () => void;
}

/**
 * Hamburger button that morphs into an "X" when the menu is open: the top and
 * bottom bars rotate ±45° to the center while the middle bar fades out.
 */
export default function MenuToggle({ open, onClick }: IMenuToggleProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-expanded={open}
      className='btn-press grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
    >
      <span className='relative block h-[18px] w-7'>
        <span
          className={clsx(
            "absolute left-0 top-0 h-0.5 w-7 origin-center rounded-full bg-current transition-transform duration-300",
            open && "translate-y-[8px] rotate-45"
          )}
        />
        <span
          className={clsx(
            "absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-opacity duration-300",
            open && "opacity-0"
          )}
        />
        <span
          className={clsx(
            "absolute bottom-0 left-0 h-0.5 w-7 origin-center rounded-full bg-current transition-transform duration-300",
            open && "-translate-y-[8px] -rotate-45"
          )}
        />
      </span>
    </button>
  );
}
