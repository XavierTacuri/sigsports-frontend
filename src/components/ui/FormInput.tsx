import type { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function FormInput({
  label,
  id,
  helperText,
  readOnly,
  ...props
}: FormInputProps) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        id={id}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-md border px-3 py-2 outline-none ${
          readOnly
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600'
            : 'border-slate-300 text-slate-950 focus:border-slate-900 focus:ring-2 focus:ring-slate-200'
        }`}
        {...props}
      />
      {helperText ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
