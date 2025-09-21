import clsx from 'clsx';

interface IIconGeneralProps {
  icon: string; // ex: "home"
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
  className?: string;
}

export function IconGeneral({ icon, fill = 1, className }: { icon: string; fill?: 0 | 1; className?: string }) {
  return (
    <span
      className={clsx('material-symbols-rounded leading-none', className)}
      style={{
        fontSize: 'var(--icon-size, 24px)',
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' var(--icon-size, 24)`,
      }}
    >
      {icon}
    </span>
  );
}
