import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { categoriasApi } from '../../api/categoriasApi';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { deportesApi } from '../../api/deportesApi';
import { inscripcionesApi } from '../../api/inscripcionesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { InscripcionStatusBadge } from '../../components/inscripciones/InscripcionStatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type {
  Categoria,
  Club,
  Competencia,
  Deporte,
  InscripcionCompetencia,
  Jugador,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { paginate } from '../../utils/pagination';

const allowedRoles = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'];
const estados = ['ACTIVA', 'INACTIVA', 'RETIRADA', 'TRANSFERIDA', 'SUSPENDIDA'];

type NamedValue = {
  nombre?: string;
  nombre_competencia?: string;
  nombre_deporte?: string;
  nombre_categoria?: string;
  nombre_completo?: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
};

type InscripcionWithDetails = InscripcionCompetencia & {
  competencia?: NamedValue & {
    deporte?: NamedValue | string;
    categoria?: NamedValue | string;
  };
  club?: NamedValue & {
    nombre_club?: string;
  };
  deporte?: NamedValue | string;
  categoria?: NamedValue | string;
  jugador?: NamedValue;
  nombre_competencia?: string;
  competencia_nombre?: string;
  nombre_deporte?: string;
  deporte_nombre?: string;
  nombre_categoria?: string;
  categoria_nombre?: string;
  nombre_completo?: string;
  nombre_jugador?: string;
  jugador_nombre?: string;
  cedula?: string;
  cedula_jugador?: string;
  jugador_cedula?: string;
  nombre_club?: string;
  club_nombre?: string;
};

const inferDeporteFromCompetencia = (nombre: string) => {
  const normalized = nombre.toUpperCase();

  if (normalized.includes('FUTBOL')) return 'Futbol';
  if (normalized.includes('INDOR')) return 'Indor';
  if (normalized.includes('BASQUET')) return 'Basquet';
  if (normalized.includes('VOLEY')) return 'Voley';
  if (normalized.includes('AJEDREZ')) return 'Ajedrez';
  if (normalized.includes('CICLISMO')) return 'Ciclismo';
  if (normalized.includes('ATLETISMO')) return 'Atletismo';
  if (normalized.includes('TENIS')) return 'Tenis de Mesa';

  return '-';
};

const inferCategoriaFromCompetencia = (nombre: string) => {
  const normalized = nombre.toUpperCase();

  if (normalized.includes('LIBRE')) return 'Libre M';
  if (normalized.includes('SUB')) {
    const match = normalized.match(/SUB\s*(\d+)/);
    return match ? `Sub ${match[1]}` : 'Sub';
  }
  if (normalized.includes('POST')) {
    const match = normalized.match(/POST\s*(\d+)\s*-\s*(\d+)/);
    return match ? `Post ${match[1]}-${match[2]}` : 'Post';
  }

  return '-';
};

type CompetenciaWithDetails = Competencia & {
  nombre?: string;
  deporte?: NamedValue;
  categoria?: NamedValue;
  nombre_deporte?: string;
  nombre_categoria?: string;
  deporte_nombre?: string;
  categoria_nombre?: string;
};

type InscripcionesJugadorGrupo = {
  id_jugador: number;
  id_club: number;
  nombre_jugador: string;
  cedula: string;
  nombre_club: string;
  genero?: string | null;
  fecha_nacimiento?: string | null;
  inscripciones: InscripcionCompetencia[];
};

const uniqueOptions = (values: Array<string | undefined>) =>
  [...new Set(values.filter(Boolean) as string[])].map((value) => ({
    value,
    label: value,
  }));

const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

export function InscripcionesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const roleName = getRoleName(user);
  const isDelegado = roleName === 'DELEGADO';
  const canViewInscripciones = allowedRoles.includes(roleName);
  const canCreateInscripcion = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'].includes(
    roleName,
  );
  const [inscripciones, setInscripciones] = useState<InscripcionCompetencia[]>(
    [],
  );
  const [clubes, setClubes] = useState<Club[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [filters, setFilters] = useState({
    id_competencia: '',
    id_club: '',
    id_deporte: '',
    id_categoria: '',
    estado: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGrupo, setSelectedGrupo] =
    useState<InscripcionesJugadorGrupo | null>(null);
  const {
    clubesAsociados,
    selectedClubName,
    loadingClubes,
    errorClubes,
  } = useDelegadoClubes(user ?? null, isDelegado);

  useEffect(() => {
    if (isAuthLoading || (isDelegado && loadingClubes)) {
      return;
    }

    if (!canViewInscripciones || !user) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError('');
        setIsLoading(true);

        if (isDelegado) {
          const clubesAsignados = clubesAsociados;
          const clubIds = clubesAsignados
            .map((club) => club.id_club)
            .filter((idClub): idClub is number => idClub !== undefined);

          const [inscripcionesPorClub, jugadoresPorClub] = await Promise.all([
            Promise.all(
              clubIds.map((idClub) =>
                inscripcionesApi.getInscripcionesByClub(idClub),
              ),
            ),
            Promise.all(
              clubIds.map((idClub) => jugadoresApi.listarPorClub(idClub)),
            ),
          ]);
          const inscripcionesDelegado = inscripcionesPorClub.flat();
          const estadosOcultos = [
            'TRANSFERIDA',
            'RETIRADA',
            'INACTIVA',
            'CANCELADA',
          ];
          const inscripcionesVigentes = inscripcionesDelegado.filter((item) => {
            const estado = String(item.estado_inscripcion ?? '').toUpperCase();

            return !estadosOcultos.includes(estado);
          });
          try {
            const competenciasData = await competenciasApi.listar();
            setCompetencias(competenciasData);
          } catch {
            setCompetencias([]);
          }

          setClubes(clubesAsignados);
          setInscripciones(inscripcionesVigentes);
          setJugadores(jugadoresPorClub.flat());
          setDeportes([]);
          setCategorias([]);

          if (clubesAsignados.length === 1 && clubesAsignados[0].id_club) {
            setFilters((current) => ({
              ...current,
              id_club: String(clubesAsignados[0].id_club),
            }));
          }
        } else {
          const [
            clubesData,
            competenciasData,
            deportesData,
            categoriasData,
            inscripcionesData,
            jugadoresData,
          ] = await Promise.all([
            clubesApi.listar(),
            competenciasApi.listar(),
            deportesApi.listar(),
            categoriasApi.listar(),
            inscripcionesApi.getInscripciones(),
            jugadoresApi.listar(),
          ]);
          setClubes(clubesData);
          setCompetencias(competenciasData);
          setDeportes(deportesData);
          setCategorias(categoriasData);
          setInscripciones(inscripcionesData);
          setJugadores(jugadoresData);
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            isDelegado
              ? 'No se pudieron cargar las inscripciones de tu club.'
              : 'No se pudieron cargar las inscripciones.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [
    canViewInscripciones,
    clubesAsociados,
    isAuthLoading,
    isDelegado,
    loadingClubes,
    user,
  ]);

  const competenciaById = useMemo(
    () => new Map(competencias.map((item) => [item.id_competencia, item])),
    [competencias],
  );
  const clubNames = useMemo(
    () => new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
    [clubes],
  );
  const deporteNames = useMemo(
    () =>
      new Map(deportes.map((item) => [item.id_deporte, item.nombre_deporte])),
    [deportes],
  );
  const categoriaNames = useMemo(
    () =>
      new Map(
        categorias.map((item) => [item.id_categoria, item.nombre_categoria]),
      ),
    [categorias],
  );
  const jugadoresById = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item])),
    [jugadores],
  );
  const showClubFilter = !isDelegado || clubes.length > 1;
  const showClubColumn = !isDelegado || clubes.length > 1;
  const assignedClub = clubes.length === 1 ? clubes[0] : null;
  const getCompetenciaName = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;
    const competencia = competenciaById.get(
      item.id_competencia,
    ) as CompetenciaWithDetails | undefined;

    return (
      details.competencia?.nombre_competencia ??
      details.nombre_competencia ??
      details.competencia_nombre ??
      details.competencia?.nombre ??
      (details as { nombre?: string }).nombre ??
      competencia?.nombre_competencia ??
      competencia?.nombre ??
      '-'
    );
  }, [competenciaById]);
  const getClubName = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;

    return (
      details.club?.nombre_club ??
      details.nombre_club ??
      details.club_nombre ??
      clubNames.get(item.id_club) ??
      '-'
    );
  }, [clubNames]);
  const getDeporteName = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;
    const competencia = competenciaById.get(
      item.id_competencia,
    ) as CompetenciaWithDetails | undefined;
    const deporte = details.deporte;
    const competenciaDeporte = details.competencia?.deporte;
    const competenciaNombre = getCompetenciaName(item);

    if (typeof deporte === 'string') {
      return deporte;
    }

    if (typeof competenciaDeporte === 'string') {
      return competenciaDeporte;
    }

    return (
      competenciaDeporte?.nombre_deporte ??
      competenciaDeporte?.nombre ??
      deporte?.nombre_deporte ??
      deporte?.nombre ??
      details.nombre_deporte ??
      details.deporte_nombre ??
      details.competencia?.nombre_deporte ??
      competencia?.deporte?.nombre_deporte ??
      competencia?.deporte?.nombre ??
      competencia?.nombre_deporte ??
      competencia?.deporte_nombre ??
      deporteNames.get(competencia?.id_deporte) ??
      inferDeporteFromCompetencia(competenciaNombre)
    );
  }, [competenciaById, deporteNames, getCompetenciaName]);
  const getCategoriaName = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;
    const competencia = competenciaById.get(
      item.id_competencia,
    ) as CompetenciaWithDetails | undefined;
    const categoria = details.categoria;
    const competenciaCategoria = details.competencia?.categoria;
    const competenciaNombre = getCompetenciaName(item);

    if (typeof categoria === 'string') {
      return categoria;
    }

    if (typeof competenciaCategoria === 'string') {
      return competenciaCategoria;
    }

    return (
      competenciaCategoria?.nombre_categoria ??
      competenciaCategoria?.nombre ??
      categoria?.nombre_categoria ??
      categoria?.nombre ??
      details.nombre_categoria ??
      details.categoria_nombre ??
      details.competencia?.nombre_categoria ??
      competencia?.categoria?.nombre_categoria ??
      competencia?.categoria?.nombre ??
      competencia?.nombre_categoria ??
      competencia?.categoria_nombre ??
      categoriaNames.get(competencia?.id_categoria) ??
      inferCategoriaFromCompetencia(competenciaNombre)
    );
  }, [categoriaNames, competenciaById, getCompetenciaName]);
  const getJugadorName = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;
    const jugador = jugadoresById.get(item.id_jugador);
    const nombreDesdeJugador = joinName(
      details.jugador?.nombres,
      details.jugador?.apellidos,
    );
    const nombrePlano = joinName(
      (details as { nombres?: string }).nombres,
      (details as { apellidos?: string }).apellidos,
    );

    return (
      details.jugador?.nombre_completo ??
      details.nombre_completo ??
      details.nombre_jugador ??
      details.jugador_nombre ??
      (nombreDesdeJugador || undefined) ??
      (nombrePlano || undefined) ??
      jugador?.nombre_completo ??
      'Jugador no encontrado'
    );
  }, [jugadoresById]);
  const getJugadorCedula = useCallback((item: InscripcionCompetencia) => {
    const details = item as InscripcionWithDetails;
    const jugador = jugadoresById.get(item.id_jugador);

    return (
      details.jugador?.cedula ??
      details.cedula ??
      details.cedula_jugador ??
      details.jugador_cedula ??
      jugador?.cedula ??
      '-'
    );
  }, [jugadoresById]);
  const deporteOptions = useMemo(
    () =>
      isDelegado
        ? uniqueOptions(inscripciones.map((item) => getDeporteName(item)))
        : deportes.map((item) => ({
            value: String(item.id_deporte),
            label: item.nombre_deporte,
          })),
    [deportes, getDeporteName, inscripciones, isDelegado],
  );
  const categoriaOptions = useMemo(
    () =>
      isDelegado
        ? uniqueOptions(inscripciones.map((item) => getCategoriaName(item)))
        : categorias.map((item) => ({
            value: String(item.id_categoria),
            label: item.nombre_categoria,
          })),
    [categorias, getCategoriaName, inscripciones, isDelegado],
  );
  const competenciaOptions = useMemo(
    () =>
      isDelegado
        ? uniqueOptions(
            inscripciones
              .map((item) => getCompetenciaName(item))
              .filter((value) => value && value !== '-'),
          )
        : competencias.map((item) => ({
            value: String(item.id_competencia),
            label: item.nombre_competencia,
          })),
    [competencias, getCompetenciaName, inscripciones, isDelegado],
  );

  const filteredInscripciones = useMemo(() => {
    const search = filters.search.trim().toUpperCase();

    return inscripciones.filter((item) => {
      const competencia = competenciaById.get(item.id_competencia);
      const competenciaNombre = getCompetenciaName(item);
      const competenciaNombreUpper = competenciaNombre.toUpperCase();
      const jugadorNombre = getJugadorName(item).toUpperCase();
      const cedula = getJugadorCedula(item).toUpperCase();

      if (isDelegado) {
        const matchesCompetencia =
          !filters.id_competencia ||
          competenciaNombreUpper === filters.id_competencia.toUpperCase();

        const matchesSearch =
          !search ||
          competenciaNombreUpper.includes(search) ||
          jugadorNombre.includes(search) ||
          cedula.includes(search);

        return matchesCompetencia && matchesSearch;
      }

      return (
        (!filters.id_competencia ||
          item.id_competencia === Number(filters.id_competencia)) &&
        (!filters.id_club || item.id_club === Number(filters.id_club)) &&
        (!filters.id_deporte ||
          competencia?.id_deporte === Number(filters.id_deporte)) &&
        (!filters.id_categoria ||
          competencia?.id_categoria === Number(filters.id_categoria)) &&
        (!filters.estado || item.estado_inscripcion === filters.estado) &&
        (!search ||
          [
            jugadorNombre,
            cedula,
            competenciaNombreUpper,
            getDeporteName(item)?.toUpperCase(),
            getCategoriaName(item)?.toUpperCase(),
          ]
            .filter(Boolean)
            .some((value) => value?.includes(search)))
      );
    });
  }, [
    competenciaById,
    filters,
    getCategoriaName,
    getCompetenciaName,
    getDeporteName,
    getJugadorCedula,
    getJugadorName,
    inscripciones,
    isDelegado,
  ]);

  const groupedInscripciones = useMemo(() => {
    const groups = new Map<string, InscripcionesJugadorGrupo>();

    filteredInscripciones.forEach((item) => {
      const idJugador = Number(item.id_jugador);
      const idClub = Number(item.id_club);

      if (!idJugador) {
        return;
      }

      const jugador = jugadoresById.get(idJugador);
      const groupKey = `${idJugador}-${idClub || 'sin-club'}`;
      const current = groups.get(groupKey);

      if (current) {
        current.inscripciones.push(item);
        return;
      }

      groups.set(groupKey, {
        id_jugador: idJugador,
        id_club: idClub,
        nombre_jugador: getJugadorName(item),
        cedula: getJugadorCedula(item),
        nombre_club: getClubName(item),
        genero: jugador?.genero,
        fecha_nacimiento: jugador?.fecha_nacimiento,
        inscripciones: [item],
      });
    });

    return [...groups.values()];
  }, [
    filteredInscripciones,
    getClubName,
    getJugadorCedula,
    getJugadorName,
    jugadoresById,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const totalPages = Math.ceil(groupedInscripciones.length / pageSize);
  const paginatedGrupos = paginate(
    groupedInscripciones,
    currentPage,
    pageSize,
  );

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'nombre_jugador',
        header: 'Jugador',
        render: (item: InscripcionesJugadorGrupo) => item.nombre_jugador,
      },
      {
        key: 'cedula',
        header: 'Cedula',
        render: (item: InscripcionesJugadorGrupo) => item.cedula,
      },
    ];

    return [
      ...baseColumns,
      ...(showClubColumn
        ? [
            {
              key: 'club',
              header: 'Club',
              render: (item: InscripcionesJugadorGrupo) => item.nombre_club,
            },
          ]
        : []),
      {
        key: 'total',
        header: 'Inscripciones',
        render: (item: InscripcionesJugadorGrupo) => item.inscripciones.length,
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: InscripcionesJugadorGrupo) => {
          const hasActiva = item.inscripciones.some(
            (inscripcion) => inscripcion.estado_inscripcion === 'ACTIVA',
          );
          const estado = hasActiva
            ? 'ACTIVA'
            : item.inscripciones[0]?.estado_inscripcion ?? 'INACTIVA';

          return <InscripcionStatusBadge estado={estado} />;
        },
      },
    ];
  }, [showClubColumn]);

  if (isAuthLoading || !user) {
    return <p>Cargando usuario...</p>;
  }

  if (isLoading || loadingClubes) {
    return <LoadingSpinner />;
  }

  if (!canViewInscripciones) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este modulo." />
    );
  }

  const successMessage = (location.state as { success?: string } | null)
    ?.success;

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            {isDelegado ? 'Mis inscripciones' : 'Inscripciones'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta los jugadores inscritos en competencias.
          </p>
        </div>
        {canCreateInscripcion ? (
          <Link
            to="/inscripciones/nueva"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {isDelegado || roleName === 'SECRETARIA'
              ? 'Inscribir jugador'
              : 'Nueva inscripcion'}
          </Link>
        ) : null}
      </div>

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
      {error || errorClubes ? (
        <ErrorMessage message={error || errorClubes} />
      ) : null}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        {isDelegado && assignedClub ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Club asignado:</span>{' '}
            {selectedClubName || 'Sin club asignado'}
          </div>
        ) : null}
        <FormSelect
          label="Competencia"
          value={filters.id_competencia}
          options={competenciaOptions}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              id_competencia: event.target.value,
            }))
          }
        />
        {showClubFilter ? (
          <FormSelect
            label="Club"
            value={filters.id_club}
            options={clubes.map((item) => ({
              value: String(item.id_club),
              label: item.nombre_club,
            }))}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                id_club: event.target.value,
              }))
            }
          />
        ) : null}
        {!isDelegado ? (
          <>
            <FormSelect
              label="Deporte"
              value={filters.id_deporte}
              options={deporteOptions}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  id_deporte: event.target.value,
                }))
              }
            />
            <FormSelect
              label="Categoria"
              value={filters.id_categoria}
              options={categoriaOptions}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  id_categoria: event.target.value,
                }))
              }
            />
            <FormSelect
              label="Estado"
              value={filters.estado}
              options={estados.map((estado) => ({
                value: estado,
                label: estado,
              }))}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  estado: event.target.value,
                }))
              }
            />
          </>
        ) : null}
        <FormInput
          label="Buscar"
          value={filters.search}
          placeholder={
            isDelegado
              ? 'Jugador, cedula o competencia'
              : 'Jugador, cedula, competencia, deporte o categoria'
          }
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
        />
      </section>

      <DataTable
        columns={columns}
        data={paginatedGrupos}
        getKey={(item) => `${item.id_jugador}-${item.id_club}`}
        emptyMessage={
          isDelegado && inscripciones.length === 0
            ? 'No hay inscripciones registradas para tu club.'
            : 'No hay inscripciones que coincidan con los filtros.'
        }
        renderActions={(item) => (
          <button
            type="button"
            onClick={() => setSelectedGrupo(item)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Ver detalle
          </button>
        )}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={groupedInscripciones.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
      {selectedGrupo ? (
        <Modal
          title={`Inscripciones de ${selectedGrupo.nombre_jugador}`}
          onClose={() => setSelectedGrupo(null)}
          maxWidth="5xl"
        >
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  Jugador
                </span>
                <span className="font-semibold text-slate-950">
                  {selectedGrupo.nombre_jugador}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  Cedula
                </span>
                <span>{selectedGrupo.cedula}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  Club
                </span>
                <span>{selectedGrupo.nombre_club}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  Genero
                </span>
                <span>{selectedGrupo.genero ?? '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  Fecha nacimiento
                </span>
                <span>{selectedGrupo.fecha_nacimiento ?? '-'}</span>
              </div>
            </div>

            <DataTable
              columns={[
                {
                  key: 'competencia',
                  header: 'Competencia',
                  render: (item: InscripcionCompetencia) =>
                    getCompetenciaName(item),
                },
                {
                  key: 'deporte',
                  header: 'Deporte',
                  render: (item: InscripcionCompetencia) =>
                    getDeporteName(item) ?? '-',
                },
                {
                  key: 'categoria',
                  header: 'Categoria',
                  render: (item: InscripcionCompetencia) =>
                    getCategoriaName(item) ?? '-',
                },
                {
                  key: 'camiseta',
                  header: 'Numero camiseta',
                  render: (item: InscripcionCompetencia) =>
                    item.numero_camiseta ?? '-',
                },
                {
                  key: 'anio',
                  header: 'Anio',
                  render: (item: InscripcionCompetencia) =>
                    item.anio_participacion ?? '-',
                },
                {
                  key: 'estado',
                  header: 'Estado',
                  render: (item: InscripcionCompetencia) => (
                    <InscripcionStatusBadge estado={item.estado_inscripcion} />
                  ),
                },
                {
                  key: 'observaciones',
                  header: 'Observaciones',
                  render: (item: InscripcionCompetencia) =>
                    item.observaciones || '-',
                },
              ]}
              data={selectedGrupo.inscripciones}
              getKey={(item) =>
                item.id_inscripcion_competencia ??
                `${item.id_competencia}-${item.id_club}-${item.id_jugador}`
              }
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
