import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  createEventoIndividual,
  getEventosIndividuales,
  getEventosIndividualesDelegado,
  updateEventoIndividual,
} from '../../api/eventosIndividualesApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { CardStat } from '../../components/ui/CardStat';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import type {
  EventoIndividual,
  EventoIndividualCreate,
  EventoIndividualUpdate,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { EventoIndividualFormModal } from './EventoIndividualFormModal';
import {
  formatDateOnly,
  formatTimeHHMM,
  getCompetenciaNombre,
  getEventoEstadoTone,
  getEscenarioNombre,
  normalizeText,
} from './eventoIndividualUtils';

type ViewState = {
  openTab?: 'participantes' | 'resultados';
};

function EventoEstadoBadge({ estado }: { estado: string }) {
  const normalized = estado.trim().toUpperCase();
  const tone = getEventoEstadoTone(normalized);
  const classes: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes[tone]}`}
    >
      {normalized}
    </span>
  );
}

export function EventosIndividualesPage() {
  const { user } = useAuth();
  const roleName = getRoleName(user);
  const navigate = useNavigate();
  const canView = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'DELEGADO',
    'PLANILLERO',
  ].includes(roleName);
  const canCreate = roleName === 'ADMINISTRADOR';
  const canEdit = roleName === 'ADMINISTRADOR';
  const canRegisterResults = ['ADMINISTRADOR', 'PLANILLERO'].includes(roleName);
  const isDelegado = roleName === 'DELEGADO';
  const [eventos, setEventos] = useState<EventoIndividual[]>([]);
  const [editing, setEditing] = useState<EventoIndividual | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [competenciaFilter, setCompetenciaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    if (!user || !canView) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const data = isDelegado
        ? await getEventosIndividualesDelegado()
        : await getEventosIndividuales();
      setEventos(data);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar los datos.'
          : getApiErrorMessage(
              requestError,
              'No se pudieron cargar los eventos individuales.',
            ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canView, isDelegado, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, competenciaFilter, estadoFilter, pageSize]);

  const competencias = useMemo(() => {
    const map = new Map<number, string>();

    eventos.forEach((evento) => {
      map.set(evento.id_competencia, getCompetenciaNombre(evento.competencia));
    });

    return Array.from(map.entries()).map(([id, nombre]) => ({
      value: String(id),
      label: nombre || `Competencia ${id}`,
    }));
  }, [eventos]);

  const filteredEventos = useMemo(() => {
    const query = normalizeText(search);

    return eventos.filter((evento) => {
      const competencia = getCompetenciaNombre(evento.competencia);
      const escenario = getEscenarioNombre(evento.escenario);
      const matchesSearch =
        !query ||
        normalizeText(evento.nombre_evento).includes(query) ||
        normalizeText(competencia).includes(query) ||
        normalizeText(escenario).includes(query);
      const matchesCompetencia =
        !competenciaFilter ||
        String(evento.id_competencia) === competenciaFilter;
      const matchesEstado =
        !estadoFilter || normalizeText(evento.estado_evento) === estadoFilter;

      return matchesSearch && matchesCompetencia && matchesEstado;
    });
  }, [competenciaFilter, estadoFilter, eventos, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEventos.length / pageSize));
  const paginatedEventos = filteredEventos.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const summary = useMemo(() => {
    const base = eventos;

    return {
      total: base.length,
      programados: base.filter((evento) =>
        normalizeText(evento.estado_evento) === 'PROGRAMADO',
      ).length,
      finalizados: base.filter((evento) =>
        normalizeText(evento.estado_evento) === 'FINALIZADO',
      ).length,
      suspendidos: base.filter((evento) =>
        normalizeText(evento.estado_evento) === 'SUSPENDIDO',
      ).length,
    };
  }, [eventos]);

  const openForm = (evento?: EventoIndividual) => {
    setEditing(evento ?? null);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (
    payload: EventoIndividualCreate | EventoIndividualUpdate,
  ) => {
    if (editing) {
      await updateEventoIndividual(editing.id_evento_individual, payload);
    } else {
      await createEventoIndividual(payload as EventoIndividualCreate);
    }

    setIsModalOpen(false);
    setEditing(null);
    await load();
  };

  const goToDetail = (
    evento: EventoIndividual,
    openTab?: ViewState['openTab'],
  ) => {
    navigate(`/eventos-individuales/${evento.id_evento_individual}`, {
      state: { evento, openTab } as ViewState & { evento: EventoIndividual },
    });
  };

  if (!user) {
    return <p className="text-sm text-slate-600">Cargando usuario...</p>;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!canView) {
    return <ErrorMessage message="No tienes permisos." />;
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title={isDelegado ? 'Mis eventos individuales' : 'Eventos individuales'}
        description="Consulta eventos, participantes y resultados de competencias individuales."
        actionLabel={canCreate ? 'Nuevo evento' : undefined}
        onAction={canCreate ? () => openForm() : undefined}
      />

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardStat title="Total eventos" value={summary.total} tone="slate" />
        <CardStat
          title="Programados"
          value={summary.programados}
          tone="blue"
        />
        <CardStat
          title="Finalizados"
          value={summary.finalizados}
          tone="green"
        />
        <CardStat
          title="Suspendidos"
          value={summary.suspendidos}
          tone="amber"
        />
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <SearchBar
          value={search}
          placeholder="Evento, competencia o escenario"
          onChange={(event) => setSearch(event.target.value)}
        />
        <FilterSelect
          label="Competencia"
          value={competenciaFilter}
          options={competencias}
          onChange={(event) => setCompetenciaFilter(event.target.value)}
        />
        <FilterSelect
          label="Estado"
          value={estadoFilter}
          options={['PROGRAMADO', 'FINALIZADO', 'SUSPENDIDO', 'CANCELADO'].map(
            (estado) => ({ value: estado, label: estado }),
          )}
          onChange={(event) => setEstadoFilter(event.target.value)}
        />
      </section>

      <DataTable
        data={paginatedEventos}
        getKey={(evento) => evento.id_evento_individual}
        emptyMessage="No hay eventos individuales registrados."
        columns={[
          {
            key: 'evento',
            header: 'Evento',
            render: (evento) => evento.nombre_evento,
          },
          {
            key: 'competencia',
            header: 'Competencia',
            render: (evento) =>
              getCompetenciaNombre(evento.competencia) ||
              `Competencia ${evento.id_competencia}`,
          },
          {
            key: 'fecha',
            header: 'Fecha',
            render: (evento) => formatDateOnly(evento.fecha_evento),
          },
          {
            key: 'hora',
            header: 'Hora',
            render: (evento) => formatTimeHHMM(evento.hora_evento),
          },
          {
            key: 'escenario',
            header: 'Escenario',
            render: (evento) => getEscenarioNombre(evento.escenario),
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (evento) => evento.tipo_evento || '-',
          },
          {
            key: 'estado',
            header: 'Estado',
            render: (evento) => <EventoEstadoBadge estado={evento.estado_evento} />,
          },
          {
            key: 'participantes',
            header: 'Participantes',
            render: (evento) => `${evento.participantes?.length ?? 0}`,
          },
        ]}
        renderActions={(evento) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => goToDetail(evento)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Ver detalle
            </button>
            {canEdit ? (
              <button
                type="button"
                onClick={() => openForm(evento)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Editar
              </button>
            ) : null}
            {canRegisterResults ? (
              <button
                type="button"
                onClick={() => goToDetail(evento, 'resultados')}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Resultados
              </button>
            ) : null}
          </div>
        )}
      />

      <Pagination
        currentPage={Math.min(page, totalPages)}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredEventos.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {isModalOpen ? (
        <EventoIndividualFormModal
          evento={editing}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

export { EventoEstadoBadge };
