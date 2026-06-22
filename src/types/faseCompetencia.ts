export type TipoFase =
  | 'GRUPOS'
  | 'SEMIFINAL'
  | 'FINAL'
  | 'TERCER_LUGAR';

export interface FaseCompetencia {
  id_fase?: number;
  id_competencia: number;
  nombre_fase: string;
  tipo_fase: TipoFase | string;
  orden: number;
  estado: string;
}

export type FaseCompetenciaPayload = Omit<FaseCompetencia, 'id_fase'>;
