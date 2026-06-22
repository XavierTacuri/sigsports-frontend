import api from './axiosConfig';
import type { Escenario, EscenarioPayload } from '../types';

export const escenariosApi = {
  listar: async () => (await api.get<Escenario[]>('/escenarios')).data,
  obtener: async (id: number) =>
    (await api.get<Escenario>(`/escenarios/${id}`)).data,
  crear: async (payload: EscenarioPayload) =>
    (await api.post<Escenario>('/escenarios', payload)).data,
  actualizar: async (id: number, payload: Partial<EscenarioPayload>) =>
    (await api.patch<Escenario>(`/escenarios/${id}`, payload)).data,
};
