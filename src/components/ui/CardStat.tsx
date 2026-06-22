import type { ReactNode } from 'react';

type CardStatTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

interface CardStatProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  tone?: CardStatTone;
}

const toneClasses: Record<CardStatTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function CardStat({
  title,
  value,
  icon,
  tone = 'slate',
}: CardStatProps) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-slate-950">
            {value}
          </p>
        </div>
        {icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ring-1 ${toneClasses[tone]}`}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}
