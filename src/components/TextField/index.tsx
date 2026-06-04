import { clsx } from "clsx";

export interface ITextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (_value: string) => void;
  type?: string;
  maxLength?: number;
  className?: string;
}

/**
 * Outlined text field with an animated floating label: the label sits inside the field
 * (like a placeholder) and animates up onto the top border when focused or filled.
 * Driven purely by CSS via the `peer` + `:placeholder-shown` trick (placeholder is a space).
 */
export function TextField({ id, label, value, onChange, type = "text", maxLength, className }: ITextFieldProps) {
  return (
    <div className={clsx("relative", className)}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder=' '
        className='peer w-full rounded-xl border border-(--border) bg-transparent px-3 pb-2 pt-4 outline-none transition-colors focus:border-(--brand)'
      />
      <label
        htmlFor={id}
        className={clsx(
          "pointer-events-none absolute left-2 top-1/2 origin-left -translate-y-1/2 rounded bg-(--card-bg) px-1 opacity-60 transition-all duration-150",
          // Floated state: focused OR filled (not showing the placeholder)
          "peer-focus:top-0 peer-focus:text-xs peer-focus:text-(--brand) peer-focus:opacity-100",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:opacity-100"
        )}
      >
        {label}
      </label>
    </div>
  );
}
