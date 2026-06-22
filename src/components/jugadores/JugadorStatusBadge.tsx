import type { EstadoJugador } from '../../types';

const styles: Record<EstadoJugador, string> = {
  PENDIENTE_VALIDACION: 'bg-amber-100 text-amber-800',
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  OBSERVADO: 'bg-orange-100 text-orange-700',
  INACTIVO: 'bg-slate-200 text-slate-600',
};

const labels: Record<EstadoJugador, string> = {
  PENDIENTE_VALIDACION: 'Pendiente',
  ACTIVO: 'Activo',
  RECHAZADO: 'Rechazado',
  OBSERVADO: 'Observado',
  INACTIVO: 'Inactivo',
};

export function JugadorStatusBadge({ estado }: { estado: EstadoJugador }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[estado] ?? styles.INACTIVO
      }`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}
