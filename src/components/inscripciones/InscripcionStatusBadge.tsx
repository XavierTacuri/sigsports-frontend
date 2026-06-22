import type { EstadoInscripcion } from '../../types';

const styles: Record<EstadoInscripcion, string> = {
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  INACTIVA: 'bg-slate-200 text-slate-700',
  RETIRADA: 'bg-red-100 text-red-700',
  TRANSFERIDA: 'bg-blue-100 text-blue-700',
  SUSPENDIDA: 'bg-orange-100 text-orange-700',
};

interface InscripcionStatusBadgeProps {
  estado: string;
}

export function InscripcionStatusBadge({
  estado,
}: InscripcionStatusBadgeProps) {
  const normalizedEstado = estado.toUpperCase() as EstadoInscripcion;

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
