import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type BaseFieldProps = {
  label: string;
  hint?: string;
};

type TextFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    rightAction?: ReactNode;
  };
type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement>;

export function TextField({
  label,
  hint,
  rightAction,
  ...props
}: TextFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__input-wrap">
        <input
          className={`field__control${rightAction ? " field__control--with-action" : ""}`}
          {...props}
        />
        {rightAction ? (
          <span className="field__action">{rightAction}</span>
        ) : null}
      </span>
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
