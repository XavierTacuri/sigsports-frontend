import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  anularEventoIndividualResultado,
  createEventoIndividualResultado,
  updateEventoIndividual,
  updateEventoIndividualResultado,
  getEventoIndividualById,
  getEventoIndividualParticipantes,
  getEventoIndividualResultados,
} from '../../api/eventosIndividualesApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type {
  EventoIndividual,
  EventoIndividualParticipante,
  EventoIndividualResultado,
  EventoIndividualResultadoPayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { EventoIndividualFormModal } from './EventoIndividualFormModal';
import { ResultadoIndividualFormModal } from './ResultadoIndividualFormModal';
import {
  formatDateOnly,
  formatTimeHHMM,
  getCompetenciaNombre,
  getEventoEstadoTone,
  getEscenarioNombre,
  getJugadorNombre,
  getClubNombre,
  getResultadoEstado,
} from './eventoIndividualUtils';

interface LocationState {
  evento?: EventoIndividual;
  openTab?: 'participantes' | 'resultados';
}

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

function ResultadoEstadoBadge({ estado }: { estado: string }) {
  const normalized = estado.trim().toUpperCase();
  const className =
    normalized === 'ANULADO'
      ? 'bg-slate-200 text-slate-700'
      : 'bg-emerald-100 text-emerald-800';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
      {normalized}
    </span>
  );
}

const getResultadoInscripcionId = (resultado: EventoIndividualResultado) =>
  resultado.id_inscripcion_competencia ??
  resultado.participante?.id_inscripcion_competencia ??
  null;

const getFriendlyError = (error: unknown, fallback: string) => {
  const message = getApiErrorMessage(error, fallback);
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return fallback;
  }

  if (normalized.includes('RELATION') || normalized.includes('TB_EVENTO_INDIVIDUAL_RESULTADOS')) {
    return 'No se pudieron cargar los resultados.';
  }

  if (normalized.includes('PUESTO')) {
    return 'Ya existe un participante con ese puesto.';
  }

  if (normalized.includes('RESULTADO') || normalized.includes('PARTICIPANTE')) {
    return 'Este participante ya tiene resultado registrado.';
  }

  return message;
};

