export interface EventoPartido {
  id_evento?: number;
  id_planilla: number;
  id_partido: number;
  id_club: number;
  id_inscripcion_competencia?: number | null;
  id_tipo_evento: number;
  minuto?: number | null;
  valor?: number | null;
  descripcion?: string | null;
  fecha_creacion?: string;
}

export type EventoPartidoPayload = Omit<
  EventoPartido,
  'id_evento' | 'fecha_creacion'
>;
