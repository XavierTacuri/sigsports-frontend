import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { competenciasApi } from '../../api/competenciasApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { sancionesApi } from '../../api/sancionesApi';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  SancionEstadoBadge,
} from '../../components/sanciones/SancionBadges';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import type {
  Competencia,
  Jugador,
  Sancion,
  SancionCreatePayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';

const emptyForm: SancionCreatePayload = {
  id_competencia: 0,
  id_jugador: 0,
  tipo_sancion: 'MANUAL',
  motivo: null,
  partidos_suspension: 1,
};

type SancionAction = 'AMPLIAR' | 'SUSPENDER' | 'ANULAR';

const emptyActionForm = {
  partidos_extra: 1,
  observacion: '',
};

const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const canManageSancion = (sancion: any) => {
  const estado = String(
    sancion.estado_sancion ??
    sancion.estado ??
    ''
  ).toUpperCase();

  return estado === 'ACTIVA';
};

const getPartidoOrigenLabel = (sancion: any) => {
  const partido = sancion.partido_origen ?? sancion.partido ?? null;

  if (partido?.nombre_partido) {
    return partido.nombre_partido;
  }

  const localValue =
    partido?.club_local?.nombre_club ??
    partido?.nombre_club_local ??
    partido?.club_local ??
    '';
  const local = typeof localValue === 'string' ? localValue : '';

  const visitanteValue =
    partido?.club_visitante?.nombre_club ??
    partido?.nombre_club_visitante ??
    partido?.club_visitante ??
    '';
  const visitante =
    typeof visitanteValue === 'string' ? visitanteValue : '';

  if (local && visitante) {
    return `${local} vs ${visitante}`;
  }

  return sancion.id_partido_origen ? 'No disponible' : '-';
};

const getPartidoOrigenFecha = (sancion: any) => {
  const partido = sancion.partido_origen ?? sancion.partido ?? null;

  return (
    partido?.fecha_partido ??
    sancion.fecha_partido_origen ??
    '-'
  );
};

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
    (typeof jugador?.nombre_completo === 'string' && jugador.nombre_completo) ||
    (typeof flexibleItem.nombre_completo === 'string' &&
      flexibleItem.nombre_completo) ||
    nombreDesdeJugador ||
    nombrePlano ||
    (typeof flexibleItem.nombre_jugador === 'string' &&
      flexibleItem.nombre_jugador) ||
    '-'
  );
};

const getJugadorCedula = (item: Sancion) => {
  const flexibleItem = item as Sancion & Record<string, unknown>;
  const jugador = flexibleItem.jugador as Record<string, unknown> | undefined;

  return (
    (typeof jugador?.cedula === 'string' && jugador.cedula) ||
    (typeof flexibleItem.cedula_jugador === 'string' &&
      flexibleItem.cedula_jugador) ||
    (typeof flexibleItem.cedula === 'string' && flexibleItem.cedula) ||
    '-'
  );
};

const getClubNombre = (item: Sancion) => {
  const flexibleItem = item as Sancion & Record<string, unknown>;
  const jugador = flexibleItem.jugador as Record<string, unknown> | undefined;
  const club = (flexibleItem.club ?? jugador?.club) as
    | Record<string, unknown>
    | undefined;

  return (
    (typeof club?.nombre_club === 'string' && club.nombre_club) ||
    (typeof flexibleItem.nombre_club === 'string' && flexibleItem.nombre_club) ||
    (typeof flexibleItem.club_nombre === 'string' && flexibleItem.club_nombre) ||
    '-'
  );
};

const getObservaciones = (item: Sancion) => {
  const flexibleItem = item as Sancion & Record<string, unknown>;

  return (
    (typeof flexibleItem.observacion === 'string' && flexibleItem.observacion) ||
    (typeof flexibleItem.observaciones === 'string' &&
      flexibleItem.observaciones) ||
    '-'
  );
};

const getCompetenciaNombre = (item: Sancion) => {
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
    '-'
  );
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  return value.split('T')[0].split(' ')[0];
};

