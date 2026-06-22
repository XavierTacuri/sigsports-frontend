export interface Competencia {
  id_competencia?: number;
  id_campeonato: number;
  id_deporte: number;
  id_categoria: number;
  nombre_competencia: string;
  tipo_competencia: string;
  formato_competencia: string;
  tipo_puntuacion: string;
  cantidad_equipos: number | null;
  cantidad_grupos: number | null;
  equipos_por_grupo: number | null;
  clasificados_por_grupo: number | null;
  permite_sanciones: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
}

export type CompetenciaPayload = Omit<Competencia, 'id_competencia'>;
