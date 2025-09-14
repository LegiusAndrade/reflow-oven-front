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
  return (
    <Link href={href} className={'flex w-full items-center ' + (disabled ? 'btn-link-disabled cursor-not-allowed pointer-events-none' : 'btn-link')}>
      <span
        className='material-symbols-rounded'
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
