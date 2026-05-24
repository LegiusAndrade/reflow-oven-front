import { clsx } from "clsx";
import Link from "next/link";
import { IconGeneral } from "../Icon/IconGeneral";

interface ILinkButtonProps {
  label: string;
  icon: string; // ex: "home"
  disabled?: boolean;
  href: string;
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
}

// Sizing mirrors the Figma SideBar buttons: 16px/12px padding, 22px icon, 16px text, 12px gap.
export function LinkButton({ label, icon, href, fill = 1, iconSizePx = 22, disabled = false }: ILinkButtonProps) {
  return (
    <Link
      href={href}
      style={{ ["--icon-size"]: `${iconSizePx}px` } as React.CSSProperties}
      className={clsx(
        "flex select-none items-center justify-start gap-3 px-4 py-3 text-base",
        disabled ? "btn-link-disabled pointer-events-none cursor-not-allowed" : "btn-link"
      )}
    >
      <IconGeneral icon={icon} fill={fill} />
      <span>{label}</span>
    </Link>
  );
}
