import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../../api/campeonatosApi';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { inscripcionesApi } from '../../api/inscripcionesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { CardStat } from '../../components/ui/CardStat';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { FormInput } from '../../components/ui/FormInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type {
  Campeonato,
  Club,
  Competencia,
  InscripcionCompetencia,
  Jugador,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAssetUrl } from '../../utils/assetUrl';
import { getRoleName } from '../../utils/authRole';
import { Pagination } from '../../components/ui/Pagination';

const currentYear = new Date().getFullYear();

type CompetenciaDetallada = Competencia & {
  campeonato?: Partial<Campeonato> | null;
  nombre_categoria?: string | null;
  edad_minima?: number | string | null;
  edad_maxima?: number | string | null;
  anio?: number | string | null;
};

const initialForm = {
  id_competencia: '',
  numero_camiseta: '',
  anio_participacion: String(currentYear),
  observaciones: '',
};

const isActivo = (estado?: string | null) =>
  estado?.trim().toUpperCase() === 'ACTIVO';

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const calcularEdad = (fechaNacimiento: string) => {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();

  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return Number.isFinite(edad) ? edad : 0;
};

const getEdadMinima = (competencia: CompetenciaDetallada) =>
  competencia.edad_minima ?? null;

const getEdadMaxima = (competencia: CompetenciaDetallada) =>
  competencia.edad_maxima ?? null;

const generoCompatible = (jugador: Jugador, competencia: CompetenciaDetallada) => {
  const generoJugador = normalizeText(jugador.genero);
  const nombreCompetencia = normalizeText(competencia.nombre_competencia);
  const categoria = normalizeText(competencia.nombre_categoria ?? '');
  const texto = `${nombreCompetencia} ${categoria}`;

  if (texto.includes('FEMENINO') || texto.includes('FEM')) {
    return generoJugador.includes('FEMENINO');
  }

  if (
    texto.includes('MASCULINO') ||
    texto.includes('VARONES') ||
    texto.includes('MAS')
  ) {
    return generoJugador.includes('MASCULINO');
  }

  return true;
};

const edadCompatiblePorNombre = (
  jugador: Jugador,
  competencia: CompetenciaDetallada,
) => {
  const edad = calcularEdad(jugador.fecha_nacimiento);
  const nombre = normalizeText(
    `${competencia.nombre_competencia} ${
      competencia.nombre_categoria ?? ''
    }`,
  );

  if (nombre.includes('LIBRE')) {
    return true;
  }

  const subMatch = nombre.match(/SUB\s*(\d+)/);
  if (subMatch) {
    return edad <= Number(subMatch[1]);
  }

  const postMatch = nombre.match(/POST\s*(\d+)\s*-\s*(\d+)/);
  if (postMatch) {
    return edad >= Number(postMatch[1]) && edad <= Number(postMatch[2]);
  }

  return true;
};

const edadCompatible = (jugador: Jugador, competencia: CompetenciaDetallada) => {
  const edad = calcularEdad(jugador.fecha_nacimiento);
  const min = getEdadMinima(competencia);
  const max = getEdadMaxima(competencia);

  if (min !== null && edad < Number(min)) return false;
  if (max !== null && edad > Number(max)) return false;

  if (min === null && max === null) {
    return edadCompatiblePorNombre(jugador, competencia);
  }

  return true;
};

const getAnioParticipacion = (competencia?: CompetenciaDetallada) =>
  competencia?.campeonato?.anio ??
  competencia?.anio ??
  new Date().getFullYear();

const getIniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const getNombreJugador = (jugador: Jugador) =>
  jugador.nombre_completo ||
  `${jugador.nombres ?? ''} ${jugador.apellidos ?? ''}`.trim();

const getInscripcionError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const detailText = typeof detail === 'string' ? detail.toLowerCase() : '';

    if (
      status === 409 ||
      ((status === 400 || status === 422) && detailText.includes('inscrit'))
    ) {
      return 'El jugador ya está inscrito en esta competencia.';
    }
  }

  return getApiErrorMessage(error, 'No se pudo guardar la inscripción.');
};

