import api from './axiosConfig';
import type { TipoEvento, TipoEventoPayload } from '../types';

export const tiposEventosApi = {
  listar: async () =>
    (await api.get<TipoEvento[]>('/tipos-eventos')).data,
  obtener: async (id: number) =>
    (await api.get<TipoEvento>(`/tipos-eventos/${id}`)).data,
  crear: async (payload: TipoEventoPayload) =>
    (await api.post<TipoEvento>('/tipos-eventos', payload)).data,
  actualizar: async (id: number, payload: Partial<TipoEventoPayload>) =>
    (await api.patch<TipoEvento>(`/tipos-eventos/${id}`, payload)).data,
};
