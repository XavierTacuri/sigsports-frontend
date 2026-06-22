import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { partidosApi } from '../../api/partidosApi';
import { planillasApi } from '../../api/planillasApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { PartidoStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { PlanillaStatusBadge } from '../../components/planillas/PlanillaStatusBadge';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import type { Club, Competencia, Partido, PlanillaPartido } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { formatTimeHHMM } from '../../utils/dateFormat';
import { normalizeText } from '../../utils/planillaDeporte';

const isCompetenciaIndividual = (competencia?: Competencia) => {
  const nombre = normalizeText(competencia?.nombre_competencia);
  return (
    nombre.includes('AJEDREZ') ||
    nombre.includes('AJEDRES') ||
    nombre.includes('CICLISMO') ||
    nombre.includes('ATLETISMO')
  );
};

export function PlanillasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleName = getRoleName(user);
  const canRead = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'DELEGADO',
    'PLANILLERO',
  ].includes(roleName);
  const canManage = ['ADMINISTRADOR', 'PLANILLERO'].includes(roleName);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [planillas, setPlanillas] = useState<PlanillaPartido[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [visibleClubIds, setVisibleClubIds] = useState<Set<number>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finishTarget, setFinishTarget] = useState<PlanillaPartido | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    id_competencia: '',
    estado_partido: '',
    fecha: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    if (!user || !canRead) {
      setIsLoading(false);
      return;
    }
    try {
      setError('');
      setIsLoading(true);
      const [partidosData, planillasData] = await Promise.all([
        partidosApi.listar(),
        planillasApi.listar(),
      ]);
      const [clubesResult, competenciasResult] = await Promise.allSettled([
        clubesApi.listar(),
        competenciasApi.listar(),
      ]);
      setPartidos(partidosData);
      setPlanillas(planillasData);
      setClubes(clubesResult.status === 'fulfilled' ? clubesResult.value : []);
      setCompetencias(
        competenciasResult.status === 'fulfilled'
          ? competenciasResult.value
          : [],
      );

      if (roleName === 'DELEGADO') {
        const links = await usuariosClubesApi.listarPorUsuario(user.id_usuario);
        setVisibleClubIds(new Set(links.map((item) => item.id_club)));
      } else {
        setVisibleClubIds(undefined);
      }
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar las planillas.'
          : getApiErrorMessage(
              requestError,
              'No se pudieron cargar las planillas deportivas.',
            ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, roleName, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const names = useMemo(
    () => ({
      clubs: new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
      competitions: new Map(
        competencias.map((item) => [
          item.id_competencia,
          item.nombre_competencia,
        ]),
      ),
    }),
    [clubes, competencias],
  );

  const rows = useMemo(() => {
    const planillaByPartido = new Map(
      planillas.map((item) => [item.id_partido, item]),
    );
    return partidos
      .filter((partido) => {
        const competencia = competencias.find(
          (item) => item.id_competencia === partido.id_competencia,
        );
        return !isCompetenciaIndividual(competencia);
      })
      .filter(
        (partido) =>
          !visibleClubIds ||
          visibleClubIds.has(partido.id_club_local) ||
          visibleClubIds.has(partido.id_club_visitante),
      )
      .map((partido) => ({
        partido,
        planilla: planillaByPartido.get(partido.id_partido ?? 0),
      }));
  }, [competencias, partidos, planillas, visibleClubIds]);

  const filteredRows = rows.filter(({ partido }) => {
    const local = names.clubs.get(partido.id_club_local) ?? '';
    const visitante = names.clubs.get(partido.id_club_visitante) ?? '';
    const competencia = names.competitions.get(partido.id_competencia) ?? '';
    const query = normalizeText(filters.search);

    return (
      (!filters.id_competencia ||
        partido.id_competencia === Number(filters.id_competencia)) &&
      (!filters.estado_partido ||
        partido.estado_partido === filters.estado_partido) &&
      (!filters.fecha || partido.fecha_partido?.split('T')[0] === filters.fecha) &&
      (!query ||
        normalizeText(`${local} ${visitante} ${competencia}`).includes(query))
    );
  });
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const createPlanilla = async (partido: Partido) => {
    if (!partido.id_partido || isSubmitting) return;
    try {
      setError('');
      setIsSubmitting(true);
      const created = await planillasApi.crear({
        id_partido: partido.id_partido,
        observaciones: null,
      });
      navigate(
        created.id_planilla
          ? `/planillas/${created.id_planilla}`
          : `/partidos/${partido.id_partido}/planilla`,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo crear la planilla.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishPlanilla = async (planilla: PlanillaPartido) => {
    if (!planilla.id_planilla || isSubmitting) return;
    try {
      setError('');
      setIsSubmitting(true);
      await planillasApi.finalizar(planilla.id_planilla);
      setFinishTarget(null);
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo finalizar la planilla.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-slate-600">Cargando usuario...</p>;
  }
  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!canRead) {
    return <ErrorMessage message="No tienes permisos para realizar esta acción." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={roleName === 'PLANILLERO' ? 'Mis planillas' : 'Planillas deportivas'}
        description="Consulta y registra la planilla deportiva de cada partido."
      />
      <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Las competencias individuales se gestionan desde Eventos individuales.
      </p>
      {error ? <ErrorMessage message={error} /> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <FilterSelect
            label="Competencia"
            value={filters.id_competencia}
            options={competencias
              .filter((competencia) => !isCompetenciaIndividual(competencia))
              .map((competencia) => ({
                value: String(competencia.id_competencia),
                label: competencia.nombre_competencia,
              }))}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                id_competencia: event.target.value,
              }))
            }
          />
          <FilterSelect
            label="Estado partido"
            value={filters.estado_partido}
            options={[
              { value: 'PROGRAMADO', label: 'Programado' },
              { value: 'EN_JUEGO', label: 'En juego' },
              { value: 'FINALIZADO', label: 'Finalizado' },
              { value: 'SUSPENDIDO', label: 'Suspendido' },
              { value: 'CANCELADO', label: 'Cancelado' },
            ]}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                estado_partido: event.target.value,
              }))
            }
          />
          <SearchBar
            label="Buscar club"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          <label className="block text-sm font-medium text-slate-700">
            Fecha
            <input
              type="date"
              value={filters.fecha}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  fecha: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </section>
      <DataTable
        data={paginatedRows}
        getKey={(row) => row.partido.id_partido ?? JSON.stringify(row.partido)}
        emptyMessage="No hay partidos disponibles para gestionar planillas."
        columns={[
          {
            key: 'partido',
            header: 'Partido',
            render: ({ partido }) =>
              `${names.clubs.get(partido.id_club_local) ?? `Club ${partido.id_club_local}`} vs ${names.clubs.get(partido.id_club_visitante) ?? `Club ${partido.id_club_visitante}`}`,
          },
          {
            key: 'competencia',
            header: 'Competencia',
            render: ({ partido }) =>
              names.competitions.get(partido.id_competencia) ??
              `Competencia ${partido.id_competencia}`,
          },
          {
            key: 'fecha',
            header: 'Fecha',
            render: ({ partido }) =>
              partido.fecha_partido?.split('T')[0] ?? '-',
          },
          {
            key: 'hora',
            header: 'Hora',
            render: ({ partido }) => formatTimeHHMM(partido.hora_partido),
          },
          {
            key: 'estado-partido',
            header: 'Estado partido',
            render: ({ partido }) => (
              <PartidoStatusBadge estado={partido.estado_partido} />
            ),
          },
          {
            key: 'estado-planilla',
            header: 'Estado planilla',
            render: ({ planilla }) =>
              planilla ? (
                <PlanillaStatusBadge estado={planilla.estado_planilla} />
              ) : (
                <span className="text-slate-500">SIN PLANILLA</span>
              ),
          },
        ]}
        renderActions={({ partido, planilla }) => (
          <div className="flex justify-end gap-2">
            {!planilla && canManage ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => void createPlanilla(partido)}
                className="px-3 py-1.5 text-xs"
              >
                Crear planilla
              </Button>
            ) : null}
            {planilla?.id_planilla ? (
              <Link
                to={`/planillas/${planilla.id_planilla}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {canManage && planilla.estado_planilla === 'BORRADOR'
                  ? 'Registrar eventos'
                  : 'Ver planilla'}
              </Link>
            ) : null}
            {canManage &&
            planilla?.estado_planilla === 'BORRADOR' &&
            planilla.id_planilla ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFinishTarget(planilla)}
                className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Finalizar planilla
              </button>
            ) : null}
          </div>
        )}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredRows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
      {finishTarget ? (
        <ConfirmDialog
          title="Finalizar planilla"
          message="¿Seguro que deseas finalizar esta planilla? Esta acción actualizará marcador, tabla de posiciones, sanciones y goleadores."
          confirmLabel="Finalizar planilla"
          isSubmitting={isSubmitting}
          onCancel={() => setFinishTarget(null)}
          onConfirm={() => void finishPlanilla(finishTarget)}
        />
      ) : null}
    </div>
  );
}
