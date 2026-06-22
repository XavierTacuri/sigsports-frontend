export type Role = 'ADMINISTRADOR' | 'SECRETARIA' | 'DELEGADO' | 'PLANILLERO';

export interface AuthUser {
  id_usuario: number;
  id_rol: number;
  nombre_completo: string;
  correo_electronico: string;
  telefono?: string;
  activo: boolean;
  rol?: {
    id_rol: number;
    nombre_rol: string;
  };
}

export interface LoginRequest {
  correo_electronico: string;
  contrasena: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
}
