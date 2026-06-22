export interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion?: string;
}

export interface Usuario {
  id_usuario?: number;
  id_rol: number;
  nombre_completo: string;
  correo_electronico: string;
  contrasena?: string;
  telefono: string | null;
  activo: boolean;
  rol?: Rol | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface UsuarioCreatePayload {
  id_rol: number;
  nombre_completo: string;
  correo_electronico: string;
  contrasena: string;
  telefono: string | null;
  activo: boolean;
}

export interface UsuarioUpdatePayload {
  id_rol?: number;
  nombre_completo?: string;
  correo_electronico?: string;
  telefono?: string | null;
  activo?: boolean;
}
