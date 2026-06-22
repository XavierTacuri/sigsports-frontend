import api from './axiosConfig';
import type {
  PartidoJugador,
  PartidoJugadorPayload,
  PartidoJugadorUpdatePayload,
} from '../types';

export const partidoJugadoresApi = {
  listar: async () =>
    (await api.get<PartidoJugador[]>('/partido-jugadores')).data,
  obtener: async (id: number) =>
    (await api.get<PartidoJugador>(`/partido-jugadores/${id}`)).data,
  listarPorPartido: async (idPartido: number) =>
    (await api.get<PartidoJugador[]>(`/partidos/${idPartido}/jugadores`))
      .data,
  crear: async (payload: PartidoJugadorPayload) =>
    (await api.post<PartidoJugador>('/partido-jugadores', payload)).data,
  crearBulk: async (idPartido: number, jugadores: PartidoJugadorPayload[]) =>
    (
      await api.post<PartidoJugador[]>(`/partidos/${idPartido}/jugadores/bulk`, {
        jugadores: jugadores.map(
          ({
            id_inscripcion_competencia,
            titular,
            ingreso,
            observacion,
          }) => ({
            id_inscripcion_competencia,
            titular,
            ingreso,
            observacion: observacion || null,
          }),
        ),
      })
    ).data,
  actualizar: async (id: number, payload: PartidoJugadorUpdatePayload) =>
    (await api.patch<PartidoJugador>(`/partido-jugadores/${id}`, payload))
      .data,
};
