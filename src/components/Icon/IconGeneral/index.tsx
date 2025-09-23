import clsx from 'clsx';

interface IIconGeneralProps {
  icon: string; // ex: "home"
  fill?: 0 | 1; // 0 = outline, 1 = filled
  className?: string;
}

export function IconGeneral({ icon, fill = 1, className }: IIconGeneralProps) {
  return (
    <span
      className={clsx('material-symbols-rounded leading-none', className)}
      style={{
        fontSize: 'var(--icon-size, 24px)',
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0`,
        fontOpticalSizing: 'auto',
      }}
    >
      {icon}
    </span>
  );
}
