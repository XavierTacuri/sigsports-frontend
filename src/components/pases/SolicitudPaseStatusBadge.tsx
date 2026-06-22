import type { EstadoSolicitudPase } from '../../types';

const styles: Record<EstadoSolicitudPase, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  APROBADO: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  CANCELADO: 'bg-slate-200 text-slate-700',
};

interface SolicitudPaseStatusBadgeProps {
  estado: string;
}

export function SolicitudPaseStatusBadge({
  estado,
}: SolicitudPaseStatusBadgeProps) {
  const normalizedEstado = estado.trim().toUpperCase() as EstadoSolicitudPase;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalizedEstado] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {estado}
    </span>
  );
}