export function EventoIndividualDetallePage() {
  const { user } = useAuth();
  const roleName = getRoleName(user);
  const canRead = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'DELEGADO',
    'PLANILLERO',
  ].includes(roleName);
  const canManageResults = ['ADMINISTRADOR', 'PLANILLERO'].includes(roleName);
  const canEditEvent = roleName === 'ADMINISTRADOR';
  const canAnularResults = ['ADMINISTRADOR', 'PLANILLERO'].includes(roleName);
  const { id } = useParams();
  const idEvento = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? {};

  const [evento, setEvento] = useState<EventoIndividual | null>(
    locationState.evento ?? null,
  );
  const [participantes, setParticipantes] = useState<
    EventoIndividualParticipante[]
  >(locationState.evento?.participantes ?? []);
  const [resultados, setResultados] = useState<EventoIndividualResultado[]>([]);
  const [selectedParticipant, setSelectedParticipant] =
    useState<EventoIndividualParticipante | null>(null);
  const [selectedResult, setSelectedResult] =
    useState<EventoIndividualResultado | null>(null);
  const [resultToAnnul, setResultToAnnul] =
    useState<EventoIndividualResultado | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventoIndividual | null>(null);
  const [selectedTab, setSelectedTab] = useState<'participantes' | 'resultados'>(
    locationState.openTab ?? 'participantes',
  );
  const [showEventModal, setShowEventModal] = useState(false);
  const [isLoading, setIsLoading] = useState(!locationState.evento);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultsError, setResultsError] = useState('');

  const load = useCallback(async () => {
    if (!canRead || !idEvento) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setResultsError('');
      setIsLoading(!locationState.evento);

      const eventoData = await getEventoIndividualById(idEvento).catch((requestError) => {
        if (locationState.evento) {
          return locationState.evento;
        }
        throw requestError;
      });

      const participantesData = await getEventoIndividualParticipantes(idEvento).catch(() => []);
      const resultadosData = await getEventoIndividualResultados(idEvento).catch((requestError) => {
        setResultsError(
          getFriendlyError(requestError, 'No se pudieron cargar los resultados.'),
        );
        return [] as EventoIndividualResultado[];
      });

      setEvento(eventoData);
      setParticipantes(participantesData);
      setResultados(resultadosData);
    } catch (requestError) {
      setError(
        getFriendlyError(
          requestError,
          'No se pudo cargar el evento individual.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, idEvento, locationState.evento]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedResultados = useMemo(
    () => resultados.slice().sort((a, b) => a.puesto - b.puesto),
    [resultados],
  );

  const resultByInscripcion = useMemo(() => {
    const map = new Map<number, EventoIndividualResultado>();

    resultados.forEach((resultado) => {
      const idInscripcion = getResultadoInscripcionId(resultado);
      if (idInscripcion) {
        map.set(idInscripcion, resultado);
      }
    });

    return map;
  }, [resultados]);

  const openResultForm = (
    participante: EventoIndividualParticipante,
    resultado?: EventoIndividualResultado | null,
  ) => {
    setSelectedParticipant(participante);
    setSelectedResult(resultado ?? null);
    setError('');
  };

  const openFirstPendingResult = () => {
    const pending = participantes.find(
      (participante) =>
        participante.id_inscripcion_competencia &&
        !resultByInscripcion.has(participante.id_inscripcion_competencia),
    );

    if (pending) {
      openResultForm(pending);
      setSelectedTab('participantes');
    }
  };

  const saveResult = async (payload: EventoIndividualResultadoPayload) => {
    if (!selectedParticipant || !evento) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (selectedResult?.id_resultado_individual) {
        await updateEventoIndividualResultado(
          selectedResult.id_resultado_individual,
          payload,
        );
      } else {
        await createEventoIndividualResultado(
          evento.id_evento_individual,
          payload,
        );
      }

      setSelectedParticipant(null);
      setSelectedResult(null);
      await load();
    } catch (requestError) {
      throw new Error(
        getFriendlyError(requestError, 'No se pudo guardar el resultado.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishResult = async () => {
    if (!resultToAnnul?.id_resultado_individual || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await anularEventoIndividualResultado(resultToAnnul.id_resultado_individual);
      setResultToAnnul(null);
      await load();
    } catch (requestError) {
      setError(getFriendlyError(requestError, 'No se pudo anular el resultado.'));
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
    return <ErrorMessage message="No tienes permisos." />;
  }

  if (!evento) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          className="bg-slate-200 text-slate-800 hover:bg-slate-300"
          onClick={() => navigate('/eventos-individuales')}
        >
          Volver
        </Button>
        <ErrorMessage message={error || 'Evento individual no encontrado.'} />
      </div>
    );
  }

  const competenciaNombre = getCompetenciaNombre(evento.competencia);

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title={evento.nombre_evento}
        description="Detalle del evento individual, participantes y resultados."
        actionLabel={canEditEvent ? 'Editar evento' : undefined}
        onAction={
          canEditEvent
            ? () => {
                setEditingEvent(evento);
                setShowEventModal(true);
              }
            : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        <EventoEstadoBadge estado={evento.estado_evento} />
        <Button
          type="button"
          className="bg-slate-200 text-slate-800 hover:bg-slate-300"
          onClick={() => navigate('/eventos-individuales')}
        >
          Volver
        </Button>
        {canManageResults ? (
          <Button type="button" onClick={openFirstPendingResult} disabled={!participantes.length}>
            Registrar resultados
          </Button>
        ) : null}
      </div>

      {error ? <ErrorMessage message={error} /> : null}
      {resultsError ? <ErrorMessage message={resultsError} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Competencia
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {competenciaNombre || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fecha
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {formatDateOnly(evento.fecha_evento)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hora
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {formatTimeHHMM(evento.hora_evento)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Escenario
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {getEscenarioNombre(evento.escenario)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tipo de evento
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {evento.tipo_evento || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              <EventoEstadoBadge estado={evento.estado_evento} />
            </dd>
          </div>
          <div className="lg:col-span-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observaciones
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {evento.observaciones || '-'}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {['participantes', 'resultados'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab as 'participantes' | 'resultados')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              selectedTab === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            {tab === 'participantes' ? 'Participantes' : 'Resultados'}
          </button>
        ))}
      </div>

      {selectedTab === 'participantes' ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Participantes</h2>
            <p className="text-sm text-slate-600">
              {participantes.length} participantes registrados.
            </p>
          </div>
          <DataTable
            data={participantes}
            getKey={(participante) =>
              participante.id_inscripcion_competencia ??
              `${participante.id_jugador}-${participante.id_club}`
            }
            emptyMessage="No hay participantes inscritos."
            columns={[
              {
                key: 'nombre',
                header: 'Jugador',
                render: (participante) => getJugadorNombre(participante),
              },
              {
                key: 'cedula',
                header: 'CÃ©dula',
                render: (participante) => participante.cedula,
              },
              {
                key: 'club',
                header: 'Club',
                render: (participante) => getClubNombre(participante),
              },
              {
                key: 'camiseta',
                header: 'NÃºmero camiseta',
                render: (participante) => participante.numero_camiseta ?? '-',
              },
              {
                key: 'estado',
                header: 'Estado inscripciÃ³n',
                render: (participante) => participante.estado_inscripcion || '-',
              },
            ]}
            renderActions={(participante) => {
              const resultado = participante.id_inscripcion_competencia
                ? resultByInscripcion.get(
                    participante.id_inscripcion_competencia,
                  )
                : undefined;

              if (!canManageResults) {
                return resultado ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTab('resultados')}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Ver en resultados
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Sin resultado</span>
                );
              }

              return (
                <div className="flex justify-end gap-2">
                  {resultado ? (
                    <button
                      type="button"
                      onClick={() => openResultForm(participante, resultado)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar resultado
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openResultForm(participante)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Registrar resultado
                    </button>
                  )}
                </div>
              );
            }}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Resultados</h2>
            <p className="text-sm text-slate-600">
              {sortedResultados.length} resultados registrados.
            </p>
          </div>
          <DataTable
            data={sortedResultados}
            getKey={(resultado) => resultado.id_resultado_individual}
            emptyMessage="No hay resultados registrados."
            columns={[
              { key: 'puesto', header: 'Puesto', render: (resultado) => resultado.puesto },
              {
                key: 'jugador',
                header: 'Jugador',
                render: (resultado) => getJugadorNombre(resultado),
              },
              {
                key: 'cedula',
                header: 'CÃ©dula',
                render: (resultado) =>
                  resultado.cedula || resultado.participante?.cedula || '-',
              },
              {
                key: 'club',
                header: 'Club',
                render: (resultado) => getClubNombre(resultado),
              },
              {
                key: 'puntaje',
                header: 'Puntaje',
                render: (resultado) => resultado.puntaje ?? '-',
              },
              {
                key: 'tiempo',
                header: 'Tiempo',
                render: (resultado) => resultado.tiempo || '-',
              },
              {
                key: 'marca',
                header: 'Marca',
                render: (resultado) => resultado.marca || '-',
              },
              {
                key: 'estado',
                header: 'Estado',
                render: (resultado) => (
                  <ResultadoEstadoBadge estado={getResultadoEstado(resultado)} />
                ),
              },
              {
                key: 'observaciones',
                header: 'Observaciones',
                render: (resultado) => resultado.observaciones || '-',
              },
            ]}
            renderActions={
              canManageResults || canAnularResults
                ? (resultado) => {
                    const participante = participantes.find(
                      (item) =>
                        item.id_inscripcion_competencia ===
                        getResultadoInscripcionId(resultado),
                    );

                    return (
                      <div className="flex justify-end gap-2">
                        {canManageResults && participante ? (
                          <button
                            type="button"
                            onClick={() => openResultForm(participante, resultado)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                          </button>
                        ) : null}
                        {canAnularResults &&
                        getResultadoEstado(resultado).toUpperCase() !== 'ANULADO' ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setResultToAnnul(resultado)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Anular
                          </button>
                        ) : null}
                      </div>
                    );
                  }
                : undefined
            }
          />
        </section>
      )}

      {selectedParticipant ? (
        <ResultadoIndividualFormModal
          competenciaNombre={competenciaNombre}
          participante={selectedParticipant}
          resultado={selectedResult}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setSelectedParticipant(null);
              setSelectedResult(null);
            }
          }}
          onSubmit={saveResult}
        />
      ) : null}

      {showEventModal ? (
        <EventoIndividualFormModal
          evento={editingEvent}
          onClose={() => {
            if (!isSubmitting) {
              setShowEventModal(false);
              setEditingEvent(null);
            }
          }}
          onSubmit={async (payload) => {
            if (!editingEvent?.id_evento_individual) {
              return;
            }

            await updateEventoIndividual(editingEvent.id_evento_individual, payload);
            await load();
            setShowEventModal(false);
            setEditingEvent(null);
          }}
        />
      ) : null}

      {resultToAnnul ? (
        <ConfirmDialog
          title="Anular resultado"
          message="¿Seguro que deseas anular este resultado?"
          confirmLabel="Anular resultado"
          cancelLabel="Cancelar"
          isSubmitting={isSubmitting}
          onCancel={() => !isSubmitting && setResultToAnnul(null)}
          onConfirm={() => void finishResult()}
        />
      ) : null}
    </div>
  );
}

