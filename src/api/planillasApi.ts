import api from './axiosConfig';
import type {
  PlanillaMarcadorPayload,
  PlanillaPartido,
  PlanillaPartidoCreatePayload,
  PlanillaPartidoUpdatePayload,
} from '../types';

export const planillasApi = {
  listar: async () =>
    (await api.get<PlanillaPartido[]>('/planillas-partido')).data,
  obtener: async (id: number) =>
    (await api.get<PlanillaPartido>(`/planillas-partido/${id}`)).data,
  obtenerPorPartido: async (idPartido: number) =>
    (await api.get<PlanillaPartido>(`/partidos/${idPartido}/planilla`)).data,
  crear: async (payload: PlanillaPartidoCreatePayload) =>
    (await api.post<PlanillaPartido>('/planillas-partido', payload)).data,
  actualizar: async (id: number, payload: PlanillaPartidoUpdatePayload) =>
    (await api.patch<PlanillaPartido>(`/planillas-partido/${id}`, payload))
      .data,
  guardarMarcador: async (id: number, payload: PlanillaMarcadorPayload) =>
    (
      await api.patch<PlanillaPartido>(
        `/planillas-partido/${id}/marcador`,
        payload,
      )
    ).data,
  finalizar: async (id: number) =>
    (
      await api.patch<PlanillaPartido>(
        `/planillas-partido/${id}/finalizar`,
      )
    ).data,
};
