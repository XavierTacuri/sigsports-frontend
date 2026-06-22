const stateClasses: Record<string, string> = {
  ACTIVA: 'bg-orange-100 text-orange-700',
  CUMPLIDA: 'bg-emerald-100 text-emerald-700',
  ANULADA: 'bg-red-100 text-red-700',
};

const typeClasses: Record<string, string> = {
  TARJETA_ROJA: 'bg-red-100 text-red-700',
  ACUMULACION_AMARILLAS: 'bg-amber-100 text-amber-700',
  DOBLE_AMARILLA_ACUMULADA: 'bg-amber-100 text-amber-700',
  MANUAL: 'bg-blue-100 text-blue-700',
};

export function SancionEstadoBadge({ estado }: { estado: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stateClasses[estado] ?? 'bg-slate-100 text-slate-700'}`}>{estado}</span>;
}

export function SancionTipoBadge({ tipo }: { tipo: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typeClasses[tipo] ?? 'bg-slate-100 text-slate-700'}`}>{tipo.replace(/_/g, ' ')}</span>;
}
