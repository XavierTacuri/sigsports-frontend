import { useCallback, useEffect, useMemo, useState } from 'react';
import { estadisticasApi } from '../../api/estadisticasApi';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { Club, EstadisticaClub } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

export function EstadisticasClubesSection({
  competenciaId,
  clubes,
}: {
  competenciaId: number;
  clubes: Club[];
}) {
  const [items, setItems] = useState<EstadisticaClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await estadisticasApi.clubesPorCompetencia(competenciaId));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los datos.'));
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);
  useEffect(() => void load(), [load]);

  const names = new Map(clubes.map((item) => [item.id_club, item.nombre_club]));
  const leaders = useMemo(() => {
    const max = (field: 'puntos' | 'goles_favor' | 'diferencia_goles') =>
      items.slice().sort((a, b) => b[field] - a[field])[0];
    return [max('puntos'), max('goles_favor'), max('diferencia_goles')];
  }, [items]);

  if (isLoading) return <LoadingSpinner />;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Estadísticas de clubes</h2>
        <p className="text-sm text-slate-600">Rendimiento acumulado por club.</p>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {['Más puntos', 'Más goles', 'Mejor diferencia'].map((label, index) => (
            <article key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 font-bold">{names.get(leaders[index]?.id_club) ?? '-'}</p>
            </article>
          ))}
        </div>
      ) : null}
      <DataTable
        data={items}
        getKey={(item) => item.id_estadistica_club ?? item.id_club}
        emptyMessage="Aún no hay estadísticas de clubes."
        columns={[
          { key: 'club', header: 'Club', render: (item) => names.get(item.id_club) ?? `Club ${item.id_club}` },
          { key: 'pj', header: 'PJ', render: (item) => item.partidos_jugados },
          { key: 'pg', header: 'PG', render: (item) => item.partidos_ganados },
          { key: 'pe', header: 'PE', render: (item) => item.partidos_empatados },
          { key: 'pp', header: 'PP', render: (item) => item.partidos_perdidos },
          { key: 'gf', header: 'GF', render: (item) => item.goles_favor },
          { key: 'gc', header: 'GC', render: (item) => item.goles_contra },
          { key: 'dg', header: 'DG', render: (item) => item.diferencia_goles },
          { key: 'pts', header: 'Puntos', render: (item) => item.puntos },
        ]}
      />
    </section>
  );
}
