import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { estadisticasApi } from '../../api/estadisticasApi';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { EstadisticaJugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

const getGoles = (item: EstadisticaJugador) => {
  const flexible = item as EstadisticaJugador & { goles_anotados?: number };
  return Number(flexible.goles ?? flexible.goles_anotados ?? 0);
};

const getJugadorNombre = (item: EstadisticaJugador) => {
  const flexibleItem = item as EstadisticaJugador & Record<string, unknown>;
  const jugador = flexibleItem.jugador as Record<string, unknown> | undefined;
  const nombreDesdeJugador = joinName(
    typeof jugador?.nombres === 'string' ? jugador.nombres : null,
    typeof jugador?.apellidos === 'string' ? jugador.apellidos : null,
  );
  const nombrePlano = joinName(
    typeof flexibleItem.nombres === 'string' ? flexibleItem.nombres : null,
    typeof flexibleItem.apellidos === 'string' ? flexibleItem.apellidos : null,
  );

  return (
    (typeof flexibleItem.nombre_completo === 'string' &&
      flexibleItem.nombre_completo) ||
    (typeof jugador?.nombre_completo === 'string' && jugador.nombre_completo) ||
    nombreDesdeJugador ||
    nombrePlano ||
    (typeof flexibleItem.nombre_jugador === 'string' &&
      flexibleItem.nombre_jugador) ||
    '-'
  );
};

const getClubNombre = (item: EstadisticaJugador) => {
  const flexibleItem = item as EstadisticaJugador & Record<string, unknown>;
  const club = flexibleItem.club as Record<string, unknown> | undefined;

  return (
    (typeof flexibleItem.nombre_club === 'string' && flexibleItem.nombre_club) ||
    (typeof club?.nombre_club === 'string' && club.nombre_club) ||
    (typeof flexibleItem.club_nombre === 'string' && flexibleItem.club_nombre) ||
    '-'
  );
};

export function GoleadoresSection({
  competenciaId,
}: {
  competenciaId: number;
}) {
  const [items, setItems] = useState<EstadisticaJugador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await estadisticasApi.goleadores(competenciaId));
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar los datos.'
          : getApiErrorMessage(requestError, 'No se pudieron cargar los datos.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => void load(), [load]);

  const goleadoresConGoles = useMemo(
    () =>
      items
        .filter((item) => getGoles(item) > 0)
        .slice()
        .sort((a, b) => {
          const byGoals = getGoles(b) - getGoles(a);
          if (byGoals !== 0) return byGoals;

          const byMatches = a.partidos_jugados - b.partidos_jugados;
          if (byMatches !== 0) return byMatches;

          return getJugadorNombre(a).localeCompare(getJugadorNombre(b));
        }),
    [items],
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <section className="min-w-0 space-y-4 overflow-hidden">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Goleadores</h2>
        <p className="text-sm text-slate-600">
          Máximos anotadores de la competencia.
        </p>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      {goleadoresConGoles.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {goleadoresConGoles.slice(0, 3).map((item, index) => (
            <article
              key={item.id_estadistica_jugador ?? item.id_jugador}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-xs font-bold uppercase text-amber-700">
                Puesto {index + 1}
              </p>
              <p className="mt-1 font-bold text-slate-950">
                {getJugadorNombre(item)}
              </p>
              <p className="text-sm text-slate-600">
                {getClubNombre(item)} · {getGoles(item)} goles
              </p>
            </article>
          ))}
        </div>
      ) : null}

      <DataTable
        data={goleadoresConGoles}
        getKey={(item) => item.id_estadistica_jugador ?? item.id_jugador}
        emptyMessage="No hay goleadores registrados en esta competencia."
        columns={[
          {
            key: 'posicion',
            header: 'Posición',
            render: (_item, index) => index + 1,
          },
          {
            key: 'jugador',
            header: 'Jugador',
            render: getJugadorNombre,
          },
          {
            key: 'club',
            header: 'Club',
            render: getClubNombre,
          },
          {
            key: 'goles',
            header: 'Goles',
            render: (item) => (
              <strong className="text-slate-950">{getGoles(item)}</strong>
            ),
          },
          {
            key: 'pj',
            header: 'Partidos jugados',
            render: (item) => item.partidos_jugados,
          },
        ]}
      />
    </section>
  );
}
