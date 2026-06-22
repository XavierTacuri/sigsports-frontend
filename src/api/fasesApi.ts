import api from './axiosConfig';
import type { FaseCompetencia, FaseCompetenciaPayload } from '../types';

export const fasesApi = {
  listar: async () =>
    (await api.get<FaseCompetencia[]>('/fases-competencia')).data,
  obtener: async (id: number) =>
    (await api.get<FaseCompetencia>(`/fases-competencia/${id}`)).data,
  listarPorCompetencia: async (idCompetencia: number) =>
    (
      await api.get<FaseCompetencia[]>(
        `/competencias/${idCompetencia}/fases`,
      )
    ).data,
  crear: async (payload: FaseCompetenciaPayload) =>
    (await api.post<FaseCompetencia>('/fases-competencia', payload)).data,
  actualizar: async (
    id: number,
    payload: Partial<FaseCompetenciaPayload>,
  ) =>
    (await api.patch<FaseCompetencia>(`/fases-competencia/${id}`, payload))
      .data,
};
