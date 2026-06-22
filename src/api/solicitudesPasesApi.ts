import api from './axiosConfig';
import type {
  JugadorBusquedaPase,
  SolicitudPase,
  SolicitudPaseCreatePayload,
  SolicitudPaseRevisionPayload,
} from '../types';

export const getSolicitudesPases = async () =>
  (await api.get<SolicitudPase[]>('/solicitudes-pases')).data;

export const getSolicitudPaseById = async (id: number) =>
  (await api.get<SolicitudPase>(`/solicitudes-pases/${id}`)).data;

export const getSolicitudesPendientes = async () =>
  (await api.get<SolicitudPase[]>('/solicitudes-pases/pendientes')).data;

export const getSolicitudesByJugador = async (idJugador: number) =>
  (
    await api.get<SolicitudPase[]>(
      `/jugadores/${idJugador}/solicitudes-pases`,
    )
  ).data;

export const buscarJugadorParaPase = async (cedula: string) =>
  (
    await api.get<JugadorBusquedaPase>(
      `/solicitudes-pases/buscar-jugador/${encodeURIComponent(cedula)}`,
    )
  ).data;

export const createSolicitudPase = async (
  data: SolicitudPaseCreatePayload,
) =>
  (await api.post<SolicitudPase>('/solicitudes-pases', data)).data;

export const aprobarSolicitudPase = async (
  id: number,
  data: SolicitudPaseRevisionPayload,
) =>
  (
    await api.patch<SolicitudPase>(
      `/solicitudes-pases/${id}/aprobar`,
      data,
    )
  ).data;

export const rechazarSolicitudPase = async (
  id: number,
  data: SolicitudPaseRevisionPayload,
) =>
  (
    await api.patch<SolicitudPase>(
      `/solicitudes-pases/${id}/rechazar`,
      data,
    )
  ).data;

export const cancelarSolicitudPase = async (id: number) =>
  (
    await api.patch<SolicitudPase>(
      `/solicitudes-pases/${id}/cancelar`,
    )
  ).data;

export const solicitudesPasesApi = {
  getSolicitudesPases,
  getSolicitudPaseById,
  getSolicitudesPendientes,
  getSolicitudesByJugador,
  buscarJugadorParaPase,
  createSolicitudPase,
  aprobarSolicitudPase,
  rechazarSolicitudPase,
  cancelarSolicitudPase,
};
