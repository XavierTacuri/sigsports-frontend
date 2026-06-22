import api from './axiosConfig';
import type { Jornada, JornadaPayload } from '../types';

export const jornadasApi = {
  listar: async () => (await api.get<Jornada[]>('/jornadas')).data,
  obtener: async (id: number) =>
    (await api.get<Jornada>(`/jornadas/${id}`)).data,
  listarPorCompetencia: async (idCompetencia: number) =>
    (await api.get<Jornada[]>(`/competencias/${idCompetencia}/jornadas`))
      .data,
  crear: async (payload: JornadaPayload) =>
    (await api.post<Jornada>('/jornadas', payload)).data,
  actualizar: async (id: number, payload: Partial<JornadaPayload>) =>
    (await api.patch<Jornada>(`/jornadas/${id}`, payload)).data,
};
