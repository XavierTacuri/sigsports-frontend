import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { escenariosApi } from '../../api/escenariosApi';
import { fasesApi } from '../../api/fasesApi';
import { grupoClubesApi } from '../../api/grupoClubesApi';
import { gruposApi } from '../../api/gruposApi';
import { jornadasApi } from '../../api/jornadasApi';
import { partidosApi } from '../../api/partidosApi';
import { PartidoStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import type {
  Club,
  Escenario,
  FaseCompetencia,
  Grupo,
  GrupoClub,
  Jornada,
  Partido,
  PartidoPayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatTimeHHMM } from '../../utils/dateFormat';

interface Props {
  competenciaId: number;
  clubes: Club[];
  canManage: boolean;
  visibleClubIds?: Set<number>;
}

const emptyForm = (id: number): PartidoPayload => ({
  id_competencia: id,
  id_jornada: 0,
  id_fase: 0,
  id_grupo: null,
  id_club_local: 0,
  id_club_visitante: 0,
  id_escenario: null,
  fecha_partido: '',
  hora_partido: '',
  estado_partido: 'PROGRAMADO',
  goles_local: null,
  goles_visitante: null,
  observaciones: null,
});

const getCompetenciaNombre = (partido: Partido) => {
  return (
    partido.competencia?.nombre_competencia ??
    (partido as { nombre_competencia?: string }).nombre_competencia ??
    (partido as { competencia_nombre?: string }).competencia_nombre ??
    '-'
  );
};

const getLocalNombre = (partido: Partido) => {
  return (
    partido.club_local?.nombre_club ??
    (partido as { nombre_club_local?: string }).nombre_club_local ??
    (partido as { club_local_nombre?: string }).club_local_nombre ??
    (partido as { local?: { nombre_club?: string } }).local?.nombre_club ??
    (partido as { local_nombre?: string }).local_nombre ??
    '-'
  );
};

const getVisitanteNombre = (partido: Partido) => {
  return (
    partido.club_visitante?.nombre_club ??
    (partido as { nombre_club_visitante?: string }).nombre_club_visitante ??
    (partido as { club_visitante_nombre?: string }).club_visitante_nombre ??
    (partido as { visitante?: { nombre_club?: string } }).visitante
      ?.nombre_club ??
    (partido as { visitante_nombre?: string }).visitante_nombre ??
    '-'
  );
};

const getPartidoNombre = (partido: Partido) => {
  const local = getLocalNombre(partido);
  const visitante = getVisitanteNombre(partido);

  return `${local} vs ${visitante}`;
};

const getFaseNombre = (partido: Partido) => {
  return (
    partido.fase?.nombre_fase ??
    (partido as { nombre_fase?: string }).nombre_fase ??
    (partido as { fase_nombre?: string }).fase_nombre ??
    '-'
  );
};

const getEscenarioNombre = (partido: Partido) => {
  return (
    partido.escenario?.nombre_escenario ??
    (partido as { nombre_escenario?: string }).nombre_escenario ??
    (partido as { escenario_nombre?: string }).escenario_nombre ??
    '-'
  );
};

const isFinalizado = (partido: Partido) =>
  String(partido.estado_partido ?? '').toUpperCase() === 'FINALIZADO';

const getResultadoPartido = (partido: Partido) => {
  if (!isFinalizado(partido)) {
    return '-';
  }

  const flexiblePartido = partido as Partido & {
    puntos_local?: number | null;
    marcador_local?: number | null;
    puntos_visitante?: number | null;
    marcador_visitante?: number | null;
  };
  const local =
    flexiblePartido.goles_local ??
    flexiblePartido.puntos_local ??
    flexiblePartido.marcador_local ??
    0;
  const visitante =
    flexiblePartido.goles_visitante ??
    flexiblePartido.puntos_visitante ??
    flexiblePartido.marcador_visitante ??
    0;

  return `${local} - ${visitante}`;
};

export function PartidosSection({
  competenciaId,
  clubes,
  canManage,
  visibleClubIds,
}: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Partido[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [fases, setFases] = useState<FaseCompetencia[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [groupClubs, setGroupClubs] = useState<Record<number, GrupoClub[]>>({});
  const [editing, setEditing] = useState<Partido | null>(null);
  const [form, setForm] = useState(() => emptyForm(competenciaId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      const [partidosData, jornadasData, fasesData, gruposData, escenariosData] =
        await Promise.all([
          partidosApi.listarPorCompetencia(competenciaId),
          jornadasApi.listarPorCompetencia(competenciaId),
          fasesApi.listarPorCompetencia(competenciaId),
          gruposApi.listarPorCompetencia(competenciaId),
          escenariosApi.listar(),
        ]);
      const assignments = await Promise.all(
        gruposData.map(async (group) => [
          group.id_grupo,
          group.id_grupo
            ? await grupoClubesApi.listarPorGrupo(group.id_grupo)
            : [],
        ] as const),
      );
      setItems(partidosData);
      setJornadas(jornadasData);
      setFases(fasesData);
      setGrupos(gruposData);
      setEscenarios(escenariosData);
      setGroupClubs(
        Object.fromEntries(
          assignments.filter(
            (pair): pair is readonly [number, GrupoClub[]] =>
              pair[0] !== undefined,
          ),
        ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudieron cargar los partidos.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () =>
      visibleClubIds
        ? items.filter(
            (item) =>
              visibleClubIds.has(item.id_club_local) ||
              visibleClubIds.has(item.id_club_visitante),
          )
        : items,
    [items, visibleClubIds],
  );

  const maps = useMemo(
    () => ({
      clubs: new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
      jornadas: new Map(
        jornadas.map((item) => [item.id_jornada, item.nombre_jornada]),
      ),
      fases: new Map(fases.map((item) => [item.id_fase, item.nombre_fase])),
      escenarios: new Map(
        escenarios.map((item) => [item.id_escenario, item.nombre_escenario]),
      ),
    }),
    [clubes, escenarios, fases, jornadas],
  );

  const selectedFase = fases.find((item) => item.id_fase === form.id_fase);
  const requiresGroup =
    selectedFase?.tipo_fase.trim().toUpperCase() === 'GRUPOS';
  const selectedGroupClubIds = form.id_grupo
    ? new Set((groupClubs[form.id_grupo] ?? []).map((item) => item.id_club))
    : null;
  const selectableClubs =
    selectedGroupClubIds && selectedGroupClubIds.size > 0
      ? clubes.filter(
          (club) =>
            club.id_club !== undefined && selectedGroupClubIds.has(club.id_club),
        )
      : clubes;

  const open = (item?: Partido) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            id_competencia: item.id_competencia,
            id_jornada: item.id_jornada,
            id_fase: item.id_fase,
            id_grupo: item.id_grupo ?? null,
            id_club_local: item.id_club_local,
            id_club_visitante: item.id_club_visitante,
            id_escenario: item.id_escenario ?? null,
            fecha_partido: item.fecha_partido,
            hora_partido: formatTimeHHMM(item.hora_partido),
            estado_partido: item.estado_partido,
            goles_local: item.goles_local ?? null,
            goles_visitante: item.goles_visitante ?? null,
            observaciones: item.observaciones ?? null,
          }
        : emptyForm(competenciaId),
    );
    setError('');
    setIsModalOpen(true);
  };

  const handleVerPlanilla = (partido: Partido) => {
    if (!partido.id_partido) {
      return;
    }

    navigate(`/partidos/${partido.id_partido}/planilla`, {
      state: {
        readOnly: true,
        partido,
      },
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.id_club_local === form.id_club_visitante) {
      setError('El club local y el club visitante deben ser diferentes.');
      return;
    }
    const fase = fases.find((item) => item.id_fase === form.id_fase);
    if (fase?.tipo_fase.trim().toUpperCase() === 'GRUPOS' && !form.id_grupo) {
      setError('El grupo es obligatorio para una fase de grupos.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        id_grupo:
          fase?.tipo_fase.trim().toUpperCase() === 'GRUPOS'
            ? form.id_grupo
            : null,
      };
      if (editing?.id_partido) {
        await partidosApi.actualizar(editing.id_partido, payload);
      } else {
        await partidosApi.crear(payload);
      }
      setIsModalOpen(false);
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar el partido.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const readOnlyColumns = [
    {
      key: 'partido',
      header: 'Partido',
      render: (item: Partido) => getPartidoNombre(item),
    },
    {
      key: 'competencia',
      header: 'Competencia',
      render: (item: Partido) => getCompetenciaNombre(item),
    },
    {
      key: 'fase',
      header: 'Fase',
      render: (item: Partido) => getFaseNombre(item),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: Partido) => item.fecha_partido?.split('T')[0] ?? '-',
    },
    {
      key: 'hora',
      header: 'Hora',
      render: (item: Partido) => formatTimeHHMM(item.hora_partido),
    },
    {
      key: 'escenario',
      header: 'Escenario',
      render: (item: Partido) => getEscenarioNombre(item),
    },
    {
      key: 'resultado',
      header: 'Resultado',
      render: (item: Partido) =>
        isFinalizado(item) ? (
          <span className="font-bold text-slate-950">
            {getResultadoPartido(item)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: Partido) => (
        <PartidoStatusBadge estado={item.estado_partido} />
      ),
    },
  ];

  const manageColumns = [
    {
      key: 'partido',
      header: 'Partido',
      render: (item: Partido) =>
        `${maps.clubs.get(item.id_club_local) ?? getLocalNombre(item)} vs ${
          maps.clubs.get(item.id_club_visitante) ?? getVisitanteNombre(item)
        }`,
    },
    {
      key: 'competencia',
      header: 'Competencia',
      render: (item: Partido) => getCompetenciaNombre(item),
    },
    {
      key: 'fase',
      header: 'Fase',
      render: (item: Partido) =>
        maps.fases.get(item.id_fase) ?? getFaseNombre(item),
    },
    {
      key: 'grupo',
      header: 'Grupo',
      render: (item: Partido) =>
        item.id_grupo
          ? grupos.find((grupo) => grupo.id_grupo === item.id_grupo)
              ?.nombre_grupo ?? `Grupo ${item.id_grupo}`
          : '-',
    },
    {
      key: 'jornada',
      header: 'Jornada',
      render: (item: Partido) =>
        maps.jornadas.get(item.id_jornada) ?? `Jornada ${item.id_jornada}`,
    },
    {
      key: 'local',
      header: 'Local',
      render: (item: Partido) =>
        maps.clubs.get(item.id_club_local) ?? getLocalNombre(item),
    },
    {
      key: 'visitante',
      header: 'Visitante',
      render: (item: Partido) =>
        maps.clubs.get(item.id_club_visitante) ?? getVisitanteNombre(item),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: Partido) => item.fecha_partido?.split('T')[0] ?? '-',
    },
    {
      key: 'hora',
      header: 'Hora',
      render: (item: Partido) => formatTimeHHMM(item.hora_partido),
    },
    {
      key: 'escenario',
      header: 'Escenario',
      render: (item: Partido) =>
        item.id_escenario
          ? maps.escenarios.get(item.id_escenario) ?? getEscenarioNombre(item)
          : getEscenarioNombre(item),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: Partido) => (
        <PartidoStatusBadge estado={item.estado_partido} />
      ),
    },
    {
      key: 'marcador',
      header: 'Marcador',
      render: (item: Partido) =>
        `${item.goles_local ?? 0} - ${item.goles_visitante ?? 0}`,
    },
  ];
  const columns = canManage ? manageColumns : readOnlyColumns;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Partidos</h2>
          <p className="text-sm text-slate-600">
            Programa los encuentros del calendario de la competencia.
          </p>
        </div>
        {canManage ? <Button onClick={() => open()}>Nuevo partido</Button> : null}
      </div>
      {error && !isModalOpen ? <ErrorMessage message={error} /> : null}
      <DataTable
        data={visibleItems}
        getKey={(item) =>
          item.id_partido ??
          `${item.id_jornada}-${item.id_club_local}-${item.id_club_visitante}`
        }
        emptyMessage="No hay partidos registrados para esta competencia."
        columns={columns}
        renderActions={
          canManage
            ? (item) => (
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Editar
                </button>
              )
            : (item) =>
                isFinalizado(item) ? (
                  <button
                    type="button"
                    onClick={() => handleVerPlanilla(item)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Ver planilla
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">No disponible</span>
                )
        }
      />

      {isModalOpen ? (
        <Modal
          title={editing ? 'Editar partido' : 'Nuevo partido'}
          onClose={() => setIsModalOpen(false)}
        >
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                label="Jornada"
                value={form.id_jornada || ''}
                required
                options={jornadas.map((item) => ({
                  value: String(item.id_jornada),
                  label: item.nombre_jornada,
                }))}
                onChange={(event) =>
                  setForm({ ...form, id_jornada: Number(event.target.value) })
                }
              />
              <FormSelect
                label="Fase"
                value={form.id_fase || ''}
                required
                options={fases.map((item) => ({
                  value: String(item.id_fase),
                  label: `${item.nombre_fase} (${item.tipo_fase})`,
                }))}
                onChange={(event) => {
                  const idFase = Number(event.target.value);
                  const fase = fases.find((item) => item.id_fase === idFase);
                  setForm({
                    ...form,
                    id_fase: idFase,
                    id_grupo:
                      fase?.tipo_fase.trim().toUpperCase() === 'GRUPOS'
                        ? form.id_grupo
                        : null,
                  });
                }}
              />
              {requiresGroup ? (
                <FormSelect
                  label="Grupo"
                  value={form.id_grupo ?? ''}
                  required
                  options={grupos.map((item) => ({
                    value: String(item.id_grupo),
                    label: item.nombre_grupo,
                  }))}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      id_grupo: event.target.value
                        ? Number(event.target.value)
                        : null,
                      id_club_local: 0,
                      id_club_visitante: 0,
                    })
                  }
                />
              ) : null}
              <FormSelect
                label="Club local"
                value={form.id_club_local || ''}
                required
                options={selectableClubs.map((item) => ({
                  value: String(item.id_club),
                  label: item.nombre_club,
                }))}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_club_local: Number(event.target.value),
                  })
                }
              />
              <FormSelect
                label="Club visitante"
                value={form.id_club_visitante || ''}
                required
                options={selectableClubs.map((item) => ({
                  value: String(item.id_club),
                  label: item.nombre_club,
                }))}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_club_visitante: Number(event.target.value),
                  })
                }
              />
              <FormSelect
                label="Escenario"
                value={form.id_escenario ?? ''}
                options={escenarios.map((item) => ({
                  value: String(item.id_escenario),
                  label: item.nombre_escenario,
                }))}
                onChange={(event) =>
                  setForm({
                    ...form,
                    id_escenario: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
              <FormInput
                label="Fecha partido"
                type="date"
                value={form.fecha_partido}
                required
                onChange={(event) =>
                  setForm({ ...form, fecha_partido: event.target.value })
                }
              />
              <FormInput
                label="Hora partido"
                type="time"
                value={form.hora_partido}
                required
                onChange={(event) =>
                  setForm({ ...form, hora_partido: event.target.value })
                }
              />
              <FormSelect
                label="Estado partido"
                value={form.estado_partido}
                required
                options={[
                  { value: 'PROGRAMADO', label: 'PROGRAMADO' },
                  { value: 'EN_JUEGO', label: 'EN JUEGO' },
                  { value: 'FINALIZADO', label: 'FINALIZADO' },
                  { value: 'SUSPENDIDO', label: 'SUSPENDIDO' },
                  { value: 'CANCELADO', label: 'CANCELADO' },
                ]}
                onChange={(event) =>
                  setForm({ ...form, estado_partido: event.target.value })
                }
              />
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Observaciones
                <textarea
                  value={form.observaciones ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observaciones: event.target.value || null,
                    })
                  }
                  className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={() => setIsModalOpen(false)}
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
    </section>
  );
}
