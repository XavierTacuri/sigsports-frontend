import api from './axiosConfig';
import type {
  UsuarioClub,
  UsuarioClubCreatePayload,
  UsuarioClubUpdatePayload,
} from '../types';

type UsuarioClubRawResponseItem = Partial<UsuarioClub> & {
  id?: number;
  id_club?: number;
  nombre_club?: string;
  club_nombre?: string;
  nombre?: string;
  club?: {
    id?: number;
    id_club?: number;
    nombre?: string;
    nombre_club?: string;
  };
};

type UsuarioClubResponseItem = UsuarioClubRawResponseItem & {
  id_club: number;
};

type UsuarioClubListResponse =
  | UsuarioClubRawResponseItem
  | UsuarioClubRawResponseItem[]
  | {
      items?: UsuarioClubRawResponseItem[];
      clubes?: UsuarioClubRawResponseItem[];
      data?: UsuarioClubRawResponseItem[] | UsuarioClubRawResponseItem;
    };

const normalizeUsuarioClubList = (
  data: UsuarioClubListResponse,
): UsuarioClubRawResponseItem[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if ('items' in data && Array.isArray(data.items)) {
    return data.items;
  }

  if ('clubes' in data && Array.isArray(data.clubes)) {
    return data.clubes;
  }

  if ('data' in data) {
    const responseData = data.data;

    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (responseData) {
      return [responseData];
    }
  }

  if ('id_club' in data || 'club' in data || 'id' in data) {
    return [data];
  }

  return [];
};

const getClubId = (item: UsuarioClubRawResponseItem) =>
  item.club?.id_club ?? item.id_club ?? item.id ?? null;

const getClubNombre = (item: UsuarioClubRawResponseItem) =>
  item.club?.nombre_club ??
  item.club?.nombre ??
  item.nombre_club ??
  item.club_nombre ??
  item.nombre;

const normalizeUsuarioClubItem = (
  item: UsuarioClubRawResponseItem,
): UsuarioClubResponseItem | null => {
  const idClub = getClubId(item);

  if (!idClub) {
    return null;
  }

  return {
    ...item,
    id_club: idClub,
    nombre_club: getClubNombre(item),
  };
};

export const usuariosClubesApi = {
  listar: async () =>
    (await api.get<UsuarioClub[]>('/usuarios-clubes')).data,
  listarPorUsuario: async (idUsuario: number) => {
    const response = await api.get<UsuarioClubListResponse>(
      `/usuarios/${idUsuario}/clubes`,
    );

    return normalizeUsuarioClubList(response.data)
      .map(normalizeUsuarioClubItem)
      .filter((item): item is UsuarioClubResponseItem => Boolean(item));
  },
  crear: async (payload: UsuarioClubCreatePayload) =>
    (await api.post<UsuarioClub>('/usuarios-clubes', payload)).data,
  actualizar: async (id: number, payload: UsuarioClubUpdatePayload) =>
    (await api.patch<UsuarioClub>(`/usuarios-clubes/${id}`, payload)).data,
};
