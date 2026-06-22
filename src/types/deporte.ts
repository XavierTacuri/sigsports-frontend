export interface Deporte {
  id_deporte?: number;
  nombre_deporte: string;
  descripcion: string | null;
  tipo_deporte: string;
  permite_goles: boolean;
  permite_tarjetas: boolean;
  permite_tabla_posiciones: boolean;
  activo: boolean;
}

export type DeportePayload = Omit<Deporte, 'id_deporte'>;
