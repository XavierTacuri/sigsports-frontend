export interface PartidoJugador {
  id_partido_jugador?: number;
  id_partido: number;
  id_inscripcion_competencia: number;
  id_club: number;
  titular: boolean;
  ingreso: boolean;
  observacion?: string | null;
  estado: string;
  fecha_creacion?: string;
}

export type PartidoJugadorPayload = Omit<
  PartidoJugador,
  'id_partido_jugador' | 'estado' | 'fecha_creacion'
>;

export type PartidoJugadorUpdatePayload = Partial<
  Omit<PartidoJugador, 'id_partido_jugador' | 'id_partido' | 'fecha_creacion'>
>;
