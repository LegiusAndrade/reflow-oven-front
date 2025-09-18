import { clsx } from 'clsx';
import Link from 'next/link';

interface ILinkButtonProps {
  label: string;
  icon: string; // ex: "home"
  disabled?: boolean;
  href: string;
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
  weight?: number; // 100..700
}

export function LinkButton({ label, icon, href, iconSizePx = 24, fill = 1, weight = 400, disabled = false }: ILinkButtonProps) {
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
        'px-6 py-4 text-md ', // Largest padding on extra large screens and up
        'sm:px-2 sm:py-2', // Small padding on small screens and up
        'lg:px-2 lg:py-1', // Medium padding on medium screens and up
        'xl:px-2 xl:py-3' // Larger padding on large screens and up
      )}
    >
      <span
        className={clsx('material-symbols-rounded')}
        style={{
          fontSize: `${iconSizePx}px`,
          fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${iconSizePx}`,
        }}
      >
        {icon}
      </span>
      <span className='ml-2'>{label}</span>
    </Link>
  );
}
