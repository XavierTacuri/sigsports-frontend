export interface Grupo {
  id_grupo?: number;
  id_competencia: number;
  nombre_grupo: string;
  orden: number;
  estado: string;
}

export type GrupoPayload = Omit<Grupo, 'id_grupo'>;
