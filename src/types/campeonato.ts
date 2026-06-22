export interface Campeonato {
  id_campeonato?: number;
  nombre_campeonato: string;
  edicion: string | null;
  anio: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  descripcion: string | null;
  estado: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export type CampeonatoPayload = Omit<
  Campeonato,
  'id_campeonato' | 'fecha_creacion' | 'fecha_actualizacion'
>;
