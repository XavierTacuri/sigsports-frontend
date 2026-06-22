import api from './axiosConfig';
import type {
  InscripcionCompetencia,
  InscripcionCreatePayload,
  InscripcionDelegadoUpdatePayload,
  InscripcionUpdatePayload,
} from '../types';

export const getInscripciones = async () =>
  (await api.get<InscripcionCompetencia[]>('/inscripciones-competencia')).data;

export const getInscripcionById = async (id: number) =>
  (
    await api.get<InscripcionCompetencia>(
      `/inscripciones-competencia/${id}`,
    )
  ).data;

export const getInscripcionesByClub = async (idClub: number) =>
  (
    await api.get<InscripcionCompetencia[]>(
      `/clubes/${idClub}/inscripciones-competencia`,
    )
  ).data;

export const getInscripcionesByCompetencia = async (
  idCompetencia: number,
) =>
  (
    await api.get<InscripcionCompetencia[]>(
      `/competencias/${idCompetencia}/inscripciones`,
    )
  ).data;

export const createInscripcion = async (data: InscripcionCreatePayload) =>
  (
    await api.post<InscripcionCompetencia>(
      '/inscripciones-competencia',
      data,
    )
  ).data;

export const updateInscripcion = async (
  id: number,
  data: InscripcionUpdatePayload | InscripcionDelegadoUpdatePayload,
) =>
  (
    await api.patch<InscripcionCompetencia>(
      `/inscripciones-competencia/${id}`,
      data,
    )
  ).data;

export const inscripcionesApi = {
  getInscripciones,
  getInscripcionById,
  getInscripcionesByClub,
  getInscripcionesByCompetencia,
  createInscripcion,
  updateInscripcion,
};
