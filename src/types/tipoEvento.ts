export interface TipoEvento {
  id_tipo_evento?: number;
  nombre_evento: string;
  descripcion?: string | null;
  afecta_goles: boolean;
  afecta_tarjetas: boolean;
  afecta_sanciones: boolean;
  activo: boolean;
}

export type TipoEventoPayload = Omit<TipoEvento, 'id_tipo_evento'>;
