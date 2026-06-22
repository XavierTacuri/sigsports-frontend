const classes: Record<string, string> = {
  BORRADOR: 'bg-amber-100 text-amber-700',
  FINALIZADA: 'bg-emerald-100 text-emerald-700',
  VALIDADA: 'bg-blue-100 text-blue-700',
  ANULADA: 'bg-red-100 text-red-700',
};

export function PlanillaStatusBadge({ estado }: { estado: string }) {
  const normalized = estado.trim().toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        classes[normalized] ?? 'bg-slate-200 text-slate-600'
      }`}
    >
      {estado}
    </span>
  );
}
