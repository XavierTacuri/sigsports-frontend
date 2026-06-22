export interface EstadisticaJugador {
  id_estadistica_jugador?: number;
  id_competencia: number;
  id_club: number;
  id_jugador: number;
  partidos_jugados: number;
  goles: number;
  autogoles: number;
  asistencias: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  minutos_jugados: number;
  fecha_actualizacion?: string;
}
