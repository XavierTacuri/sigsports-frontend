import type {
  EventoIndividualResultado,
} from '../../types';

type AnyRecord = Record<string, unknown>;

export const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

export const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  return value.split('T')[0].split(' ')[0];
};

export const formatTimeHHMM = (value?: string | null) => {
  if (!value) return '-';
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (value.includes('T')) {
    const time = value.split('T')[1];
    return time ? time.slice(0, 5) : '-';
  }
  if (value.includes(' ')) {
    const time = value.split(' ')[1];
    return time ? time.slice(0, 5) : '-';
  }
  return value.slice(0, 5);
};

export const getCompetenciaNombre = (competencia?: object | null) => {
  const flexible = (competencia ?? {}) as AnyRecord;

  return (
    (typeof flexible.nombre_competencia === 'string' &&
      flexible.nombre_competencia) ||
    (typeof flexible.competencia_nombre === 'string' &&
      flexible.competencia_nombre) ||
    (typeof flexible.nombre === 'string' && flexible.nombre) ||
    ''
  );
};

export const getDeporteNombre = (competencia?: object | null) => {
  const flexible = (competencia ?? {}) as AnyRecord;
  const deporte = flexible.deporte as AnyRecord | undefined;

  return (
    (typeof deporte?.nombre_deporte === 'string' && deporte.nombre_deporte) ||
    (typeof flexible.nombre_deporte === 'string' && flexible.nombre_deporte) ||
    (typeof flexible.deporte_nombre === 'string' && flexible.deporte_nombre) ||
    getCompetenciaNombre(flexible)
  );
};

export const getEscenarioNombre = (
  escenario?: { nombre_escenario?: string } | null,
) => escenario?.nombre_escenario ?? '-';

export const isCompetenciaIndividual = (competencia: object) => {
  const texto = normalizeText(getDeporteNombre(competencia));

  return (
    texto.includes('AJEDREZ') ||
    texto.includes('AJEDRES') ||
    texto.includes('CICLISMO') ||
    texto.includes('ATLETISMO')
  );
};

export const getJugadorNombre = (item: object) => {
  const flexible = item as AnyRecord;
  const jugador = flexible.jugador as AnyRecord | undefined;
  const nombreDesdeJugador = joinName(
    typeof jugador?.nombres === 'string' ? jugador.nombres : null,
    typeof jugador?.apellidos === 'string' ? jugador.apellidos : null,
  );
  const nombrePlano = joinName(
    typeof flexible.nombres === 'string'
      ? (flexible.nombres as string)
      : null,
    typeof flexible.apellidos === 'string'
      ? (flexible.apellidos as string)
      : null,
  );

  return (
    (typeof flexible.nombre_completo === 'string' && flexible.nombre_completo) ||
    (typeof jugador?.nombre_completo === 'string' && jugador.nombre_completo) ||
    nombreDesdeJugador ||
    nombrePlano ||
    (typeof flexible.nombre_jugador === 'string' && flexible.nombre_jugador) ||
    '-'
  );
};

export const getClubNombre = (item: object) => {
  const flexible = item as AnyRecord;
  const club = flexible.club as AnyRecord | undefined;

  return (
    (typeof flexible.nombre_club === 'string' && flexible.nombre_club) ||
    (typeof club?.nombre_club === 'string' && club.nombre_club) ||
    (typeof flexible.club_nombre === 'string' && flexible.club_nombre) ||
    '-'
  );
};

export const getResultadoEstado = (resultado: EventoIndividualResultado) =>
  resultado.estado_resultado || resultado.estado || 'REGISTRADO';

export const getEventoEstadoTone = (estado: string) => {
  const normalized = normalizeText(estado);

  if (normalized === 'PROGRAMADO') {
    return 'blue';
  }

  if (normalized === 'FINALIZADO') {
    return 'green';
  }

  if (normalized === 'SUSPENDIDO') {
    return 'amber';
  }

  return 'red';
};
