export interface Jornada {
  id_jornada?: number;
  id_competencia: number;
  nombre_jornada: string;
  numero_jornada: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: string;
}

export type JornadaPayload = Omit<Jornada, 'id_jornada'>;
