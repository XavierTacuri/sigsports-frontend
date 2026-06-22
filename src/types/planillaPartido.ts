export type EstadoPlanilla =
  | 'BORRADOR'
  | 'FINALIZADA'
  | 'VALIDADA'
  | 'ANULADA';

export interface PlanillaPartido {
  id_planilla?: number;
  id_partido: number;
  id_planillero?: number;
  estado_planilla: EstadoPlanilla | string;
  observaciones?: string | null;
  marcador_local?: number | null;
  marcador_visitante?: number | null;
  goles_local?: number | null;
  goles_visitante?: number | null;
  fecha_registro?: string;
  fecha_cierre?: string | null;
}

export interface PlanillaPartidoCreatePayload {
  id_partido: number;
  observaciones?: string | null;
}

export interface PlanillaPartidoUpdatePayload {
  estado_planilla?: EstadoPlanilla | string;
  observaciones?: string | null;
  marcador_local?: number | null;
  marcador_visitante?: number | null;
  goles_local?: number | null;
  goles_visitante?: number | null;
}

export interface PlanillaMarcadorPayload {
  marcador_local: number;
  marcador_visitante: number;
  observaciones?: string | null;
}
