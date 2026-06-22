export interface GrupoClub {
  id_grupo_club?: number;
  id_grupo: number;
  id_club: number;
  posicion_sorteo?: number | null;
  estado: string;
}

export type GrupoClubPayload = Omit<GrupoClub, 'id_grupo_club'>;
