import api from './axiosConfig';
import type { Partido, PartidoPayload } from '../types';

export const partidosApi = {
  listar: async () => (await api.get<Partido[]>('/partidos')).data,
  obtener: async (id: number) =>
    (await api.get<Partido>(`/partidos/${id}`)).data,
  listarPorCompetencia: async (idCompetencia: number) =>
    (await api.get<Partido[]>(`/competencias/${idCompetencia}/partidos`))
      .data,
  listarPorJornada: async (idJornada: number) =>
    (await api.get<Partido[]>(`/jornadas/${idJornada}/partidos`)).data,
  listarPorGrupo: async (idGrupo: number) =>
    (await api.get<Partido[]>(`/grupos/${idGrupo}/partidos`)).data,
  crear: async (payload: PartidoPayload) =>
    (await api.post<Partido>('/partidos', payload)).data,
  actualizar: async (id: number, payload: Partial<PartidoPayload>) =>
    (await api.patch<Partido>(`/partidos/${id}`, payload)).data,
};
