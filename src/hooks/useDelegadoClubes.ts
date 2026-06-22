import { useEffect, useMemo, useState } from 'react';
import { usuariosClubesApi } from '../api/usuariosClubesApi';
import type { AuthUser, Club } from '../types';
import { getApiErrorMessage } from '../utils/apiError';

type DelegadoClubResponseItem = {
  id?: number;
  id_club?: number;
  nombre_club?: string;
  club_nombre?: string;
  activo?: boolean;
  raw?: DelegadoClubResponseItem;
  club?: {
    id?: number;
    id_club?: number;
    nombre_club?: string;
  };
};

export type DelegadoClub = Club & {
  raw?: DelegadoClubResponseItem;
};

const getClubId = (item: DelegadoClubResponseItem) =>
  item.club?.id_club ?? item.id_club ?? item.id ?? null;

const getClubNombre = (item: DelegadoClubResponseItem) => {
  return (
    item?.club?.nombre_club ??
    item?.nombre_club ??
    item?.club_nombre ??
    item?.raw?.club?.nombre_club ??
    item?.raw?.nombre_club ??
    item?.raw?.club_nombre ??
    ''
  );
};

export function useDelegadoClubes(user: AuthUser | null, enabled: boolean) {
  const [clubesAsociados, setClubesAsociados] = useState<DelegadoClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [loadingClubes, setLoadingClubes] = useState(false);
  const [errorClubes, setErrorClubes] = useState('');

  useEffect(() => {
    if (!enabled || !user) {
      setClubesAsociados([]);
      setSelectedClubId(null);
      setLoadingClubes(false);
      setErrorClubes('');
      return;
    }

    let isCurrent = true;
    setLoadingClubes(true);
    setErrorClubes('');

    usuariosClubesApi
      .listarPorUsuario(user.id_usuario)
      .then((clubesRaw) => {
        if (!isCurrent) {
          return;
        }

        const rawItems = clubesRaw.filter((item) => item.activo !== false);
        const clubesNormalizados = rawItems
          .filter((item) => item.activo !== false)
          .map((item) => {
            const idClub = getClubId(item);
            const nombreClub = getClubNombre(item);

            return {
              id_club: idClub,
              nombre_club: nombreClub,
              raw: item,
            };
          })
          .filter((club) => club.id_club);

        const clubesActivos = clubesNormalizados.map<DelegadoClub>((club) => ({
          id_club: club.id_club ?? undefined,
          codigo_club: null,
          nombre_club: club.nombre_club,
          siglas: null,
          logo_url: null,
          estado: 'ACTIVO',
          raw: club.raw,
        }));
        const selectedClub = clubesActivos[0] ?? null;

        setClubesAsociados(clubesActivos);
        setSelectedClubId(selectedClub?.id_club ?? null);
      })
      .catch((requestError) => {
        if (!isCurrent) {
          return;
        }

        setClubesAsociados([]);
        setSelectedClubId(null);
        setErrorClubes(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar los clubes asociados.',
          ),
        );
      })
      .finally(() => {
        if (isCurrent) {
          setLoadingClubes(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [enabled, user]);

  const selectedClub = useMemo(
    () => clubesAsociados[0] ?? null,
    [clubesAsociados],
  );
  const selectedClubName =
    selectedClub?.nombre_club ||
    selectedClub?.raw?.club?.nombre_club ||
    selectedClub?.raw?.nombre_club ||
    selectedClub?.raw?.club_nombre ||
    '';

  return {
    clubesAsociados,
    selectedClub,
    selectedClubId,
    selectedClubName,
    loadingClubes,
    errorClubes,
  };
}
