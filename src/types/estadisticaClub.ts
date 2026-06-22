export interface EstadisticaClub {
  id_estadistica_club?: number;
  id_competencia: number;
  id_club: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
  fecha_actualizacion?: string;
}
