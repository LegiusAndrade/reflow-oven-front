import clsx from 'clsx';

interface IIconGeneralProps {
  icon: string; // ex: "home"
  iconSizePx?: number;
  fill?: 0 | 1; // 0 = outline, 1 = filled
  className?: string;
}

export function IconGeneral({ icon, iconSizePx = 24, fill = 1 }: IIconGeneralProps) {
  return (
    <span
      className={clsx('material-symbols-rounded')}
      style={{
        fontSize: `${iconSizePx}px`,
        fontVariationSettings: `'FILL' ${fill}, 'wght 400', 'GRAD' 0, 'opsz' ${iconSizePx}`,
      }}
    >
      {icon}
    </span>
  );
}
