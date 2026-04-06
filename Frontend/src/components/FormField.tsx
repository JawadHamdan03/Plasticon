import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

type BaseFieldProps = {
  label: string;
  hint?: string;
};

type TextFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement>;

export function TextField({ label, hint, ...props }: TextFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__control" {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="field__control" {...props}>
        {children}
      </select>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
