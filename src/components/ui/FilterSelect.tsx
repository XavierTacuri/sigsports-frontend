import type { SelectHTMLAttributes } from 'react';

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: FilterSelectOption[];
  allLabel?: string;
}

export function FilterSelect({
  label,
  options,
  allLabel = 'Todos',
  ...props
}: FilterSelectProps) {
  return (
    <label className="block min-w-0 text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        {...props}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
