import api from './axiosConfig';
import type { GrupoClub, GrupoClubPayload } from '../types';

export const grupoClubesApi = {
  listar: async () => (await api.get<GrupoClub[]>('/grupo-clubes')).data,
  listarPorGrupo: async (idGrupo: number) =>
    (await api.get<GrupoClub[]>(`/grupos/${idGrupo}/clubes`)).data,
  listarPorClub: async (idClub: number) =>
    (await api.get<GrupoClub[]>(`/clubes/${idClub}/grupos`)).data,
  crear: async (payload: GrupoClubPayload) =>
    (await api.post<GrupoClub>('/grupo-clubes', payload)).data,
  actualizar: async (id: number, payload: Partial<GrupoClubPayload>) =>
    (await api.patch<GrupoClub>(`/grupo-clubes/${id}`, payload)).data,
};
