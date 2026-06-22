import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { tablaPosicionesApi } from '../../api/tablaPosicionesApi';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { TablaPosicion } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

export function TablaPosicionesSection({
  competenciaId,
  grupoId,
  hasGroups,
}: {
  competenciaId: number;
  grupoId?: number;
  hasGroups: boolean;
}) {
  const [items, setItems] = useState<TablaPosicion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (hasGroups && !grupoId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const data = grupoId
        ? await tablaPosicionesApi.listarPorGrupo(grupoId)
        : await tablaPosicionesApi.listarPorCompetencia(competenciaId);
      setItems(data);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar los datos.'
          : getApiErrorMessage(requestError, 'No se pudieron cargar los datos.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId, grupoId, hasGroups]);

  useEffect(() => void load(), [load]);

  if (hasGroups && !grupoId) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Selecciona un grupo para ver la tabla de posiciones.
      </p>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <section className="min-w-0 space-y-4 overflow-hidden">
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Tabla de posiciones
        </h2>
        <p className="text-sm text-slate-600">
          Clasificación calculada con planillas finalizadas.
        </p>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <DataTable
        data={items}
        getKey={(item) =>
          item.id_posicion ?? `${item.id_club}-${item.id_grupo ?? 0}`
        }
        emptyMessage="No hay datos de tabla de posiciones."
        columns={[
          {
            key: 'posicion',
            header: 'Posición',
            render: (_item, index) => (
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  index === 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {index + 1}
              </span>
            ),
          },
          {
            key: 'club',
            header: 'Club',
            render: (item) => {
              const flexible = item as TablaPosicion & Record<string, unknown>;
              const club = flexible.club as Record<string, unknown> | undefined;

              return (
                (typeof flexible.nombre_club === 'string' &&
                  flexible.nombre_club) ||
                (typeof club?.nombre_club === 'string' && club.nombre_club) ||
                (typeof flexible.club_nombre === 'string' &&
                  flexible.club_nombre) ||
                `Club ${item.id_club}`
              );
            },
          },
          { key: 'pj', header: 'PJ', render: (item) => item.partidos_jugados },
          { key: 'pg', header: 'PG', render: (item) => item.partidos_ganados },
          { key: 'pe', header: 'PE', render: (item) => item.partidos_empatados },
          { key: 'pp', header: 'PP', render: (item) => item.partidos_perdidos },
          { key: 'gf', header: 'GF', render: (item) => item.goles_favor },
          { key: 'gc', header: 'GC', render: (item) => item.goles_contra },
          { key: 'dg', header: 'DG', render: (item) => item.diferencia_goles },
          {
            key: 'pts',
            header: 'PTS',
            render: (item) => (
              <strong className="text-slate-950">{item.puntos}</strong>
            ),
          },
        ]}
      />
    </section>
  );
}