export function NuevaInscripcionPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const roleName = getRoleName(user);
  const isDelegado = roleName === 'DELEGADO';
  const isSecretaria = roleName === 'SECRETARIA';
  const isAdministrador = roleName === 'ADMINISTRADOR';
  const canCreate = isAdministrador || isSecretaria || isDelegado;
  const [clubes, setClubes] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [competencias, setCompetencias] = useState<CompetenciaDetallada[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionCompetencia[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [genero, setGenero] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedJugador, setSelectedJugador] = useState<Jugador | null>(null);
  const [form, setForm] = useState(initialForm);
  const {
    clubesAsociados,
    selectedClubName,
    loadingClubes,
    errorClubes,
  } = useDelegadoClubes(user ?? null, isDelegado);

  useEffect(() => {
    if (isAuthLoading || !user || !canCreate || (isDelegado && loadingClubes)) {
      if (!canCreate && !isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    const loadCatalogs = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [competenciasData, campeonatosData, clubesData] =
          await Promise.all([
            competenciasApi.listar(),
            campeonatosApi.listar().catch(() => [] as Campeonato[]),
            isDelegado ? Promise.resolve(clubesAsociados) : clubesApi.listar(),
          ]);
        const campeonatosById = new Map(
          campeonatosData.map((campeonato) => [
            campeonato.id_campeonato,
            campeonato,
          ]),
        );

        setCompetencias(
          competenciasData.map((competencia) => ({
            ...competencia,
            campeonato: campeonatosById.get(competencia.id_campeonato) ?? null,
          })),
        );
        setClubes(
          isSecretaria
            ? clubesData.filter((club) => isActivo(club.estado))
            : clubesData,
        );

        if (isDelegado && clubesData.length === 1 && clubesData[0].id_club) {
          setSelectedClubId(String(clubesData[0].id_club));
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar los clubes o competencias disponibles.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCatalogs();
  }, [
    canCreate,
    clubesAsociados,
    isAuthLoading,
    isDelegado,
    isSecretaria,
    loadingClubes,
    user,
  ]);

  useEffect(() => {
    if (!selectedClubId) {
      setJugadores([]);
      setInscripciones([]);
      return;
    }

    let active = true;
    setIsLoadingPlayers(true);
    setError('');

    Promise.all([
      jugadoresApi.listarPorClub(Number(selectedClubId)),
      inscripcionesApi.getInscripcionesByClub(Number(selectedClubId)),
    ])
      .then(([jugadoresData, inscripcionesData]) => {
        if (!active) return;

        setJugadores(
          jugadoresData.filter((jugador) =>
            isActivo(jugador.estado_jugador),
          ),
        );
        setInscripciones(inscripcionesData);
      })
      .catch((requestError) => {
        if (!active) return;

        setJugadores([]);
        setInscripciones([]);
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar los jugadores o inscripciones del club.',
          ),
        );
      })
      .finally(() => {
        if (active) {
          setIsLoadingPlayers(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedClubId]);

  const competenciasActivas = useMemo(
    () => competencias.filter((competencia) => isActivo(competencia.estado)),
    [competencias],
  );

  const getCompetenciasDisponibles = (jugador: Jugador) => {
    const inscripcionesJugador = new Set(
      inscripciones
        .filter((inscripcion) => Number(inscripcion.id_jugador) === Number(jugador.id_jugador))
        .map((inscripcion) => Number(inscripcion.id_competencia)),
    );

    return competenciasActivas.filter(
      (competencia) =>
        isActivo(jugador.estado_jugador) &&
        generoCompatible(jugador, competencia) &&
        edadCompatible(jugador, competencia) &&
        !inscripcionesJugador.has(Number(competencia.id_competencia)),
    );
  };

  const filteredJugadores = useMemo(() => {
    const query = normalizeText(search);

    return jugadores.filter((jugador) => {
      const matchesSearch =
        !query ||
        normalizeText(getNombreJugador(jugador)).includes(query) ||
        normalizeText(jugador.cedula).includes(query);
      const matchesGenero = !genero || jugador.genero === genero;

      return matchesSearch && matchesGenero;
    });
  }, [genero, jugadores, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [genero, pageSize, search]);

  const totalPages = Math.ceil(filteredJugadores.length / pageSize);
  const paginatedPlayers = filteredJugadores.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const selectedCompetencias = useMemo(
    () => (selectedJugador ? getCompetenciasDisponibles(selectedJugador) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [competenciasActivas, inscripciones, selectedJugador],
  );
  const selectedCompetencia = selectedCompetencias.find(
    (competencia) => competencia.id_competencia === Number(form.id_competencia),
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      anio_participacion: String(getAnioParticipacion(selectedCompetencia)),
    }));
  }, [selectedCompetencia]);

  const stats = {
    activos: jugadores.length,
    inscritos: inscripciones.length,
  };
  const selectedClub = clubes.find(
    (club) => club.id_club === Number(selectedClubId),
  );
  const generoOptions = [
    ...new Set(jugadores.map((jugador) => jugador.genero).filter(Boolean)),
  ].map((value) => ({ value: value ?? '', label: value ?? '' }));

  const openInscripcionModal = (jugador: Jugador) => {
    const disponibles = getCompetenciasDisponibles(jugador);
    setSelectedJugador(jugador);
    setForm({
      ...initialForm,
      id_competencia: disponibles[0]?.id_competencia
        ? String(disponibles[0].id_competencia)
        : '',
      anio_participacion: String(getAnioParticipacion(disponibles[0])),
    });
    setError('');
  };

  const closeModal = () => {
    setSelectedJugador(null);
    setForm(initialForm);
  };

  const handleSubmit = async () => {
    if (!selectedJugador?.id_jugador || !selectedClubId) {
      setError('Club y jugador son obligatorios.');
      return;
    }

    if (!form.id_competencia) {
      setError('Selecciona una competencia.');
      return;
    }

    if (!form.numero_camiseta || Number(form.numero_camiseta) <= 0) {
      setError('El número de camiseta debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await inscripcionesApi.createInscripcion({
        id_competencia: Number(form.id_competencia),
        id_club: Number(selectedClubId),
        id_jugador: Number(selectedJugador.id_jugador),
        numero_camiseta: Number(form.numero_camiseta),
        anio_participacion: Number(form.anio_participacion),
        observaciones: form.observaciones.trim() || null,
      });

      const inscripcionesData = await inscripcionesApi.getInscripcionesByClub(
        Number(selectedClubId),
      );
      setInscripciones(inscripcionesData);
      setSuccessMessage('Jugador inscrito correctamente.');
      closeModal();
    } catch (requestError) {
      setError(getInscripcionError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !user || isLoading || loadingClubes) {
    return <LoadingSpinner />;
  }

  if (!canCreate) {
    return (
      <ErrorMessage message="No tienes permisos para crear inscripciones." />
    );
  }

  const columns = [
    {
      key: 'jugador',
      header: 'Jugador',
      render: (jugador: Jugador) => {
        const nombre = getNombreJugador(jugador);

        return (
          <div className="flex min-w-[240px] items-center gap-3">
            {jugador.foto_url ? (
              <img
                src={getAssetUrl(jugador.foto_url)}
                alt={nombre}
                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {getIniciales(nombre) || 'J'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{nombre}</p>
              <p className="text-xs text-slate-500">{jugador.cedula}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'edad',
      header: 'Edad',
      render: (jugador: Jugador) => calcularEdad(jugador.fecha_nacimiento),
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
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden">
      <PageHeader
        title="Inscripciones"
        description="Selecciona un jugador activo de tu club para inscribirlo en una competencia."
      />

      {isDelegado && selectedClub ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <span className="font-semibold text-slate-950">Club asignado:</span>{' '}
          {selectedClubName || 'Sin club asignado'}
        </div>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
      {error || errorClubes ? (
        <ErrorMessage message={error || errorClubes} />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardStat
          title="Jugadores activos"
          value={stats.activos}
          tone="green"
          icon="J"
        />
        <CardStat title="Inscritos" value={stats.inscritos} tone="blue" icon="I" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          {!isDelegado ? (
            <FilterSelect
              label="Club"
              value={selectedClubId}
              options={clubes.map((club) => ({
                value: String(club.id_club),
                label: club.nombre_club,
              }))}
              onChange={(event) => setSelectedClubId(event.target.value)}
            />
          ) : null}
          <SearchBar
            label="Buscar jugador"
            value={search}
            placeholder="Nombre, apellido o cédula"
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect
            label="Género"
            value={genero}
            options={generoOptions}
            onChange={(event) => setGenero(event.target.value)}
          />
        </div>
      </section>

      {isLoadingPlayers ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando jugadores...
        </p>
      ) : selectedClubId ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={paginatedPlayers}
            getKey={(jugador) => jugador.id_jugador ?? jugador.cedula}
            emptyMessage={
              jugadores.length === 0
                ? 'No hay jugadores activos disponibles para este club.'
                : 'No hay jugadores que coincidan con los filtros.'
            }
            renderActions={(jugador) => {
              const disponibles = getCompetenciasDisponibles(jugador);
              const disabled = disponibles.length === 0;

              return (
                <button
                  type="button"
                  disabled={disabled}
                  title={disabled ? 'Sin competencias disponibles' : 'Inscribir'}
                  onClick={() => openInscripcionModal(jugador)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {disabled ? 'Sin competencias disponibles' : 'Inscribir'}
                </button>
              );
            }}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredJugadores.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Selecciona un club para cargar jugadores activos.
        </p>
      )}

      <div className="flex justify-end">
        <Link
          to="/inscripciones"
          className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Ver inscripciones
        </Link>
      </div>

      {selectedJugador ? (
        <Modal
          title="Inscribir en disciplina"
          onClose={closeModal}
          maxWidth="2xl"
        >
          <InscripcionModalContent
            jugador={selectedJugador}
            clubName={
              selectedClub?.nombre_club ||
              (isDelegado ? selectedClubName : '') ||
              'Club seleccionado'
            }
            competenciasDisponibles={selectedCompetencias}
            form={form}
            isSubmitting={isSubmitting}
            onChange={setForm}
            onCancel={closeModal}
            onSubmit={() => void handleSubmit()}
          />
        </Modal>
      ) : null}
    </div>
  );
}

interface InscripcionModalContentProps {
  jugador: Jugador;
  clubName: string;
  competenciasDisponibles: CompetenciaDetallada[];
  form: typeof initialForm;
  isSubmitting: boolean;
  onChange: (form: typeof initialForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function InscripcionModalContent({
  jugador,
  clubName,
  competenciasDisponibles,
  form,
  isSubmitting,
  onChange,
  onCancel,
  onSubmit,
}: InscripcionModalContentProps) {
  const nombre = getNombreJugador(jugador);
  const canSubmit =
    Boolean(form.id_competencia) &&
    Boolean(form.numero_camiseta) &&
    Number(form.numero_camiseta) > 0 &&
    !isSubmitting;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {jugador.foto_url ? (
          <img
            src={getAssetUrl(jugador.foto_url)}
            alt={nombre}
            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700">
            {getIniciales(nombre) || 'J'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-950">{nombre}</p>
          <p className="text-sm text-slate-600">
            {calcularEdad(jugador.fecha_nacimiento)} años · {jugador.genero || '-'} ·{' '}
            {jugador.cedula}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Club: {clubName}
          </p>
        </div>
      </div>

      {competenciasDisponibles.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No hay competencias disponibles para este jugador según edad, género o
          inscripciones existentes.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FilterSelect
            label="Competencia o disciplina"
            value={form.id_competencia}
            options={competenciasDisponibles.map((competencia) => ({
              value: String(competencia.id_competencia),
              label: competencia.nombre_competencia,
            }))}
            onChange={(event) => {
              const competencia = competenciasDisponibles.find(
                (item) => item.id_competencia === Number(event.target.value),
              );
              onChange({
                ...form,
                id_competencia: event.target.value,
                anio_participacion: String(getAnioParticipacion(competencia)),
              });
            }}
          />
          <FormInput
            label="Número de camiseta *"
            type="number"
            min="1"
            required
            value={form.numero_camiseta}
            onChange={(event) =>
              onChange({ ...form, numero_camiseta: event.target.value })
            }
          />
          <FormInput
            label="Año de participación"
            type="number"
            readOnly
            value={form.anio_participacion}
          />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(event) =>
                onChange({ ...form, observaciones: event.target.value })
              }
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Cancelar
        </button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Inscribiendo...' : 'Inscribir'}
        </Button>
      </div>
    </div>
  );
}
