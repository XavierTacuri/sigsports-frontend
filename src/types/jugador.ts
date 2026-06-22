export type EstadoJugador =
  | 'PENDIENTE_VALIDACION'
  | 'ACTIVO'
  | 'RECHAZADO'
  | 'OBSERVADO'
  | 'INACTIVO';

export interface Jugador {
  id_jugador?: number;
  id_club: number;
  codigo_externo?: string | null;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  lugar_nacimiento?: string | null;
  genero?: string | null;
  foto_url?: string | null;
  documento_identidad_url?: string | null;
  estado_jugador: EstadoJugador;
  id_usuario_registra?: number;
  id_usuario_valida?: number | null;
  fecha_registro?: string;
  fecha_validacion?: string | null;
  observacion_validacion?: string | null;
  motivo_rechazo?: string | null;
  fecha_actualizacion?: string | null;
}

export interface JugadorPayload {
  id_club: number;
  codigo_externo?: string | null;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  lugar_nacimiento?: string | null;
  genero?: string | null;
  foto_url?: string | null;
  documento_identidad_url?: string | null;
}

export interface JugadorUpdatePayload extends Partial<JugadorPayload> {
  observacion_validacion?: string | null;
}

export interface JugadorValidacionPayload {
  observacion?: string | null;
  motivo_rechazo?: string | null;
}

export interface CedulaJugadorValidacion {
  cedula: string;
  valida: boolean;
  existe: boolean;
  mensaje: string;
  jugador?: {
    id_jugador: number;
    nombre_completo: string;
    estado_jugador: string;
  } | null;
  club?: {
    id_club: number;
    nombre_club: string;
  } | null;
}
