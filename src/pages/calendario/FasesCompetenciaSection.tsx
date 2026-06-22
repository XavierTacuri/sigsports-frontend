import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fasesApi } from '../../api/fasesApi';
import { GeneralStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import type { FaseCompetencia, FaseCompetenciaPayload } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  competenciaId: number;
  canManage: boolean;
  onChanged?: () => void;
}

const emptyForm = (competenciaId: number): FaseCompetenciaPayload => ({
  id_competencia: competenciaId,
  nombre_fase: '',
  tipo_fase: 'GRUPOS',
  orden: 1,
  estado: 'ACTIVO',
});

export function FasesCompetenciaSection({
  competenciaId,
  canManage,
  onChanged,
}: Props) {
  const [items, setItems] = useState<FaseCompetencia[]>([]);
  const [editing, setEditing] = useState<FaseCompetencia | null>(null);
  const [form, setForm] = useState(() => emptyForm(competenciaId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await fasesApi.listarPorCompetencia(competenciaId));
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudieron cargar las fases.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(competenciaId));
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (item: FaseCompetencia) => {
    setEditing(item);
    setForm({
      id_competencia: item.id_competencia,
      nombre_fase: item.nombre_fase,
      tipo_fase: item.tipo_fase,
      orden: item.orden,
      estado: item.estado,
    });
    setError('');
    setIsModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (editing?.id_fase) {
        await fasesApi.actualizar(editing.id_fase, form);
      } else {
        await fasesApi.crear(form);
      }
      setIsModalOpen(false);
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo guardar la fase.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Fases</h2>
          <p className="text-sm text-slate-600">
            Define el orden y tipo de las fases de la competencia.
          </p>
        </div>
        {canManage ? <Button onClick={openCreate}>Nueva fase</Button> : null}
      </div>
      {error && !isModalOpen ? <ErrorMessage message={error} /> : null}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={items}
          getKey={(item) => item.id_fase ?? `${item.nombre_fase}-${item.orden}`}
          emptyMessage="No hay fases registradas para esta competencia."
          columns={[
            {
              key: 'nombre',
              header: 'Nombre',
              render: (item) => item.nombre_fase,
            },
            { key: 'tipo', header: 'Tipo', render: (item) => item.tipo_fase },
            { key: 'orden', header: 'Orden', render: (item) => item.orden },
            {
              key: 'estado',
              header: 'Estado',
              render: (item) => <GeneralStatusBadge estado={item.estado} />,
            },
          ]}
          renderActions={
            canManage
              ? (item) => (
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  >
                    Editar
                  </button>
                )
              : undefined
          }
        />
      )}
      {isModalOpen ? (
        <Modal
          title={editing ? 'Editar fase' : 'Nueva fase'}
          onClose={() => setIsModalOpen(false)}
        >
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre fase"
                value={form.nombre_fase}
                required
                onChange={(event) =>
                  setForm({ ...form, nombre_fase: event.target.value })
                }
              />
              <FormSelect
                label="Tipo fase"
                value={form.tipo_fase}
                required
                options={[
                  { value: 'GRUPOS', label: 'GRUPOS' },
                  { value: 'SEMIFINAL', label: 'SEMIFINAL' },
                  { value: 'FINAL', label: 'FINAL' },
                  { value: 'TERCER_LUGAR', label: 'TERCER LUGAR' },
                ]}
                onChange={(event) =>
                  setForm({ ...form, tipo_fase: event.target.value })
                }
              />
              <FormInput
                label="Orden"
                type="number"
                min="1"
                value={form.orden}
                required
                onChange={(event) =>
                  setForm({ ...form, orden: Number(event.target.value) })
                }
              />
              <FormSelect
                label="Estado"
                value={form.estado}
                required
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO' },
                  { value: 'INACTIVO', label: 'INACTIVO' },
                ]}
                onChange={(event) =>
                  setForm({ ...form, estado: event.target.value })
                }
              />
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
