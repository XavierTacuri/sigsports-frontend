import api from './axiosConfig';
import type { Club, ClubPayload } from '../types';

export const clubesApi = {
  listar: async () => (await api.get<Club[]>('/clubes')).data,
  crear: async (payload: ClubPayload) =>
    (await api.post<Club>('/clubes', payload)).data,
  actualizar: async (id: number, payload: Partial<ClubPayload>) =>
    (await api.patch<Club>(`/clubes/${id}`, payload)).data,
};
