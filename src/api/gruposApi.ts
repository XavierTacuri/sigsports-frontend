import api from './axiosConfig';
import type { Grupo, GrupoPayload } from '../types';

export const gruposApi = {
  listar: async () => (await api.get<Grupo[]>('/grupos')).data,
  obtener: async (id: number) =>
    (await api.get<Grupo>(`/grupos/${id}`)).data,
  listarPorCompetencia: async (idCompetencia: number) =>
    (await api.get<Grupo[]>(`/competencias/${idCompetencia}/grupos`)).data,
  crear: async (payload: GrupoPayload) =>
    (await api.post<Grupo>('/grupos', payload)).data,
  actualizar: async (id: number, payload: Partial<GrupoPayload>) =>
    (await api.patch<Grupo>(`/grupos/${id}`, payload)).data,
};
