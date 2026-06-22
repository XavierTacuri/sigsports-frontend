import api from './axiosConfig';
import type {
  Sancion,
  SancionCreatePayload,
  SancionUpdatePayload,
} from '../types';

type SancionesResponse = Sancion[] | { items?: Sancion[]; sanciones?: Sancion[] };
type SancionObservacionPayload = { observacion?: string | null };
type SancionAmpliarPayload = SancionObservacionPayload & {
  partidos_extra: number;
};

const normalize = (data: SancionesResponse) =>
  Array.isArray(data) ? data : data.items ?? data.sanciones ?? [];

export type SancionActiva = Sancion;

export const sancionesApi = {
  listar: async () => normalize((await api.get<SancionesResponse>('/sanciones')).data),
  obtener: async (id: number) =>
    (await api.get<Sancion>(`/sanciones/${id}`)).data,
  listarPorJugador: async (idJugador: number) =>
    normalize(
      (await api.get<SancionesResponse>(`/jugadores/${idJugador}/sanciones`))
        .data,
    ),
  listarPorCompetencia: async (idCompetencia: number) =>
    normalize(
      (
        await api.get<SancionesResponse>(
          `/competencias/${idCompetencia}/sanciones`,
        )
      ).data,
    ),
  listarActivas: async () =>
    normalize((await api.get<SancionesResponse>('/sanciones/activas')).data),
  crear: async (payload: SancionCreatePayload) =>
    (await api.post<Sancion>('/sanciones', payload)).data,
  actualizar: async (id: number, payload: SancionUpdatePayload) =>
    (await api.patch<Sancion>(`/sanciones/${id}`, payload)).data,
  ampliar: async (id: number, payload: SancionAmpliarPayload) =>
    (await api.patch<Sancion>(`/sanciones/${id}/ampliar`, payload)).data,
  suspender: async (id: number, payload: SancionObservacionPayload) =>
    (await api.patch<Sancion>(`/sanciones/${id}/suspender`, payload)).data,
  anular: async (id: number, payload: SancionObservacionPayload = {}) =>
    (await api.patch<Sancion>(`/sanciones/${id}/anular`, payload)).data,
  cumplir: async (id: number) =>
    (await api.patch<Sancion>(`/sanciones/${id}/cumplir`)).data,
};
