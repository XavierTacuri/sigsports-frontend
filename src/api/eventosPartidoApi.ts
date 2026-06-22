import api from './axiosConfig';
import type { EventoPartido, EventoPartidoPayload } from '../types';

export const eventosPartidoApi = {
  listar: async () =>
    (await api.get<EventoPartido[]>('/eventos-partido')).data,
  obtener: async (id: number) =>
    (await api.get<EventoPartido>(`/eventos-partido/${id}`)).data,
  listarPorPlanilla: async (idPlanilla: number) =>
    (
      await api.get<EventoPartido[]>(
        `/planillas-partido/${idPlanilla}/eventos`,
      )
    ).data,
  listarPorPartido: async (idPartido: number) =>
    (await api.get<EventoPartido[]>(`/partidos/${idPartido}/eventos`)).data,
  crear: async (payload: EventoPartidoPayload) =>
    (await api.post<EventoPartido>('/eventos-partido', payload)).data,
  actualizar: async (id: number, payload: Partial<EventoPartidoPayload>) =>
    (await api.patch<EventoPartido>(`/eventos-partido/${id}`, payload)).data,
};
