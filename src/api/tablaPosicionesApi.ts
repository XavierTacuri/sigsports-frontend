import api from './axiosConfig';
import type { TablaPosicion } from '../types';

export const tablaPosicionesApi = {
  listarPorCompetencia: async (idCompetencia: number) =>
    (
      await api.get<TablaPosicion[]>(
        `/competencias/${idCompetencia}/tabla-posiciones`,
      )
    ).data,
  listarPorGrupo: async (idGrupo: number) =>
    (await api.get<TablaPosicion[]>(`/grupos/${idGrupo}/tabla-posiciones`))
      .data,
};
