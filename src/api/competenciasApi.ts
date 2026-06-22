import api from './axiosConfig';
import type { Competencia, CompetenciaPayload } from '../types';

export const competenciasApi = {
  listar: async () => (await api.get<Competencia[]>('/competencias')).data,
  crear: async (payload: CompetenciaPayload) =>
    (await api.post<Competencia>('/competencias', payload)).data,
  actualizar: async (id: number, payload: Partial<CompetenciaPayload>) =>
    (await api.patch<Competencia>(`/competencias/${id}`, payload)).data,
};
