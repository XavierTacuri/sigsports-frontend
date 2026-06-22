import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { JugadorForm } from '../../components/forms/JugadorForm';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { PageHeader } from '../../components/layout/PageHeader';
import { CardStat } from '../../components/ui/CardStat';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type { Club, EstadoJugador, Jugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAssetUrl } from '../../utils/assetUrl';
import { paginate } from '../../utils/pagination';

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; jugador: Jugador }
  | { type: 'detail'; jugador: Jugador }
  | null;

const estadoOptions: { value: EstadoJugador; label: string }[] = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'PENDIENTE_VALIDACION', label: 'Pendiente' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

const generoOptions = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'OTRO', label: 'Otro' },
];

const normalizeText = (text?: string | null) =>
  (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getJugadorNombre = (jugador: Jugador) =>
  jugador.nombre_completo ||
  `${jugador.nombres ?? ''} ${jugador.apellidos ?? ''}`.trim();

const getEstadoLabel = (estado: EstadoJugador) =>
  estadoOptions.find((item) => item.value === estado)?.label ?? estado;

const getEdad = (fechaNacimiento?: string | null) => {
  if (!fechaNacimiento) return '-';

  const birthDate = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '-';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : '-';
};

const getIniciales = (nombre: string) => {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

export function JugadoresPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    genero: '',
    id_club: '',
  });
  const role = user?.rol?.nombre_rol;
  const isDelegado = role === 'DELEGADO';
  const canRead = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'].includes(
    role ?? '',
  );
  const canCreate = ['ADMINISTRADOR', 'DELEGADO'].includes(role ?? '');
  const { clubesAsociados, loadingClubes, errorClubes } = useDelegadoClubes(
    user ?? null,
    isDelegado,
  );

  const loadData = async () => {
    if (!canRead || !user || (isDelegado && loadingClubes)) {
      if (!canRead) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const clubesData = isDelegado ? clubesAsociados : await clubesApi.listar();
      const clubIds = new Set(
        clubesData
          .map((club) => club.id_club)
          .filter((idClub): idClub is number => idClub !== undefined),
      );
      const jugadoresData = isDelegado
        ? (
            await Promise.all(
              [...clubIds].map((idClub) => jugadoresApi.listarPorClub(idClub)),
            )
          ).flat()
        : await jugadoresApi.listar();

      console.log('Rol:', role);
      console.log('Jugadores recibidos:', jugadoresData.length);
      console.log('Jugadores normalizados:', jugadoresData.length);

      setClubes(clubesData);
      setJugadores(
        isDelegado && clubIds.size > 0
          ? jugadoresData.filter((jugador) => clubIds.has(jugador.id_club))
          : jugadoresData,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudieron cargar los jugadores.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, clubesAsociados, isDelegado, loadingClubes, user]);

  useEffect(() => {
    const state = location.state as { success?: string } | null;
    if (state?.success) {
      setSuccessMessage(state.success);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const clubNames = useMemo(
    () => new Map(clubes.map((club) => [club.id_club, club.nombre_club])),
    [clubes],
  );

  const getClubNombre = useCallback(
    (jugador: Jugador) =>
      clubNames.get(jugador.id_club) ?? `Club ${jugador.id_club}`,
    [clubNames],
  );

  const visibleJugadores = useMemo(() => {
    const search = normalizeText(filters.search);

    return jugadores.filter((jugador) => {
      const matchesSearch =
        !search ||
        normalizeText(getJugadorNombre(jugador)).includes(search) ||
        normalizeText(jugador.cedula).includes(search) ||
        normalizeText(getClubNombre(jugador)).includes(search);
      const matchesEstado =
        !filters.estado || jugador.estado_jugador === filters.estado;
      const matchesGenero = !filters.genero || jugador.genero === filters.genero;
      const matchesClub =
        !filters.id_club || jugador.id_club === Number(filters.id_club);

      return matchesSearch && matchesEstado && matchesGenero && matchesClub;
    });
  }, [filters, getClubNombre, jugadores]);

  useEffect(() => {
    console.log('Total mostrado en cards:', visibleJugadores.length);
  }, [visibleJugadores.length]);

  const totalPages = Math.ceil(visibleJugadores.length / pageSize);
  const paginatedJugadores = paginate(visibleJugadores, currentPage, pageSize);
  const rowStart = (currentPage - 1) * pageSize;
  const filtersActive = Object.values(filters).some(Boolean);
  const showClubFilter = !isDelegado;

  const stats = useMemo(
    () => ({
      total: visibleJugadores.length,
      activos: visibleJugadores.filter(
        (item) => item.estado_jugador === 'ACTIVO',
      ).length,
      pendientes: visibleJugadores.filter(
        (item) => item.estado_jugador === 'PENDIENTE_VALIDACION',
      ).length,
      observados: visibleJugadores.filter(
        (item) => item.estado_jugador === 'OBSERVADO',
      ).length,
      rechazados: visibleJugadores.filter(
        (item) => item.estado_jugador === 'RECHAZADO',
      ).length,
    }),
    [visibleJugadores],
  );

  const canEdit = (jugador: Jugador) =>
    role === 'ADMINISTRADOR' ||
    role === 'SECRETARIA' ||
    (role === 'DELEGADO' &&
      ['PENDIENTE_VALIDACION', 'OBSERVADO'].includes(jugador.estado_jugador));

  const closeModal = () => setModal(null);
  const handleSaved = (saved: Jugador, message: string) => {
    setSuccessMessage(message);
    setModal(null);
    setJugadores((current) => {
      const exists = current.some(
        (jugador) => jugador.id_jugador === saved.id_jugador,
      );
      return exists
        ? current.map((jugador) =>
            jugador.id_jugador === saved.id_jugador ? saved : jugador,
          )
        : [saved, ...current];
    });
    void loadData();
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: '#',
        render: (_item: Jugador, index: number) => rowStart + index + 1,
      },
      {
        key: 'jugador',
        header: 'Jugador',
        render: (jugador: Jugador) => {
          const nombre = getJugadorNombre(jugador);

          return (
            <div className="flex min-w-[240px] items-center gap-3">
              {jugador.foto_url ? (
                <img
                  src={getAssetUrl(jugador.foto_url)}
                  alt={nombre}
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {getIniciales(nombre) || 'J'}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {nombre}
                </p>
                {jugador.lugar_nacimiento ? (
                  <p className="truncate text-xs text-slate-500">
                    {jugador.lugar_nacimiento}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'cedula',
        header: 'Cédula',
        render: (jugador: Jugador) => jugador.cedula,
      },
      {
        key: 'club',
        header: 'Club',
        render: (jugador: Jugador) => getClubNombre(jugador),
      },
      {
        key: 'edad',
        header: 'Edad',
        render: (jugador: Jugador) => getEdad(jugador.fecha_nacimiento),
      },
      {
        key: 'genero',
        header: 'Género',
        render: (jugador: Jugador) => jugador.genero || '-',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (jugador: Jugador) => (
          <JugadorStatusBadge estado={jugador.estado_jugador} />
        ),
      },
    ],
    [getClubNombre, rowStart],
  );

  if (!user || isLoading || loadingClubes) {
    return <LoadingSpinner />;
  }

  if (!canRead) {
    return <ErrorMessage message="No tienes permisos para ver jugadores." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Jugadores"
        description="Gestión y validación de jugadores del campeonato."
        actionLabel={canCreate ? 'Nuevo jugador' : undefined}
        onAction={canCreate ? () => setModal({ type: 'create' }) : undefined}
      />

      {error || errorClubes ? (
        <ErrorMessage message={error || errorClubes} />
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CardStat title="Total" value={stats.total} tone="slate" icon="T" />
        <CardStat title="Activos" value={stats.activos} tone="green" icon="A" />
        <CardStat
          title="Pendientes"
          value={stats.pendientes}
          tone="amber"
          icon="P"
        />
        <CardStat
          title="Observados"
          value={stats.observados}
          tone="amber"
          icon="O"
        />
        <CardStat
          title="Rechazados"
          value={stats.rechazados}
          tone="red"
          icon="R"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className={`grid gap-4 ${
            showClubFilter
              ? 'md:grid-cols-2 xl:grid-cols-4'
              : 'md:grid-cols-3'
          }`}
        >
          <SearchBar
            label="Buscar"
            placeholder="Nombre, cédula o club"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          <FilterSelect
            label="Estado"
            value={filters.estado}
            options={estadoOptions}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                estado: event.target.value,
              }))
            }
          />
          <FilterSelect
            label="Género"
            value={filters.genero}
            options={generoOptions}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                genero: event.target.value,
              }))
            }
          />
          {showClubFilter ? (
            <FilterSelect
              label="Club"
              value={filters.id_club}
              options={clubes.map((club) => ({
                value: String(club.id_club),
                label: club.nombre_club,
              }))}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  id_club: event.target.value,
                }))
              }
            />
          ) : null}
        </div>
      </section>

      <DataTable
        columns={columns}
        data={paginatedJugadores}
        getKey={(item) => item.id_jugador ?? item.cedula}
        emptyMessage={
          filtersActive
            ? 'No hay jugadores que coincidan con los filtros.'
            : 'No hay jugadores registrados.'
        }
        renderActions={(item) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal({ type: 'detail', jugador: item })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Ver detalle
            </button>
            {canEdit(item) ? (
              <button
                type="button"
                onClick={() => setModal({ type: 'edit', jugador: item })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                  item.estado_jugador === 'OBSERVADO' && role === 'DELEGADO'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {item.estado_jugador === 'OBSERVADO' && role === 'DELEGADO'
                  ? 'Corregir'
                  : 'Editar'}
              </button>
            ) : null}
          </div>
        )}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={visibleJugadores.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {modal?.type === 'create' ? (
        <Modal title="Nuevo jugador" onClose={closeModal}>
          <JugadorForm
            clubes={clubes}
            onCancel={closeModal}
            onSaved={handleSaved}
          />
        </Modal>
      ) : null}

      {modal?.type === 'edit' ? (
        <Modal
          title={
            modal.jugador.estado_jugador === 'OBSERVADO' && role === 'DELEGADO'
              ? 'Corregir jugador'
              : 'Editar jugador'
          }
          onClose={closeModal}
        >
          <JugadorForm
            clubes={clubes}
            jugador={modal.jugador}
            onCancel={closeModal}
            onSaved={handleSaved}
          />
        </Modal>
      ) : null}

      {modal?.type === 'detail' ? (
        <Modal title="Detalle del jugador" onClose={closeModal}>
          <JugadorDetailModal
            jugador={modal.jugador}
            clubName={getClubNombre(modal.jugador)}
            canEdit={canEdit(modal.jugador)}
            editLabel={
              modal.jugador.estado_jugador === 'OBSERVADO' && role === 'DELEGADO'
                ? 'Corregir'
                : 'Editar'
            }
            onClose={closeModal}
            onEdit={() => setModal({ type: 'edit', jugador: modal.jugador })}
          />
        </Modal>
      ) : null}
    </div>
  );
}

