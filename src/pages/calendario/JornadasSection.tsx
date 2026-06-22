import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { jornadasApi } from '../../api/jornadasApi';
import { GeneralStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import type { Jornada, JornadaPayload } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  competenciaId: number;
  canManage: boolean;
  onChanged?: () => void;
}

const emptyForm = (id: number): JornadaPayload => ({
  id_competencia: id,
  nombre_jornada: '',
  numero_jornada: 1,
  fecha_inicio: null,
  fecha_fin: null,
  estado: 'ACTIVO',
});

export function JornadasSection({ competenciaId, canManage, onChanged }: Props) {
  const [items, setItems] = useState<Jornada[]>([]);
  const [editing, setEditing] = useState<Jornada | null>(null);
  const [form, setForm] = useState(() => emptyForm(competenciaId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      setItems(await jornadasApi.listarPorCompetencia(competenciaId));
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudieron cargar las jornadas.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (item?: Jornada) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            id_competencia: item.id_competencia,
            nombre_jornada: item.nombre_jornada,
            numero_jornada: item.numero_jornada,
            fecha_inicio: item.fecha_inicio ?? null,
            fecha_fin: item.fecha_fin ?? null,
            estado: item.estado,
          }
        : emptyForm(competenciaId),
    );
    setError('');
    setIsModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setError('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      if (editing?.id_jornada) {
        await jornadasApi.actualizar(editing.id_jornada, form);
      } else {
        await jornadasApi.crear(form);
      }
      setIsModalOpen(false);
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar la jornada.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Jornadas</h2>
          <p className="text-sm text-slate-600">
            Organiza las fechas del calendario deportivo.
          </p>
        </div>
        {canManage ? <Button onClick={() => open()}>Nueva jornada</Button> : null}
      </div>
      {error && !isModalOpen ? <ErrorMessage message={error} /> : null}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={items}
          getKey={(item) => item.id_jornada ?? item.numero_jornada}
          emptyMessage="No hay jornadas registradas."
          columns={[
            { key: 'numero', header: 'Número', render: (item) => item.numero_jornada },
            { key: 'nombre', header: 'Nombre', render: (item) => item.nombre_jornada },
            { key: 'inicio', header: 'Fecha inicio', render: (item) => item.fecha_inicio || '-' },
            { key: 'fin', header: 'Fecha fin', render: (item) => item.fecha_fin || '-' },
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
                    onClick={() => open(item)}
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
          title={editing ? 'Editar jornada' : 'Nueva jornada'}
          onClose={() => setIsModalOpen(false)}
        >
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre jornada"
                value={form.nombre_jornada}
                required
                onChange={(event) => setForm({ ...form, nombre_jornada: event.target.value })}
              />
              <FormInput
                label="Número jornada"
                type="number"
                min="1"
                value={form.numero_jornada}
                required
                onChange={(event) => setForm({ ...form, numero_jornada: Number(event.target.value) })}
              />
              <FormInput
                label="Fecha inicio"
                type="date"
                value={form.fecha_inicio ?? ''}
                onChange={(event) => setForm({ ...form, fecha_inicio: event.target.value || null })}
              />
              <FormInput
                label="Fecha fin"
                type="date"
                value={form.fecha_fin ?? ''}
                onChange={(event) => setForm({ ...form, fecha_fin: event.target.value || null })}
              />
              <FormSelect
                label="Estado"
                value={form.estado}
                required
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO' },
                  { value: 'INACTIVO', label: 'INACTIVO' },
                ]}
                onChange={(event) => setForm({ ...form, estado: event.target.value })}
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" className="bg-slate-200 text-slate-800 hover:bg-slate-300" onClick={() => setIsModalOpen(false)}>
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
