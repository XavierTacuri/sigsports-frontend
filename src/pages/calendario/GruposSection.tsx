import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { grupoClubesApi } from '../../api/grupoClubesApi';
import { gruposApi } from '../../api/gruposApi';
import { GeneralStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import type {
  Club,
  Grupo,
  GrupoClub,
  GrupoClubPayload,
  GrupoPayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  competenciaId: number;
  clubes: Club[];
  canManage: boolean;
  onChanged?: () => void;
}

const emptyGroup = (id: number): GrupoPayload => ({
  id_competencia: id,
  nombre_grupo: '',
  orden: 1,
  estado: 'ACTIVO',
});

export function GruposSection({
  competenciaId,
  clubes,
  canManage,
  onChanged,
}: Props) {
  const [groups, setGroups] = useState<Grupo[]>([]);
  const [assignments, setAssignments] = useState<Record<number, GrupoClub[]>>(
    {},
  );
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [groupForm, setGroupForm] = useState(() => emptyGroup(competenciaId));
  const [assignGroup, setAssignGroup] = useState<Grupo | null>(null);
  const [assignForm, setAssignForm] = useState<GrupoClubPayload>({
    id_grupo: 0,
    id_club: 0,
    posicion_sorteo: null,
    estado: 'ACTIVO',
  });
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const clubNames = useMemo(
    () => new Map(clubes.map((club) => [club.id_club, club.nombre_club])),
    [clubes],
  );

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      const groupData = await gruposApi.listarPorCompetencia(competenciaId);
      const pairs = await Promise.all(
        groupData.map(async (group) => [
          group.id_grupo,
          group.id_grupo
            ? await grupoClubesApi.listarPorGrupo(group.id_grupo)
            : [],
        ] as const),
      );
      setGroups(groupData.sort((a, b) => a.orden - b.orden));
      setAssignments(
        Object.fromEntries(
          pairs.filter(
            (pair): pair is readonly [number, GrupoClub[]] =>
              pair[0] !== undefined,
          ),
        ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudieron cargar los grupos.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openGroup = (group?: Grupo) => {
    setEditing(group ?? null);
    setGroupForm(
      group
        ? {
            id_competencia: group.id_competencia,
            nombre_grupo: group.nombre_grupo,
            orden: group.orden,
            estado: group.estado,
          }
        : emptyGroup(competenciaId),
    );
    setError('');
    setIsGroupModalOpen(true);
  };

  const openAssign = (group: Grupo) => {
    if (!group.id_grupo) {
      return;
    }
    setAssignGroup(group);
    setAssignForm({
      id_grupo: group.id_grupo,
      id_club: 0,
      posicion_sorteo: null,
      estado: 'ACTIVO',
    });
    setError('');
    setIsAssignModalOpen(true);
  };

  const submitGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (editing?.id_grupo) {
        await gruposApi.actualizar(editing.id_grupo, groupForm);
      } else {
        await gruposApi.crear(groupForm);
      }
      setIsGroupModalOpen(false);
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar el grupo.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentAssignments = assignments[assignForm.id_grupo] ?? [];
    if (
      currentAssignments.some(
        (assignment) => assignment.id_club === assignForm.id_club,
      )
    ) {
      setError('El club ya está asignado a este grupo.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await grupoClubesApi.crear(assignForm);
      setIsAssignModalOpen(false);
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo asignar el club. Verifica que no pertenezca a otro grupo de esta competencia.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Grupos</h2>
          <p className="text-sm text-slate-600">
            Registra el sorteo y los clubes asignados a cada grupo.
          </p>
        </div>
        {canManage ? <Button onClick={() => openGroup()}>Nuevo grupo</Button> : null}
      </div>
      {error && !isGroupModalOpen && !isAssignModalOpen ? (
        <ErrorMessage message={error} />
      ) : null}
      {groups.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          No hay grupos registrados para esta competencia.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => {
            const groupAssignments = group.id_grupo
              ? assignments[group.id_grupo] ?? []
              : [];
            return (
              <article
                key={group.id_grupo ?? group.nombre_grupo}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-950">
                        {group.nombre_grupo}
                      </h3>
                      <GeneralStatusBadge estado={group.estado} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Orden {group.orden}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openGroup(group)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => openAssign(group)}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Asignar club
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                  {groupAssignments.length ? (
                    groupAssignments
                      .slice()
                      .sort(
                        (a, b) =>
                          (a.posicion_sorteo ?? 999) -
                          (b.posicion_sorteo ?? 999),
                      )
                      .map((assignment) => (
                        <div
                          key={
                            assignment.id_grupo_club ??
                            `${assignment.id_grupo}-${assignment.id_club}`
                          }
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span>
                            {clubNames.get(assignment.id_club) ??
                              `Club ${assignment.id_club}`}
                          </span>
                          <span className="text-xs text-slate-500">
                            Posición {assignment.posicion_sorteo ?? '-'}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">
                      Sin clubes asignados.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isGroupModalOpen ? (
        <Modal
          title={editing ? 'Editar grupo' : 'Nuevo grupo'}
          onClose={() => setIsGroupModalOpen(false)}
        >
          <form className="space-y-5" onSubmit={submitGroup}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre grupo"
                value={groupForm.nombre_grupo}
                required
                onChange={(event) =>
                  setGroupForm({
                    ...groupForm,
                    nombre_grupo: event.target.value,
                  })
                }
              />
              <FormInput
                label="Orden"
                type="number"
                min="1"
                value={groupForm.orden}
                required
                onChange={(event) =>
                  setGroupForm({
                    ...groupForm,
                    orden: Number(event.target.value),
                  })
                }
              />
              <FormSelect
                label="Estado"
                value={groupForm.estado}
                required
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO' },
                  { value: 'INACTIVO', label: 'INACTIVO' },
                ]}
                onChange={(event) =>
                  setGroupForm({ ...groupForm, estado: event.target.value })
                }
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={() => setIsGroupModalOpen(false)}
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

      {isAssignModalOpen && assignGroup ? (
        <Modal
          title={`Asignar club a ${assignGroup.nombre_grupo}`}
          onClose={() => setIsAssignModalOpen(false)}
        >
          <form className="space-y-5" onSubmit={submitAssignment}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                label="Club"
                value={assignForm.id_club || ''}
                required
                options={clubes.map((club) => ({
                  value: String(club.id_club),
                  label: club.nombre_club,
                }))}
                onChange={(event) =>
                  setAssignForm({
                    ...assignForm,
                    id_club: Number(event.target.value),
                  })
                }
              />
              <FormInput
                label="Posición sorteo"
                type="number"
                min="1"
                value={assignForm.posicion_sorteo ?? ''}
                onChange={(event) =>
                  setAssignForm({
                    ...assignForm,
                    posicion_sorteo: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
              <FormSelect
                label="Estado"
                value={assignForm.estado}
                required
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO' },
                  { value: 'INACTIVO', label: 'INACTIVO' },
                ]}
                onChange={(event) =>
                  setAssignForm({
                    ...assignForm,
                    estado: event.target.value,
                  })
                }
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Asignando...' : 'Asignar'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