interface JugadorDetailModalProps {
  jugador: Jugador;
  clubName: string;
  canEdit: boolean;
  editLabel: string;
  onClose: () => void;
  onEdit: () => void;
}

function JugadorDetailModal({
  jugador,
  clubName,
  canEdit,
  editLabel,
  onClose,
  onEdit,
}: JugadorDetailModalProps) {
  const nombre = getJugadorNombre(jugador);
  const fields = [
    ['Cédula', jugador.cedula],
    ['Nombre completo', nombre],
    ['Club', clubName],
    ['Fecha nacimiento', jugador.fecha_nacimiento],
    ['Edad', getEdad(jugador.fecha_nacimiento)],
    ['Género', jugador.genero || '-'],
    ['Estado', getEstadoLabel(jugador.estado_jugador)],
    ['Observación validación', jugador.observacion_validacion || '-'],
    ['Motivo rechazo', jugador.motivo_rechazo || '-'],
    ['Fecha registro', jugador.fecha_registro || '-'],
    ['Fecha validación', jugador.fecha_validacion || '-'],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
        <div>
          {jugador.foto_url ? (
            <img
              src={getAssetUrl(jugador.foto_url)}
              alt={nombre}
              className="h-40 w-40 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-slate-100 text-2xl font-bold text-slate-600">
              {getIniciales(nombre) || 'J'}
            </div>
          )}
          {jugador.documento_identidad_url ? (
            <a
              href={getAssetUrl(jugador.documento_identidad_url)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ver documento
            </a>
          ) : null}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Cerrar
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {editLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
