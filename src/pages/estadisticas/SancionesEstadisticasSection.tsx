import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { sancionesApi } from '../../api/sancionesApi';
import {
  SancionEstadoBadge,
  SancionTipoBadge,
} from '../../components/sanciones/SancionBadges';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SearchBar } from '../../components/ui/SearchBar';
import type { Sancion } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const getJugadorNombre = (item: Sancion) => {
  const flexibleItem = item as Sancion & Record<string, unknown>;
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

const getCompetenciaNombre = (item: Sancion, fallback: string) => {
  const flexibleItem = item as Sancion & Record<string, unknown>;
  const competencia = flexibleItem.competencia as
    | Record<string, unknown>
    | undefined;

  return (
    (typeof competencia?.nombre_competencia === 'string' &&
      competencia.nombre_competencia) ||
    (typeof flexibleItem.nombre_competencia === 'string' &&
      flexibleItem.nombre_competencia) ||
    (typeof flexibleItem.competencia_nombre === 'string' &&
      flexibleItem.competencia_nombre) ||
    fallback ||
    '-'
  );
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  return value.split('T')[0].split(' ')[0];
};

export function SancionesEstadisticasSection({
  competenciaId,
  competenciaNombre,
}: {
  competenciaId: number;
  competenciaNombre: string;
}) {
  const [items, setItems] = useState<Sancion[]>([]);
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await sancionesApi.listarPorCompetencia(competenciaId));
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

  const filtered = useMemo(() => {
    const query = normalizeText(search);

    return items.filter((item) => {
      const matchesEstado = !estado || item.estado_sancion === estado;
      const matchesTipo = !tipo || item.tipo_sancion === tipo;
      const matchesSearch =
        !query ||
        normalizeText(getJugadorNombre(item)).includes(query) ||
        normalizeText(getCompetenciaNombre(item, competenciaNombre)).includes(
          query,
        );

      return matchesEstado && matchesTipo && matchesSearch;
    });
  }, [competenciaNombre, estado, items, search, tipo]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <section className="min-w-0 space-y-4 overflow-hidden">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Sanciones</h2>
        <p className="text-sm text-slate-600">
          Suspensiones activas, cumplidas y anuladas de la competencia.
        </p>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SearchBar
          value={search}
          placeholder="Buscar jugador"
          onChange={(event) => setSearch(event.target.value)}
        />
        <FilterSelect
          label="Estado"
          value={estado}
          options={[
            { value: 'ACTIVA', label: 'ACTIVA' },
            { value: 'CUMPLIDA', label: 'CUMPLIDA' },
            { value: 'ANULADA', label: 'ANULADA' },
          ]}
          onChange={(event) => setEstado(event.target.value)}
        />
        <FilterSelect
          label="Tipo sanción"
          value={tipo}
          options={[
            { value: 'TARJETA_ROJA', label: 'Tarjeta roja' },
            {
              value: 'ACUMULACION_AMARILLAS',
              label: 'Acumulación amarillas',
            },
            {
              value: 'DOBLE_AMARILLA_ACUMULADA',
              label: 'Doble amarilla acumulada',
            },
            { value: 'MANUAL', label: 'Manual' },
          ]}
          onChange={(event) => setTipo(event.target.value)}
        />
      </div>

      <DataTable
        data={filtered}
        getKey={(item) =>
          item.id_sancion ?? `${item.id_jugador}-${item.fecha_creacion}`
        }
        emptyMessage="No hay sanciones que coincidan con los filtros."
        columns={[
          { key: 'jugador', header: 'Jugador', render: getJugadorNombre },
          {
            key: 'competencia',
            header: 'Competencia',
            render: (item) => getCompetenciaNombre(item, competenciaNombre),
          },
          {
            key: 'tipo',
            header: 'Tipo sanción',
            render: (item) => <SancionTipoBadge tipo={item.tipo_sancion} />,
          },
          { key: 'motivo', header: 'Motivo', render: (item) => item.motivo || '-' },
          {
            key: 'suspension',
            header: 'Suspensión',
            render: (item) => item.partidos_suspension,
          },
          {
            key: 'cumplidos',
            header: 'Cumplidos',
            render: (item) => item.partidos_cumplidos,
          },
          {
            key: 'estado',
            header: 'Estado',
            render: (item) => <SancionEstadoBadge estado={item.estado_sancion} />,
          },
          {
            key: 'fecha',
            header: 'Fecha creación',
            render: (item) => formatDateOnly(item.fecha_creacion),
          },
        ]}
      />
    </section>
  );
}
