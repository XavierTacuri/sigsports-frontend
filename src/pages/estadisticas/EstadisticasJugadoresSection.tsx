import { useCallback, useEffect, useMemo, useState } from 'react';
import { estadisticasApi } from '../../api/estadisticasApi';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { Club, EstadisticaJugador, Jugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

export function EstadisticasJugadoresSection({
  competenciaId,
  clubes,
  jugadores,
}: {
  competenciaId: number;
  clubes: Club[];
  jugadores: Jugador[];
}) {
  const [items, setItems] = useState<EstadisticaJugador[]>([]);
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await estadisticasApi.jugadoresPorCompetencia(competenciaId));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los datos.'));
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);
  useEffect(() => void load(), [load]);

  const players = useMemo(() => new Map(jugadores.map((item) => [item.id_jugador, item])), [jugadores]);
  const clubs = useMemo(() => new Map(clubes.map((item) => [item.id_club, item.nombre_club])), [clubes]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const player = players.get(item.id_jugador);
      return (!clubId || item.id_club === Number(clubId)) &&
        (!term || player?.nombre_completo.toLowerCase().includes(term) || player?.cedula.includes(term));
    });
  }, [clubId, items, players, search]);

  if (isLoading) return <LoadingSpinner />;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Estadísticas de jugadores</h2>
        <p className="text-sm text-slate-600">Rendimiento individual registrado en planillas.</p>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <FormInput label="Buscar jugador o cédula" value={search} onChange={(event) => setSearch(event.target.value)} />
        <FormSelect label="Club" value={clubId} options={clubes.map((item) => ({ value: String(item.id_club), label: item.nombre_club }))} onChange={(event) => setClubId(event.target.value)} />
      </div>
      <DataTable
        data={filtered}
        getKey={(item) => item.id_estadistica_jugador ?? item.id_jugador}
        emptyMessage="No hay estadísticas de jugadores para los filtros seleccionados."
        columns={[
          { key: 'jugador', header: 'Jugador', render: (item) => players.get(item.id_jugador)?.nombre_completo ?? `Jugador ${item.id_jugador}` },
          { key: 'club', header: 'Club', render: (item) => clubs.get(item.id_club) ?? `Club ${item.id_club}` },
          { key: 'pj', header: 'PJ', render: (item) => item.partidos_jugados },
          { key: 'goles', header: 'Goles', render: (item) => item.goles },
          { key: 'autogoles', header: 'Autogoles', render: (item) => item.autogoles },
          { key: 'asistencias', header: 'Asistencias', render: (item) => item.asistencias },
          { key: 'amarillas', header: 'Amarillas', render: (item) => item.tarjetas_amarillas },
          { key: 'rojas', header: 'Rojas', render: (item) => item.tarjetas_rojas },
          { key: 'minutos', header: 'Minutos', render: (item) => item.minutos_jugados },
        ]}
      />
    </section>
  );
}
