import type { EstadoJugador } from './jugador';

export type EstadoSolicitudPase =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'CANCELADO';

export interface SolicitudPase {
  id_pase?: number;
  id_jugador: number;
  id_club_origen: number;
  id_club_destino: number;
  id_usuario_solicita?: number;
  id_usuario_revisa?: number | null;
  estado_pase: EstadoSolicitudPase | string;
  motivo_solicitud?: string | null;
  observacion_revision?: string | null;
  fecha_solicitud?: string;
  fecha_revision?: string | null;
  jugador?: {
    id_jugador?: number;
    cedula?: string | null;
    nombres?: string | null;
    apellidos?: string | null;
    nombre_completo?: string | null;
    estado_jugador?: string | null;
  } | null;
  club_origen?: {
    id_club?: number;
    nombre_club?: string | null;
  } | null;
  club_destino?: {
    id_club?: number;
    nombre_club?: string | null;
  } | null;
  usuario_solicita?: {
    id_usuario?: number;
    nombre_completo?: string | null;
  } | null;
  usuario_revisa?: {
    id_usuario?: number;
    nombre_completo?: string | null;
  } | null;
  nombre_jugador?: string | null;
  jugador_nombre?: string | null;
  cedula_jugador?: string | null;
  jugador_cedula?: string | null;
  nombre_club_origen?: string | null;
  club_origen_nombre?: string | null;
  nombre_club_destino?: string | null;
  club_destino_nombre?: string | null;
  nombre_usuario_solicita?: string | null;
  solicitado_por?: string | null;
}

export interface SolicitudPaseCreatePayload {
  id_jugador: number;
  id_club_destino: number;
  motivo_solicitud: string;
}

export interface JugadorBusquedaPase {
  id_jugador: number;
  id_club: number;
  cedula: string;
  nombre_completo: string;
  estado_jugador: EstadoJugador;
  nombre_club?: string;
  nombre_club_actual?: string;
  club_actual?:
    | string
    | {
        id_club?: number;
        nombre_club?: string;
      };
}

export interface SolicitudPaseRevisionPayload {
  observacion_revision: string;
}
