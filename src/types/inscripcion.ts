export type EstadoInscripcion =
  | 'ACTIVA'
  | 'INACTIVA'
  | 'RETIRADA'
  | 'TRANSFERIDA'
  | 'SUSPENDIDA';

export interface InscripcionCompetencia {
  id_inscripcion_competencia?: number;
  id_competencia: number;
  id_club: number;
  id_jugador: number;
  numero_camiseta?: number | null;
  anio_participacion?: number | null;
  estado_inscripcion: EstadoInscripcion | string;
  observaciones?: string | null;
  fecha_inscripcion?: string;
}

export interface InscripcionCreatePayload {
  id_competencia: number;
  id_club: number;
  id_jugador: number;
  numero_camiseta: number | null;
  anio_participacion: number;
  observaciones: string | null;
}

export interface InscripcionUpdatePayload {
  numero_camiseta?: number | null;
  anio_participacion?: number | null;
  estado_inscripcion?: EstadoInscripcion;
  observaciones?: string | null;
}

export interface InscripcionDelegadoUpdatePayload {
  numero_camiseta?: number;
  observaciones?: string | null;
}
