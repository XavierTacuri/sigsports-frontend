import api from './axiosConfig';
import type { Deporte, DeportePayload } from '../types';

export const deportesApi = {
  listar: async () => (await api.get<Deporte[]>('/deportes')).data,
  crear: async (payload: DeportePayload) =>
    (await api.post<Deporte>('/deportes', payload)).data,
  actualizar: async (id: number, payload: Partial<DeportePayload>) =>
    (await api.patch<Deporte>(`/deportes/${id}`, payload)).data,
};
