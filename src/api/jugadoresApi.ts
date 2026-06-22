import api from './axiosConfig';
import type {
  Jugador,
  JugadorPayload,
  JugadorUpdatePayload,
  JugadorValidacionPayload,
  CedulaJugadorValidacion,
} from '../types';

type JugadoresPendientesResponse =
  | Jugador[]
  | {
      items?: Jugador[];
      jugadores?: Jugador[];
      data?: Jugador[];
    };

type JugadoresListResponse =
  | Jugador[]
  | {
      items?: Jugador[];
      data?: Jugador[];
      results?: Jugador[];
      total?: number;
    };

const normalizeListResponse = (response: JugadoresListResponse) => {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
    };
  }

  if (Array.isArray(response?.items)) {
    return {
      items: response.items,
      total: response.total ?? response.items.length,
    };
  }

  if (Array.isArray(response?.data)) {
    return {
      items: response.data,
      total: response.total ?? response.data.length,
    };
  }

  if (Array.isArray(response?.results)) {
    return {
      items: response.results,
      total: response.total ?? response.results.length,
    };
  }

  return {
    items: [],
    total: 0,
  };
};

export const validarCedulaJugador = async (
  cedula: string,
  excludeIdJugador?: number,
) => {
  const response = await api.get<CedulaJugadorValidacion>(
    `/jugadores/validar-cedula/${cedula}`,
    {
      params: excludeIdJugador
        ? { exclude_id_jugador: excludeIdJugador }
        : undefined,
    },
  );
  return response.data;
};

export const jugadoresApi = {
  listar: async (params: Record<string, unknown> = {}) => {
    const response = await api.get<JugadoresListResponse>('/jugadores', {
      params: {
        limit: 1000,
        page_size: 1000,
        ...params,
      },
    });

    return normalizeListResponse(response.data).items;
  },
  listarPendientes: async () => {
    const response = await api.get<JugadoresPendientesResponse>(
      '/jugadores/pendientes',
    );

    const rawData = Array.isArray(response.data)
      ? response.data
      : (response.data.items ??
        response.data.jugadores ??
        response.data.data ??
        response.data);
    const jugadores = Array.isArray(rawData) ? rawData : [];

    return jugadores;
  },
  listarPorClub: async (idClub: number) => {
    const response = await api.get<JugadoresListResponse>(
      `/clubes/${idClub}/jugadores`,
      {
        params: {
          limit: 1000,
          page_size: 1000,
        },
      },
    );

    return normalizeListResponse(response.data).items;
  },
  obtener: async (idJugador: number) =>
    (await api.get<Jugador>(`/jugadores/${idJugador}`)).data,
  obtenerPorCedula: async (cedula: string) =>
    (await api.get<Jugador>(`/jugadores/cedula/${cedula}`)).data,
  validarCedula: validarCedulaJugador,
  crear: async (payload: JugadorPayload) =>
    (await api.post<Jugador>('/jugadores', payload)).data,
  actualizar: async (idJugador: number, payload: JugadorUpdatePayload) =>
    (await api.patch<Jugador>(`/jugadores/${idJugador}`, payload)).data,
  aprobar: async (
    idJugador: number,
    payload: JugadorValidacionPayload = {},
  ) =>
    (
      await api.patch<Jugador>(
        `/jugadores/${idJugador}/aprobar`,
        payload,
      )
    ).data,
  rechazar: async (idJugador: number, payload: JugadorValidacionPayload) =>
    (
      await api.patch<Jugador>(
        `/jugadores/${idJugador}/rechazar`,
        payload,
      )
    ).data,
  observar: async (idJugador: number, payload: JugadorValidacionPayload) =>
    (
      await api.patch<Jugador>(
        `/jugadores/${idJugador}/observar`,
        payload,
      )
    ).data,
};
