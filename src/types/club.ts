export interface Club {
  id_club?: number;
  codigo_club: string | null;
  nombre_club: string;
  siglas: string | null;
  logo_url: string | null;
  nombre_delegado?: string | null;
  telefono_delegado?: string | null;
  correo_delegado?: string | null;
  estado: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface ClubPayload {
  codigo_club: string | null;
  nombre_club: string;
  siglas: string | null;
  logo_url: string | null;
  estado: string;
}
