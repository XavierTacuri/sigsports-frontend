export interface EventoIndividual {
  id_evento_individual: number;
  id_competencia: number;
  id_jornada?: number | null;
  id_escenario?: number | null;
  nombre_evento: string;
  fecha_evento: string;
  hora_evento?: string | null;
  tipo_evento?: string | null;
  estado_evento: string;
  observaciones?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
  competencia?: {
    id_competencia: number;
    nombre_competencia: string;
  };
  escenario?: {
    id_escenario: number;
    nombre_escenario: string;
  };
  participantes?: EventoIndividualParticipante[];
}

export interface EventoIndividualParticipante {
  id_inscripcion_competencia?: number;
  id_jugador: number;
  nombre_completo: string;
  cedula: string;
  id_club: number;
  nombre_club: string;
  numero_camiseta?: number | null;
  estado_inscripcion?: string;
}

export interface EventoIndividualResultado {
  id_resultado_individual: number;
  id_evento_individual: number;
  id_inscripcion_competencia?: number | null;
  id_jugador?: number;
  nombre_completo?: string;
  cedula?: string;
  id_club?: number;
  nombre_club?: string;
  puesto: number;
  puntaje?: number | null;
  tiempo?: string | null;
  marca?: string | null;
  estado_resultado?: string;
  estado?: string;
  observaciones?: string | null;
  participante?: EventoIndividualParticipante;
  jugador?: {
    id_jugador?: number;
    nombre_completo?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
  };
  club?: {
    id_club?: number;
    nombre_club?: string;
  };
}

export interface EventoIndividualResultadoPayload {
  id_evento_individual?: number;
  id_inscripcion_competencia?: number | null;
  puesto: number;
  puntaje?: number | null;
  tiempo?: string | null;
  marca?: string | null;
  observaciones?: string | null;
}

export interface EventoIndividualCreate {
  id_competencia: number;
  id_jornada?: number | null;
  id_escenario?: number | null;
  nombre_evento: string;
  fecha_evento: string;
  hora_evento?: string | null;
  tipo_evento?: string | null;
  estado_evento?: string;
  observaciones?: string | null;
}

export interface EventoIndividualUpdate {
  id_jornada?: number | null;
  id_escenario?: number | null;
  nombre_evento?: string;
  fecha_evento?: string;
  hora_evento?: string | null;
  tipo_evento?: string | null;
  estado_evento?: string;
  observaciones?: string | null;
}
