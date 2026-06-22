export interface UsuarioClub {
  id_usuario_club?: number;
  id_usuario: number;
  id_club: number;
  cargo: string | null;
  activo: boolean;
  fecha_creacion?: string;
}

export type UsuarioClubCreatePayload = Omit<
  UsuarioClub,
  'id_usuario_club' | 'fecha_creacion'
>;

export interface UsuarioClubUpdatePayload {
  id_club?: number;
  cargo?: string | null;
  activo?: boolean;
}
