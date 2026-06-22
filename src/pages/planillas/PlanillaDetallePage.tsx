import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { deportesApi } from '../../api/deportesApi';
import { escenariosApi } from '../../api/escenariosApi';
import { eventosPartidoApi } from '../../api/eventosPartidoApi';
import { fasesApi } from '../../api/fasesApi';
import { gruposApi } from '../../api/gruposApi';
import { inscripcionesApi } from '../../api/inscripcionesApi';
import { jornadasApi } from '../../api/jornadasApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { partidoJugadoresApi } from '../../api/partidoJugadoresApi';
import { partidosApi } from '../../api/partidosApi';
import { planillasApi } from '../../api/planillasApi';
import { sancionesApi, type SancionActiva } from '../../api/sancionesApi';
import { tiposEventosApi } from '../../api/tiposEventosApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { PartidoStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { AgregarJugadorPartidoModal } from '../../components/planillas/AgregarJugadorPartidoModal';
import { PlanillaStatusBadge } from '../../components/planillas/PlanillaStatusBadge';
import { RegistrarEventoModal } from '../../components/planillas/RegistrarEventoModal';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type {
  Club,
  Competencia,
  Deporte,
  Escenario,
  EventoPartido,
  EventoPartidoPayload,
  FaseCompetencia,
  Grupo,
  InscripcionCompetencia,
  Jornada,
  Jugador,
  Partido,
  PartidoJugador,
  PartidoJugadorPayload,
  PlanillaPartido,
  TipoEvento,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { formatTimeHHMM } from '../../utils/dateFormat';
import {
  getDeporteNombreFromPartido,
  isFutbolOIndor,
  isSoloMarcador,
} from '../../utils/planillaDeporte';

type PlanillaDetalleLocationState = {
  readOnly?: boolean;
  partido?: Partido | null;
};

type PlanillaWithPartido = PlanillaPartido & {
  partido?: Partido | null;
  partido_detalle?: Partido | null;
  partido_data?: Partido | null;
  partido_info?: Partido | null;
};

type PartidoClubRelation = {
  nombre_equipo?: string | null;
  nombre_club?: string | null;
  nombre?: string | null;
};

const getPartidoFromPlanilla = (planilla?: PlanillaWithPartido | null) =>
  planilla?.partido ??
  planilla?.partido_detalle ??
  planilla?.partido_data ??
  planilla?.partido_info ??
  null;

const getNombreClubPartido = (
  partido: Partido,
  side: 'local' | 'visitante',
  clubNames: Map<number | undefined, string>,
) => {
  const partidoFlexible = partido as Partido & {
    equipo_local?: PartidoClubRelation | null;
    equipo_visitante?: PartidoClubRelation | null;
    club_local?: PartidoClubRelation | null;
    club_visitante?: PartidoClubRelation | null;
  };
  const idClub =
    side === 'local' ? partido.id_club_local : partido.id_club_visitante;
  const relation =
    side === 'local'
      ? partidoFlexible.equipo_local ?? partidoFlexible.club_local
      : partidoFlexible.equipo_visitante ?? partidoFlexible.club_visitante;

  return (
    relation?.nombre_equipo ??
    relation?.nombre_club ??
    relation?.nombre ??
    clubNames.get(idClub) ??
    (side === 'local' ? 'Club local' : 'Club visitante')
  );
};

export function PlanillaDetallePage() {
  const { id, idPartido } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const roleName = getRoleName(user);
  const locationState = location.state as PlanillaDetalleLocationState | null;
  const isReadOnly =
    locationState?.readOnly === true ||
    roleName === 'DELEGADO';
  const canRead = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'DELEGADO',
    'PLANILLERO',
  ].includes(roleName);
  const canManageRole = ['ADMINISTRADOR', 'PLANILLERO'].includes(roleName);
  const [planilla, setPlanilla] = useState<PlanillaPartido | null>(null);
  const [partido, setPartido] = useState<Partido | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [competencia, setCompetencia] = useState<Competencia | null>(null);
  const [fase, setFase] = useState<FaseCompetencia | null>(null);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [inscripciones, setInscripciones] = useState<InscripcionCompetencia[]>(
    [],
  );
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [partidoJugadores, setPartidoJugadores] = useState<PartidoJugador[]>([]);
  const [tiposEventos, setTiposEventos] = useState<TipoEvento[]>([]);
  const [eventos, setEventos] = useState<EventoPartido[]>([]);
  const [sanciones, setSanciones] = useState<SancionActiva[]>([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [marcadorForm, setMarcadorForm] = useState({
    marcador_local: '',
    marcador_visitante: '',
    observaciones: '',
  });

  const load = useCallback(async () => {
    if (!user || !canRead) {
      setIsLoading(false);
      return;
    }
    try {
      setError('');
      setPermissionError('');
      setIsLoading(true);
      const planillaData = id
        ? await planillasApi.obtener(Number(id))
        : await planillasApi.obtenerPorPartido(Number(idPartido));

      const planillaWithPartido = planillaData as PlanillaWithPartido;
      const partidoFromState = locationState?.partido ?? null;
      const partidoFromPlanilla = getPartidoFromPlanilla(planillaWithPartido);
      const partidoData =
        partidoFromState ??
        partidoFromPlanilla ??
        (planillaData.id_partido
          ? await partidosApi.obtener(planillaData.id_partido)
          : null);

      if (!partidoData) {
        setPlanilla(planillaData);
        setPartido(null);
        setClubes([]);
        setDeportes([]);
        setCompetencia(null);
        setFase(null);
        setGrupo(null);
        setJornada(null);
        setEscenario(null);
        setInscripciones([]);
        setJugadores([]);
        setPartidoJugadores([]);
        setTiposEventos([]);
        setEventos([]);
        setSanciones([]);
        return;
      }

      if (roleName === 'DELEGADO') {
        const links = await usuariosClubesApi.listarPorUsuario(user.id_usuario);
        const clubIds = new Set(links.map((item) => item.id_club));
        if (
          !clubIds.has(partidoData.id_club_local) &&
          !clubIds.has(partidoData.id_club_visitante)
        ) {
          setPermissionError(
            'No tienes permisos para consultar esta planilla.',
          );
          return;
        }
      }

      const [
        clubesData,
        deportesData,
        competenciasData,
        fasesData,
        gruposData,
        jornadasData,
        escenariosData,
        inscripcionesData,
        localPlayers,
        visitorPlayers,
        registeredData,
        eventTypesData,
        eventsData,
        sanctionsData,
      ] = await Promise.all([
        clubesApi.listar(),
        deportesApi.listar().catch(() => []),
        competenciasApi.listar(),
        fasesApi.listarPorCompetencia(partidoData.id_competencia),
        gruposApi.listarPorCompetencia(partidoData.id_competencia),
        jornadasApi.listarPorCompetencia(partidoData.id_competencia),
        escenariosApi.listar(),
        inscripcionesApi.getInscripcionesByCompetencia(
          partidoData.id_competencia,
        ),
        jugadoresApi.listarPorClub(partidoData.id_club_local),
        jugadoresApi.listarPorClub(partidoData.id_club_visitante),
        partidoJugadoresApi.listarPorPartido(partidoData.id_partido ?? 0),
        tiposEventosApi.listar(),
        eventosPartidoApi.listarPorPlanilla(planillaData.id_planilla ?? 0),
        canManageRole && !isReadOnly && planillaData.estado_planilla === 'BORRADOR'
          ? sancionesApi.listarActivas()
          : Promise.resolve([]),
      ]);

      setPlanilla(planillaData);
      setPartido(partidoData);
      setClubes(clubesData);
      setDeportes(deportesData);
      setCompetencia(
        competenciasData.find(
          (item) => item.id_competencia === partidoData.id_competencia,
        ) ?? null,
      );
      setFase(
        fasesData.find((item) => item.id_fase === partidoData.id_fase) ?? null,
      );
      setGrupo(
        gruposData.find((item) => item.id_grupo === partidoData.id_grupo) ??
          null,
      );
      setJornada(
        jornadasData.find(
          (item) => item.id_jornada === partidoData.id_jornada,
        ) ?? null,
      );
      setEscenario(
        escenariosData.find(
          (item) => item.id_escenario === partidoData.id_escenario,
        ) ?? null,
      );
      setInscripciones(inscripcionesData);
      setJugadores(
        [...localPlayers, ...visitorPlayers].filter(
          (item, index, all) =>
            all.findIndex(
              (candidate) => candidate.id_jugador === item.id_jugador,
            ) === index,
        ),
      );
      setPartidoJugadores(registeredData);
      setTiposEventos(eventTypesData);
      setEventos(eventsData);
      setSanciones(sanctionsData);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo cargar el detalle de la planilla.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    canManageRole,
    canRead,
    id,
    idPartido,
    isReadOnly,
    locationState?.partido,
    roleName,
    user,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!partido && !planilla) {
      return;
    }

    const local =
      partido?.goles_local ??
      planilla?.marcador_local ??
      planilla?.goles_local ??
      null;
    const visitante =
      partido?.goles_visitante ??
      planilla?.marcador_visitante ??
      planilla?.goles_visitante ??
      null;

    setMarcadorForm({
      marcador_local: local === null || local === undefined ? '' : String(local),
      marcador_visitante:
        visitante === null || visitante === undefined ? '' : String(visitante),
      observaciones: planilla?.observaciones ?? partido?.observaciones ?? '',
    });
  }, [partido, planilla]);

  const clubNames = useMemo(
    () => new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
    [clubes],
  );
  const inscriptionsById = useMemo(
    () =>
      new Map(
        inscripciones.map((item) => [
          item.id_inscripcion_competencia,
          item,
        ]),
      ),
    [inscripciones],
  );
  const playersById = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item])),
    [jugadores],
  );
  const eventTypesById = useMemo(
    () =>
      new Map(
        tiposEventos.map((item) => [item.id_tipo_evento, item.nombre_evento]),
      ),
    [tiposEventos],
  );
  const partidoConDeporte = useMemo(() => {
    if (!partido) {
      return null;
    }

    const flexibleCompetition = competencia as
      | (Competencia & Record<string, unknown>)
      | null;
    const deporte = flexibleCompetition?.deporte as
      | Record<string, unknown>
      | undefined;
    const nombreDeporte =
      (typeof deporte?.nombre_deporte === 'string' && deporte.nombre_deporte) ||
      (typeof flexibleCompetition?.nombre_deporte === 'string' &&
        flexibleCompetition.nombre_deporte) ||
      (typeof flexibleCompetition?.deporte_nombre === 'string' &&
        flexibleCompetition.deporte_nombre) ||
      deportes.find((item) => item.id_deporte === competencia?.id_deporte)
        ?.nombre_deporte ||
      competencia?.nombre_competencia ||
      '';

    return {
      ...partido,
      nombre_deporte: nombreDeporte,
      deporte_nombre: nombreDeporte,
      nombre_competencia:
        partido.competencia?.nombre_competencia ??
        competencia?.nombre_competencia,
      competencia: {
        ...partido.competencia,
        ...competencia,
        nombre_deporte: nombreDeporte,
        deporte: { nombre_deporte: nombreDeporte },
      },
    };
  }, [competencia, deportes, partido]);
  const deporteNombre = useMemo(
    () => getDeporteNombreFromPartido(partidoConDeporte),
    [partidoConDeporte],
  );
  const permiteEventos = useMemo(
    () => Boolean(partidoConDeporte && isFutbolOIndor(partidoConDeporte)),
    [partidoConDeporte],
  );
  const soloMarcador = useMemo(
    () => Boolean(partidoConDeporte && isSoloMarcador(partidoConDeporte)),
    [partidoConDeporte],
  );
  const marcadorGuardado = useMemo(() => {
    const local =
      partido?.goles_local ??
      planilla?.marcador_local ??
      planilla?.goles_local ??
      null;
    const visitante =
      partido?.goles_visitante ??
      planilla?.marcador_visitante ??
      planilla?.goles_visitante ??
      null;

    return local !== null && local !== undefined && visitante !== null && visitante !== undefined;
  }, [partido, planilla]);

  const addPlayers = async (payloads: PartidoJugadorPayload[]) => {
    try {
      setModalError('');
      setSuccess('');
      setIsSubmitting(true);
      const idPartido = partido?.id_partido ?? payloads[0]?.id_partido ?? 0;
      try {
        await partidoJugadoresApi.crearBulk(idPartido, payloads);
      } catch {
        await Promise.all(payloads.map((payload) => partidoJugadoresApi.crear(payload)));
      }
      setShowPlayerModal(false);
      setSuccess('Jugadores agregados correctamente.');
      await load();
    } catch (requestError) {
      setModalError(
        getApiErrorMessage(
          requestError,
          'No se pudo agregar el jugador al partido.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEvent = async (payload: EventoPartidoPayload) => {
    if (!permiteEventos) {
      return;
    }

    try {
      setModalError('');
      setSuccess('');
      setIsSubmitting(true);
      await eventosPartidoApi.crear(payload);
      setShowEventModal(false);
      await load();
    } catch (requestError) {
      setModalError(
        getApiErrorMessage(requestError, 'No se pudo registrar el evento.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveMarcador = async () => {
    if (!planilla?.id_planilla || isSubmitting) {
      return;
    }

    const marcadorLocal = Number(marcadorForm.marcador_local);
    const marcadorVisitante = Number(marcadorForm.marcador_visitante);

    if (
      marcadorForm.marcador_local === '' ||
      marcadorForm.marcador_visitante === '' ||
      Number.isNaN(marcadorLocal) ||
      Number.isNaN(marcadorVisitante) ||
      marcadorLocal < 0 ||
      marcadorVisitante < 0
    ) {
      setError('El marcador local y visitante son obligatorios y deben ser valores mayores o iguales a 0.');
      return;
    }

    const payload = {
      marcador_local: marcadorLocal,
      marcador_visitante: marcadorVisitante,
      observaciones: marcadorForm.observaciones.trim() || null,
    };

    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);
      try {
        await planillasApi.guardarMarcador(planilla.id_planilla, payload);
      } catch {
        try {
          await planillasApi.actualizar(planilla.id_planilla, {
            ...payload,
            goles_local: marcadorLocal,
            goles_visitante: marcadorVisitante,
          });
        } catch {
          if (!partido?.id_partido) {
            throw new Error('No se encontró el partido para guardar marcador.');
          }
          await partidosApi.actualizar(partido.id_partido, {
            goles_local: marcadorLocal,
            goles_visitante: marcadorVisitante,
            observaciones: payload.observaciones,
          });
        }
      }
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar el marcador final.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finish = async () => {
    if (!planilla?.id_planilla || isSubmitting) {
      return;
    }
    if (soloMarcador && !marcadorGuardado) {
      setShowFinishConfirm(false);
      setError('Debes guardar el marcador final antes de finalizar la planilla.');
      return;
    }
    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);
      await planillasApi.finalizar(planilla.id_planilla);
      setShowFinishConfirm(false);
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
  if (permissionError) {
    return <ErrorMessage message={permissionError} />;
  }
  if (error) {
    return <ErrorMessage message={error || 'No se pudo cargar la planilla.'} />;
  }
  if (!planilla) {
    return <ErrorMessage message="No se encontró la planilla." />;
  }
  if (!partido) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Detalle de planilla"
          description="No se encontró la información del partido asociado a esta planilla."
        />
        <ErrorMessage message="No se encontró la información del partido asociado a esta planilla." />
      </div>
    );
  }

  const isDraft = planilla.estado_planilla.trim().toUpperCase() === 'BORRADOR';
  const canEdit = canManageRole && !isReadOnly && isDraft;
  const localName = getNombreClubPartido(partido, 'local', clubNames);
  const visitorName = getNombreClubPartido(partido, 'visitante', clubNames);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={isReadOnly ? '/partidos' : '/planillas'}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            {isReadOnly ? 'Volver a mis partidos' : 'Volver a planillas'}
          </Link>
          <div className="mt-2">
            <PageHeader
              title={`Planilla: ${localName} vs ${visitorName}`}
              description="Consulta jugadores, eventos y marcador del partido."
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <PlanillaStatusBadge estado={planilla.estado_planilla} />
            <PartidoStatusBadge estado={partido.estado_partido} />
          </div>
        </div>
        {canEdit ? (
          <Button
            disabled={isSubmitting}
            onClick={() => setShowFinishConfirm(true)}
          >
            {isSubmitting ? 'Finalizando...' : 'Finalizar planilla'}
          </Button>
        ) : null}
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {success ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">Datos del partido</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Competencia', competencia?.nombre_competencia ?? '-'],
            ['Fase', fase?.nombre_fase ?? '-'],
            ['Grupo', grupo?.nombre_grupo ?? '-'],
            ['Jornada', jornada?.nombre_jornada ?? '-'],
            ['Escenario', escenario?.nombre_escenario ?? '-'],
            ['Fecha', partido.fecha_partido],
            ['Hora', formatTimeHHMM(partido.hora_partido)],
            [
              'Resultado actual',
              `${localName} ${partido.goles_local ?? 0} - ${partido.goles_visitante ?? 0} ${visitorName}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Jugadores del partido
            </h2>
            <p className="text-sm text-slate-600">
              Jugadores habilitados y registrados en la planilla.
            </p>
          </div>
          {canEdit ? (
            <Button
              disabled={isSubmitting}
              onClick={() => {
                setModalError('');
                setShowPlayerModal(true);
              }}
            >
              Agregar jugadores
            </Button>
          ) : null}
        </div>
        <DataTable
          data={partidoJugadores}
          getKey={(item) =>
            item.id_partido_jugador ?? item.id_inscripcion_competencia
          }
          emptyMessage="No hay jugadores registrados en la planilla."
          columns={[
            {
              key: 'club',
              header: 'Club',
              render: (item) =>
                clubNames.get(item.id_club) ?? `Club ${item.id_club}`,
            },
            {
              key: 'jugador',
              header: 'Jugador',
              render: (item) => {
                const inscription = inscriptionsById.get(
                  item.id_inscripcion_competencia,
                );
                return inscription
                  ? playersById.get(inscription.id_jugador)?.nombre_completo ??
                      `Jugador ${inscription.id_jugador}`
                  : `Inscripción ${item.id_inscripcion_competencia}`;
              },
            },
            {
              key: 'cedula',
              header: 'Cédula',
              render: (item) => {
                const inscription = inscriptionsById.get(
                  item.id_inscripcion_competencia,
                );
                return inscription
                  ? playersById.get(inscription.id_jugador)?.cedula ?? '-'
                  : '-';
              },
            },
            {
              key: 'camiseta',
              header: 'Número camiseta',
              render: (item) =>
                inscriptionsById.get(item.id_inscripcion_competencia)
                  ?.numero_camiseta ?? '-',
            },
            {
              key: 'titular',
              header: 'Titular',
              render: (item) => (item.titular ? 'Sí' : 'No'),
            },
            {
              key: 'ingreso',
              header: 'Ingresó',
              render: (item) => (item.ingreso ? 'Sí' : 'No'),
            },
            { key: 'estado', header: 'Estado', render: (item) => item.estado },
          ]}
        />
      </section>

      {permiteEventos ? (
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Eventos del partido
            </h2>
            <p className="text-sm text-slate-600">
              Goles, autogoles, tarjetas amarillas y tarjetas rojas.
            </p>
          </div>
          {canEdit ? (
            <Button
              disabled={isSubmitting}
              onClick={() => {
                setModalError('');
                setShowEventModal(true);
              }}
            >
              Registrar evento
            </Button>
          ) : null}
        </div>
        <DataTable
          data={eventos}
          getKey={(item) =>
            item.id_evento ??
            `${item.id_tipo_evento}-${item.id_club}-${item.minuto}`
          }
          emptyMessage="No hay eventos registrados."
          columns={[
            {
              key: 'minuto',
              header: 'Minuto',
              render: (item) => item.minuto ?? '-',
            },
            {
              key: 'tipo',
              header: 'Tipo evento',
              render: (item) =>
                eventTypesById.get(item.id_tipo_evento) ??
                `Evento ${item.id_tipo_evento}`,
            },
            {
              key: 'club',
              header: 'Club',
              render: (item) =>
                clubNames.get(item.id_club) ?? `Club ${item.id_club}`,
            },
            {
              key: 'jugador',
              header: 'Jugador',
              render: (item) => {
                if (!item.id_inscripcion_competencia) {
                  return '-';
                }
                const inscription = inscriptionsById.get(
                  item.id_inscripcion_competencia,
                );
                return inscription
                  ? playersById.get(inscription.id_jugador)?.nombre_completo ??
                      `Jugador ${inscription.id_jugador}`
                  : `Inscripción ${item.id_inscripcion_competencia}`;
              },
            },
            {
              key: 'descripcion',
              header: 'Descripción',
              render: (item) => item.descripcion || '-',
            },
          ]}
        />
      </section>
      ) : null}

      {soloMarcador ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Marcador final</h2>
            <p className="mt-1 text-sm text-slate-600">
              Este deporte no registra eventos detallados. Ingresa únicamente el marcador final.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Marcador {localName}
              <input
                type="number"
                min="0"
                required
                disabled={!canEdit}
                value={marcadorForm.marcador_local}
                onChange={(event) =>
                  setMarcadorForm((current) => ({
                    ...current,
                    marcador_local: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Marcador {visitorName}
              <input
                type="number"
                min="0"
                required
                disabled={!canEdit}
                value={marcadorForm.marcador_visitante}
                onChange={(event) =>
                  setMarcadorForm((current) => ({
                    ...current,
                    marcador_visitante: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Observaciones
              <textarea
                disabled={!canEdit}
                value={marcadorForm.observaciones}
                onChange={(event) =>
                  setMarcadorForm((current) => ({
                    ...current,
                    observaciones: event.target.value,
                  }))
                }
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              />
            </label>
          </div>
          {canEdit ? (
            <Button
              className="mt-4"
              disabled={isSubmitting}
              onClick={() => void saveMarcador()}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar marcador'}
            </Button>
          ) : null}
        </section>
      ) : null}

      {canEdit ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">Finalizar planilla</h2>
          <p className="mt-1 text-sm text-amber-800">
            Una vez finalizada, la planilla quedará disponible únicamente para
            consulta.
          </p>
          <Button
            className="mt-4 bg-emerald-700 hover:bg-emerald-600"
            disabled={isSubmitting}
            onClick={() => setShowFinishConfirm(true)}
          >
            {isSubmitting ? 'Finalizando...' : 'Finalizar planilla'}
          </Button>
        </section>
      ) : null}

      {showPlayerModal ? (
        <AgregarJugadorPartidoModal
          partido={partido}
          clubes={clubes}
          inscripciones={inscripciones}
          jugadores={jugadores}
          registrados={partidoJugadores}
          sanciones={sanciones}
          isSubmitting={isSubmitting}
          error={modalError}
          onClose={() => !isSubmitting && setShowPlayerModal(false)}
          onSubmit={addPlayers}
        />
      ) : null}
      {showEventModal && permiteEventos ? (
        <RegistrarEventoModal
          planilla={planilla}
          partido={partido}
          clubes={clubes}
          tiposEventos={tiposEventos}
          registrados={partidoJugadores}
          inscripciones={inscripciones}
          jugadores={jugadores}
          isSubmitting={isSubmitting}
          error={modalError}
          deporteNombre={deporteNombre}
          onClose={() => !isSubmitting && setShowEventModal(false)}
          onSubmit={addEvent}
        />
      ) : null}
      {showFinishConfirm ? (
        <ConfirmDialog
          title="Finalizar planilla"
          message="¿Seguro que deseas finalizar esta planilla? Esta acción actualizará marcador, tabla de posiciones, sanciones y goleadores."
          confirmLabel="Finalizar planilla"
          cancelLabel="Cancelar"
          isSubmitting={isSubmitting}
          onCancel={() => !isSubmitting && setShowFinishConfirm(false)}
          onConfirm={() => void finish()}
        />
      ) : null}
    </div>
  );
}
