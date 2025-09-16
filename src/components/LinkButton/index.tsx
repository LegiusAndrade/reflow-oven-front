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
  const baseClass = clsx(
    'inline-flex', // Display as an inline-level flex container (stays inline with text/siblings)
    'items-center', // Center items on the cross axis (vertical by default in a row layout)
    'justify-center', // Center items on the main axis (horizontal by default in a row layout)
    'select-none', // Prevent text selection (improves button UX)
    'sm:px-3 sm:py-2', // Small padding on small screens and up
    'lg:px-4 md:py-2', // Medium padding on medium screens and up
    'xl:px-5 lg:py-3' // Larger padding on large screens and up
  );

  return (
    <Link href={href} className={'flex w-full items-center ' + (disabled ? 'btn-link-disabled cursor-not-allowed pointer-events-none' : 'btn-link')}>
      <span
        className={clsx('material-symbols-rounded', baseClass)}
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
