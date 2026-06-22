export function GeneralStatusBadge({ estado }: { estado: string }) {
  const active = estado.trim().toUpperCase() === 'ACTIVO';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-200 text-slate-600'
      }`}
    >
      {estado}
    </span>
  );
}

const partidoClasses: Record<string, string> = {
  PROGRAMADO: 'bg-blue-100 text-blue-700',
  EN_JUEGO: 'bg-amber-100 text-amber-700',
  FINALIZADO: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDO: 'bg-orange-100 text-orange-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

export function PartidoStatusBadge({ estado }: { estado: string }) {
  const normalized = estado.trim().toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        partidoClasses[normalized] ?? 'bg-slate-200 text-slate-600'
      }`}
    >
      {estado}
    </span>
  );
}
