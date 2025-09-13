import Link from 'next/link';

interface ILinkButtonProps {
  label: string;
  icon: string; // ex: "home"
  href: string;
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
  weight?: number; // 100..700
}

export function LinkButton({ label, icon, href, iconSizePx = 32, fill = 1, weight = 0 }: ILinkButtonProps) {
  return (
    <Link href={href} className='btn gap-2'>
      <span
        className='material-symbols-rounded'
        style={{
          fontSize: `${iconSizePx}px`,
          fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${iconSizePx}`,
        }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
