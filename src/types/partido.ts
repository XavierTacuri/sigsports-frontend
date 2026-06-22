export type EstadoPartido =
  | 'PROGRAMADO'
  | 'EN_JUEGO'
  | 'FINALIZADO'
  | 'SUSPENDIDO'
  | 'CANCELADO';

export interface Partido {
  id_partido?: number;
  id_competencia: number;
  id_jornada: number;
  id_fase: number;
  id_grupo?: number | null;
  id_club_local: number;
  id_club_visitante: number;
  id_escenario?: number | null;
  fecha_partido: string;
  hora_partido: string;
  estado_partido: EstadoPartido | string;
  goles_local?: number | null;
  goles_visitante?: number | null;
  observaciones?: string | null;
  competencia?: {
    id_competencia?: number;
    nombre_competencia?: string | null;
  } | null;
  club_local?: {
    id_club?: number;
    nombre_club?: string | null;
  } | null;
  club_visitante?: {
    id_club?: number;
    nombre_club?: string | null;
  } | null;
  fase?: {
    id_fase?: number;
    nombre_fase?: string | null;
  } | null;
  escenario?: {
    id_escenario?: number;
    nombre_escenario?: string | null;
  } | null;
}

export type PartidoPayload = Omit<Partido, 'id_partido'>;
