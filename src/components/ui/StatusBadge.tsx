interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  tone?: 'green' | 'amber' | 'red' | 'slate';
}

const toneClasses = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({
  active,
  activeLabel = 'ACTIVO',
  inactiveLabel = 'INACTIVO',
  tone = 'green',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? toneClasses[tone] : toneClasses.slate
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
