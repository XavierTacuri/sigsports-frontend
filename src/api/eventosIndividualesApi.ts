import api from './axiosConfig';
import type {
  EventoIndividual,
  EventoIndividualCreate,
  EventoIndividualParticipante,
  EventoIndividualResultado,
  EventoIndividualResultadoPayload,
  EventoIndividualUpdate,
} from '../types/eventoIndividual';

export const getEventosIndividuales = async () => {
  const response = await api.get<EventoIndividual[]>('/eventos-individuales');
  return response.data;
};

export const getEventoIndividualById = async (id: number) => {
  const response = await api.get<EventoIndividual>(`/eventos-individuales/${id}`);
  return response.data;
};

export const getEventosIndividualesByCompetencia = async (
  idCompetencia: number,
) => {
  const response = await api.get<EventoIndividual[]>(
    `/competencias/${idCompetencia}/eventos-individuales`,
  );
  return response.data;
};

export const getEventosIndividualesDelegado = async () => {
  const response = await api.get<EventoIndividual[]>(
    '/delegado/eventos-individuales',
  );
  return response.data;
};

export const createEventoIndividual = async (data: EventoIndividualCreate) => {
  const response = await api.post<EventoIndividual>('/eventos-individuales', data);
  return response.data;
};

export const updateEventoIndividual = async (
  id: number,
  data: EventoIndividualUpdate,
) => {
  const response = await api.patch<EventoIndividual>(
    `/eventos-individuales/${id}`,
    data,
  );
  return response.data;
};

export const getParticipantesEventoIndividual = async (idEvento: number) => {
  const response = await api.get<EventoIndividualParticipante[]>(
    `/eventos-individuales/${idEvento}/participantes`,
  );
  return response.data;
};

export const getResultadosEventoIndividual = async (idEvento: number) => {
  const response = await api.get<EventoIndividualResultado[]>(
    `/eventos-individuales/${idEvento}/resultados`,
  );
  return response.data;
};

export const createResultadoEventoIndividual = async (
  idEvento: number,
  data: EventoIndividualResultadoPayload,
) => {
  const response = await api.post<EventoIndividualResultado>(
    `/eventos-individuales/${idEvento}/resultados`,
    data,
  );
  return response.data;
};

export const updateResultadoEventoIndividual = async (
  idResultado: number,
  data: Partial<EventoIndividualResultadoPayload>,
) => {
  const response = await api.patch<EventoIndividualResultado>(
    `/eventos-individuales/resultados/${idResultado}`,
    data,
  );
  return response.data;
};

export const anularResultadoEventoIndividual = async (idResultado: number) => {
  const response = await api.patch<EventoIndividualResultado>(
    `/eventos-individuales/resultados/${idResultado}/anular`,
  );
  return response.data;
};

export const getEventoIndividualParticipantes = getParticipantesEventoIndividual;
export const getEventoIndividualResultados = getResultadosEventoIndividual;
export const createEventoIndividualResultado = createResultadoEventoIndividual;
export const updateEventoIndividualResultado = updateResultadoEventoIndividual;
export const anularEventoIndividualResultado = anularResultadoEventoIndividual;
