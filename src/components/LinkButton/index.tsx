import { clsx } from "clsx";
import Link from "next/link";
import { IconGeneral } from "../Icon/IconGeneral";

interface ILinkButtonProps {
  label: string;
  icon: string; // ex: "home"
  href: string;
  disabled?: boolean;
  /** Highlights this item as the current page. */
  active?: boolean;
  fill?: 0 | 1; // 0 = outline, 1 = filled
}

// Sizing mirrors the Figma SideBar at the 1024×600 baseline: 16px text (text-base),
// 22px icon, 16px/12px padding, 12px gap. The fluid text scale + icon clamp let it grow
// a little on larger screens.
export function LinkButton({ label, icon, href, fill = 1, active = false, disabled = false }: ILinkButtonProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex select-none items-center justify-start gap-3 px-4 py-3 text-base leading-tight [--icon-size:clamp(1.375rem,1.1rem+0.45vw,1.625rem)]",
        disabled ? "btn-link-disabled pointer-events-none cursor-not-allowed" : active ? "btn-link-active" : "btn-link"
      )}
    >
      <IconGeneral icon={icon} fill={fill} />
      <span>{label}</span>
    </Link>
  );
}
