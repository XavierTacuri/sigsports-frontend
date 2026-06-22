export type TipoSancion =
  | 'TARJETA_ROJA'
  | 'DOBLE_AMARILLA_ACUMULADA'
  | 'MANUAL';

export type EstadoSancion = 'ACTIVA' | 'CUMPLIDA' | 'ANULADA' | 'SUSPENDIDA';

export interface Sancion {
  id_sancion?: number;
  id_competencia: number;
  id_jugador: number;
  id_inscripcion_competencia?: number;
  id_partido_origen?: number;
  tipo_sancion: TipoSancion | string;
  motivo?: string | null;
  partidos_suspension: number;
  partidos_cumplidos: number;
  estado_sancion: EstadoSancion | string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface SancionCreatePayload {
  id_competencia: number;
  id_jugador: number;
  id_inscripcion_competencia?: number;
  id_partido_origen?: number;
  tipo_sancion: TipoSancion | string;
  motivo?: string | null;
  partidos_suspension: number;
}

export type SancionUpdatePayload = Partial<SancionCreatePayload> & {
  partidos_cumplidos?: number;
  estado_sancion?: EstadoSancion | string;
};
