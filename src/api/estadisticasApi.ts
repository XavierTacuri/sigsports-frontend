import api from './axiosConfig';
import type { EstadisticaClub, EstadisticaJugador } from '../types';

export const estadisticasApi = {
  clubesPorCompetencia: async (idCompetencia: number) =>
    (
      await api.get<EstadisticaClub[]>(
        `/competencias/${idCompetencia}/estadisticas-clubes`,
      )
    ).data,
  club: async (idClub: number) =>
    (await api.get<EstadisticaClub[]>(`/clubes/${idClub}/estadisticas`)).data,
  jugadoresPorCompetencia: async (idCompetencia: number) =>
    (
      await api.get<EstadisticaJugador[]>(
        `/competencias/${idCompetencia}/estadisticas-jugadores`,
      )
    ).data,
  jugador: async (idJugador: number) =>
    (
      await api.get<EstadisticaJugador[]>(
        `/jugadores/${idJugador}/estadisticas`,
      )
    ).data,
  goleadores: async (idCompetencia: number) =>
    (
      await api.get<EstadisticaJugador[]>(
        `/competencias/${idCompetencia}/goleadores`,
      )
    ).data,
};
