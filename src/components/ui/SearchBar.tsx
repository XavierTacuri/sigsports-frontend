import type { InputHTMLAttributes } from 'react';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function SearchBar({ label = 'Buscar', ...props }: SearchBarProps) {
  return (
    <label className="block min-w-0 text-sm font-medium text-slate-700">
      {label}
      <input
        type="search"
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        {...props}
      />
    </label>
  );
}
