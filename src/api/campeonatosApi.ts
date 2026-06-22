import api from './axiosConfig';
import type { Campeonato, CampeonatoPayload } from '../types';

export const campeonatosApi = {
  listar: async () => (await api.get<Campeonato[]>('/campeonatos')).data,
  crear: async (payload: CampeonatoPayload) =>
    (await api.post<Campeonato>('/campeonatos', payload)).data,
  actualizar: async (id: number, payload: Partial<CampeonatoPayload>) =>
    (await api.patch<Campeonato>(`/campeonatos/${id}`, payload)).data,
};
