export interface Escenario {
  id_escenario?: number;
  nombre_escenario: string;
  direccion?: string | null;
  referencia?: string | null;
  estado: string;
}

export type EscenarioPayload = Omit<Escenario, 'id_escenario'>;