const getTipoSancionLabel = (tipo: string) => {
  const normalized = normalizeText(tipo);

  if (normalized === 'TARJETA_ROJA') return 'Roja';
  if (
    normalized === 'ACUMULACION_AMARILLAS' ||
    normalized === 'DOBLE_AMARILLA_ACUMULADA'
  ) {
    return 'Amarillas';
  }
  if (normalized === 'MANUAL') return 'Manual';

  return tipo.replace(/_/g, ' ');
};

const getTipoSancionClass = (tipo: string) => {
  const normalized = normalizeText(tipo);

  if (normalized === 'TARJETA_ROJA') return 'bg-red-100 text-red-700';
  if (
    normalized === 'ACUMULACION_AMARILLAS' ||
    normalized === 'DOBLE_AMARILLA_ACUMULADA'
  ) {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'MANUAL') return 'bg-blue-100 text-blue-700';

  return 'bg-slate-100 text-slate-700';
};

export function SancionesPage() {
  const { user } = useAuth();
  const roleName = getRoleName(user);
  const canViewStats = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'PLANILLERO',
    'DELEGADO',
  ].includes(roleName);
  const canManage = roleName === 'ADMINISTRADOR';
  const [items, setItems] = useState<Sancion[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [estado, setEstado] = useState('');
  const [competenciaId, setCompetenciaId] = useState('');
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Sancion | null>(null);
  const [actionTarget, setActionTarget] = useState<Sancion | null>(null);
  const [actionType, setActionType] = useState<SancionAction | null>(null);
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [fulfillTarget, setFulfillTarget] = useState<Sancion | null>(null);
  const [selectedSancion, setSelectedSancion] = useState<Sancion | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [form, setForm] = useState<SancionCreatePayload>(emptyForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    if (!user || !canViewStats) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const [sanctionsData, competitionData, playerData] = await Promise.all([
        sancionesApi.listar(),
        competenciasApi.listar().catch(() => []),
        jugadoresApi.listar().catch(() => []),
      ]);
      setItems(sanctionsData);
      setCompetencias(competitionData);
      setJugadores(playerData);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar los datos.'
          : getApiErrorMessage(requestError, 'No se pudieron cargar los datos.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canViewStats, user]);

  useEffect(() => void load(), [load]);

  const playerNames = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item.nombre_completo])),
    [jugadores],
  );
  const playersById = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item])),
    [jugadores],
  );
  const competitionNames = useMemo(
    () =>
      new Map(
        competencias.map((item) => [
          item.id_competencia,
          item.nombre_competencia,
        ]),
      ),
    [competencias],
  );

  const renderJugador = useCallback((item: Sancion) => {
    const nombre = getJugadorNombre(item);
    return nombre !== '-' ? nombre : playerNames.get(item.id_jugador) ?? '-';
  }, [playerNames]);
  const renderJugadorCedula = useCallback((item: Sancion) => {
    const cedula = getJugadorCedula(item);
    return cedula !== '-' ? cedula : playersById.get(item.id_jugador)?.cedula ?? '-';
  }, [playersById]);
  const renderCompetencia = useCallback((item: Sancion) => {
    const nombre = getCompetenciaNombre(item);
    return nombre !== '-'
      ? nombre
      : competitionNames.get(item.id_competencia) ?? '-';
  }, [competitionNames]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);

    return items.filter((item) => {
      const matchesEstado = !estado || item.estado_sancion === estado;
      const matchesCompetencia =
        !competenciaId || item.id_competencia === Number(competenciaId);
      const matchesTipo = !tipo || item.tipo_sancion === tipo;
      const matchesSearch =
        !query ||
        normalizeText(renderJugador(item)).includes(query) ||
        normalizeText(renderCompetencia(item)).includes(query) ||
        normalizeText(item.motivo).includes(query);

      return (
        matchesEstado && matchesCompetencia && matchesTipo && matchesSearch
      );
    });
  }, [competenciaId, estado, items, renderCompetencia, renderJugador, search, tipo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [competenciaId, estado, pageSize, search, tipo]);

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered, pageSize],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setModalError('');
      setIsSubmitting(true);
      await sancionesApi.crear(form);
      setIsCreateOpen(false);
      await load();
    } catch (requestError) {
      setModalError(
        getApiErrorMessage(requestError, 'No se pudo crear la sanción manual.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAction = (type: SancionAction, item: Sancion) => {
    if (!canManageSancion(item)) {
      setError('Esta sanción ya no permite acciones.');
      return;
    }

    setActionType(type);
    setActionTarget(item);
    setActionForm(emptyActionForm);
    setModalError('');
  };

  const closeAction = () => {
    if (isSubmitting) return;
    setActionType(null);
    setActionTarget(null);
    setActionForm(emptyActionForm);
  };

  const closeActionsModal = () => {
    setShowActionsModal(false);
    setSelectedSancion(null);
  };

  const selectSancionAction = (callback: (item: Sancion) => void) => {
    if (!selectedSancion) return;
    const sancion = selectedSancion;
    closeActionsModal();
    callback(sancion);
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actionTarget?.id_sancion || !actionType || isSubmitting) return;
    if (!canManageSancion(actionTarget)) {
      setModalError('Esta sanción ya no permite acciones.');
      return;
    }

    try {
      setModalError('');
      setIsSubmitting(true);
      const observacion = actionForm.observacion.trim() || null;

      if (actionType === 'AMPLIAR') {
        await sancionesApi.ampliar(actionTarget.id_sancion, {
          partidos_extra: Number(actionForm.partidos_extra),
          observacion,
        });
      }
      if (actionType === 'SUSPENDER') {
        await sancionesApi.suspender(actionTarget.id_sancion, { observacion });
      }
      if (actionType === 'ANULAR') {
        await sancionesApi.anular(actionTarget.id_sancion, { observacion });
      }

      setActionType(null);
      setActionTarget(null);
      setActionForm(emptyActionForm);
      await load();
    } catch (requestError) {
      setModalError(
        getApiErrorMessage(requestError, 'No se pudo actualizar la sanción.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFulfill = (item: Sancion) => {
    if (!canManageSancion(item)) {
      setError('Esta sanción ya no permite acciones.');
      return;
    }

    setFulfillTarget(item);
  };

  const fulfill = async () => {
    if (!fulfillTarget?.id_sancion || isSubmitting) return;
    if (!canManageSancion(fulfillTarget)) {
      setError('Esta sanción ya no permite acciones.');
      setFulfillTarget(null);
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await sancionesApi.cumplir(fulfillTarget.id_sancion);
      setFulfillTarget(null);
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo marcar la sanción como cumplida.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <p className="text-sm text-slate-600">Cargando usuario...</p>;
  if (isLoading) return <LoadingSpinner />;
  if (!canViewStats) return <ErrorMessage message="No tienes permisos." />;

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Sanciones"
        description="Consulta suspensiones activas, cumplidas y anuladas."
        actionLabel={canManage ? 'Nueva sanción manual' : undefined}
        onAction={
          canManage
            ? () => {
                setForm(emptyForm);
                setModalError('');
                setIsCreateOpen(true);
              }
            : undefined
        }
      />

      {error ? <ErrorMessage message={error} /> : null}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <SearchBar
          label="Buscar jugador"
          value={search}
          placeholder="Nombre, competencia o motivo"
          onChange={(event) => setSearch(event.target.value)}
        />
        <FilterSelect
          label="Estado"
          value={estado}
          options={[
            { value: 'ACTIVA', label: 'ACTIVA' },
            { value: 'SUSPENDIDA', label: 'SUSPENDIDA' },
            { value: 'CUMPLIDA', label: 'CUMPLIDA' },
            { value: 'ANULADA', label: 'ANULADA' },
          ]}
          onChange={(event) => setEstado(event.target.value)}
        />
        <FilterSelect
          label="Competencia"
          value={competenciaId}
          options={competencias.map((item) => ({
            value: String(item.id_competencia),
            label: item.nombre_competencia,
          }))}
          onChange={(event) => setCompetenciaId(event.target.value)}
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
      </section>

      <DataTable
        data={paginated}
        getKey={(item) =>
          item.id_sancion ?? `${item.id_jugador}-${item.fecha_creacion}`
        }
        emptyMessage="No hay sanciones que coincidan con los filtros."
        columns={[
          {
            key: 'jugador',
            header: 'Jugador',
            render: (item) => (
              <div className="w-[260px] max-w-[260px]">
                <p className="truncate font-semibold text-slate-900">
                  {renderJugador(item)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {renderJugadorCedula(item)}
                </p>
              </div>
            ),
          },
          {
            key: 'competencia',
            header: 'Competencia',
            render: (item) => (
              <div className="w-[260px] max-w-[260px] truncate">
                {renderCompetencia(item)}
              </div>
            ),
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (item) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTipoSancionClass(
                  item.tipo_sancion,
                )}`}
              >
                {getTipoSancionLabel(item.tipo_sancion)}
              </span>
            ),
          },
          {
            key: 'suspension',
            header: 'Suspensión',
            render: (item) => (
              <div className="w-[120px]">
                <div className="font-semibold text-slate-900">
                  {item.partidos_suspension}{' '}
                  {item.partidos_suspension === 1 ? 'partido' : 'partidos'}
                </div>
                <div className="text-xs text-slate-500">
                  {item.partidos_cumplidos} cumplidos
                </div>
              </div>
            ),
          },
          {
            key: 'estado',
            header: 'Estado',
            render: (item) => (
              <div className="w-[120px]">
                <SancionEstadoBadge estado={item.estado_sancion} />
              </div>
            ),
          },
          {
            key: 'fecha',
            header: 'Fecha',
            render: (item) => (
              <div className="w-[120px]">
                {formatDateOnly(item.fecha_creacion)}
              </div>
            ),
          },
        ]}
        renderActions={(item) => (
          <div className="flex w-[120px] justify-end">
            {canManageSancion(item) ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedSancion(item);
                  setShowActionsModal(true);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Acciones
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDetail(item)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ver detalle
              </button>
            )}
          </div>
        )}
      />

      <Pagination
        totalItems={filtered.length}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {isCreateOpen ? (
        <Modal
          title="Nueva sanción manual"
          maxWidth="2xl"
          onClose={() => !isSubmitting && setIsCreateOpen(false)}
        >
          <form className="space-y-5" onSubmit={create}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                label="Competencia"
                value={form.id_competencia || ''}
                required
                options={competencias.map((item) => ({
                  value: String(item.id_competencia),
                  label: item.nombre_competencia,
                }))}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_competencia: Number(event.target.value),
                  })
                }
              />
              <FormSelect
                label="Jugador"
                value={form.id_jugador || ''}
                required
                options={jugadores.map((item) => ({
                  value: String(item.id_jugador),
                  label: `${item.nombre_completo} - ${item.cedula}`,
                }))}
                onChange={(event) =>
                  setForm({ ...form, id_jugador: Number(event.target.value) })
                }
              />
              <FormInput
                label="ID inscripción (opcional)"
                type="number"
                min="1"
                value={form.id_inscripcion_competencia ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_inscripcion_competencia: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
              <FormInput
                label="ID partido origen (opcional)"
                type="number"
                min="1"
                value={form.id_partido_origen ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_partido_origen: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
              <FormInput
                label="Partidos de suspensión"
                type="number"
                min="1"
                value={form.partidos_suspension}
                required
                onChange={(event) =>
                  setForm({
                    ...form,
                    partidos_suspension: Number(event.target.value),
                  })
                }
              />
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Motivo
                <textarea
                  required
                  value={form.motivo ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, motivo: event.target.value })
                  }
                  className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            {modalError ? <ErrorMessage message={modalError} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                disabled={isSubmitting}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showActionsModal && selectedSancion ? (
        <Modal title="Acciones de sanción" maxWidth="xl" onClose={closeActionsModal}>
          <div className="space-y-2">
            <button
              type="button"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => selectSancionAction((item) => setDetail(item))}
            >
              Ver detalle
            </button>
            {!canManageSancion(selectedSancion) ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Esta sanción ya no permite acciones.
              </p>
            ) : null}
            {canManage && canManageSancion(selectedSancion) ? (
              <>
                <button
                  type="button"
                  className="w-full rounded-lg border border-blue-200 px-4 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  onClick={() =>
                    selectSancionAction((item) => openAction('AMPLIAR', item))
                  }
                >
                  Ampliar
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-amber-200 px-4 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                  onClick={() =>
                    selectSancionAction((item) => openAction('SUSPENDER', item))
                  }
                >
                  Suspender
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-red-200 px-4 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() =>
                    selectSancionAction((item) => openAction('ANULAR', item))
                  }
                >
                  Anular
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  onClick={() =>
                    selectSancionAction((item) => openFulfill(item))
                  }
                >
                  Cumplir
                </button>
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {detail ? (
        <Modal title="Detalle de sanción" maxWidth="2xl" onClose={() => setDetail(null)}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Jugador', renderJugador(detail)],
              ['Cédula', renderJugadorCedula(detail)],
              ['Club', getClubNombre(detail)],
              ['Competencia', renderCompetencia(detail)],
              ['Tipo sanción', detail.tipo_sancion],
              ['Motivo', detail.motivo || '-'],
              ['Estado', detail.estado_sancion],
              ['Partidos suspensión', detail.partidos_suspension],
              ['Partidos cumplidos', detail.partidos_cumplidos],
              ['Fecha creación', formatDateOnly(detail.fecha_creacion)],
              [
                'Partido origen',
                <div>
                  <p>{getPartidoOrigenLabel(detail)}</p>
                  {getPartidoOrigenLabel(detail) === 'No disponible' &&
                  detail.id_partido_origen ? (
                    <p className="mt-1 text-xs text-slate-500">
                      ID partido: {detail.id_partido_origen}
                    </p>
                  ) : null}
                </div>,
              ],
              ['Fecha del partido', formatDateOnly(String(getPartidoOrigenFecha(detail)))],
              ['Observaciones', getObservaciones(detail)],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className={
                  label === 'Motivo' || label === 'Observaciones'
                    ? 'sm:col-span-2'
                    : ''
                }
              >
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      ) : null}

      {actionTarget && actionType ? (
        <Modal
          title={
            actionType === 'AMPLIAR'
              ? 'Ampliar sanción'
              : actionType === 'SUSPENDER'
                ? 'Suspender sanción'
                : 'Anular sanción'
          }
          maxWidth="2xl"
          onClose={closeAction}
        >
          <form className="space-y-5" onSubmit={submitAction}>
            {actionType === 'AMPLIAR' ? (
              <FormInput
                label="Partidos extra"
                type="number"
                min="1"
                required
                value={actionForm.partidos_extra}
                onChange={(event) =>
                  setActionForm({
                    ...actionForm,
                    partidos_extra: Number(event.target.value),
                  })
                }
              />
            ) : null}
            <label className="block text-sm font-medium text-slate-700">
              Observación
              <textarea
                required
                value={actionForm.observacion}
                onChange={(event) =>
                  setActionForm({
                    ...actionForm,
                    observacion: event.target.value,
                  })
                }
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {modalError ? <ErrorMessage message={modalError} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                disabled={isSubmitting}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={closeAction}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {fulfillTarget ? (
        <ConfirmDialog
          title="Marcar sanción como cumplida"
          message="¿Seguro que deseas marcar esta sanción como cumplida?"
          confirmLabel="Marcar como cumplida"
          cancelLabel="Cancelar"
          isSubmitting={isSubmitting}
          onCancel={() => !isSubmitting && setFulfillTarget(null)}
          onConfirm={() => void fulfill()}
        />
      ) : null}
    </div>
  );
}
