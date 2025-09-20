import { clsx } from 'clsx';
import Link from 'next/link';
import { IconGeneral } from '../Icon/IconGeneral';

interface ILinkButtonProps {
  label: string;
  icon: string; // ex: "home"
  disabled?: boolean;
  href: string;
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
}

export function LinkButton({ label, icon, href, fill = 1, iconSizePx = 24, disabled = false }: ILinkButtonProps) {
  //sm(640), md(768), lg(1024), xl(1280), 2xl(1536)

  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex', // Display as an inline-level flex container (stays inline with text/siblings)
        'items-center', // Center items on the cross axis (vertical by default in a row layout)
        'justify-start', // Align items to the start of the main axis (left by default in a row layout)
        'select-none', // Prevent text selection (improves button UX)
        disabled ? 'btn-link-disabled cursor-not-allowed pointer-events-none' : 'btn-link', // Apply disabled styles if disabled, otherwise apply normal button styles
        'px-6 py-4 text-base ', // Default padding and text size
        'lg:px-6 lg:py-3 lg:text-lg', // Medium padding on medium screens and up
        'xl:px-8 xl:py-4 xl:text-lg' // Larger padding on large screens and up
      )}
    >
      <IconGeneral icon={icon} iconSizePx={iconSizePx} fill={fill} />
      <span className='ml-2'>{label}</span>
    </Link>
  );
}
