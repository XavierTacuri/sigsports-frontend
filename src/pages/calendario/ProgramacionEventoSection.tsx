import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { escenariosApi } from '../../api/escenariosApi';
import { jornadasApi } from '../../api/jornadasApi';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { Escenario, Jornada } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  competenciaId: number;
  canManage: boolean;
}

const emptyForm = {
  fecha_evento: '',
  hora_evento: '',
  id_escenario: '',
  lugar_evento: '',
  observaciones: '',
  estado: 'ACTIVO',
};

export function ProgramacionEventoSection({ competenciaId, canManage }: Props) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      const [jornadasData, escenariosResult] = await Promise.all([
        jornadasApi.listarPorCompetencia(competenciaId),
        escenariosApi.listar().catch(() => [] as Escenario[]),
      ]);
      const main =
        jornadasData.find(
          (item) =>
            item.numero_jornada === 1 ||
            item.nombre_jornada.toUpperCase() === 'EVENTO PRINCIPAL',
        ) ?? null;

      setJornada(main);
      setEscenarios(escenariosResult);
      setForm({
        ...emptyForm,
        fecha_evento: main?.fecha_inicio ?? '',
        estado: main?.estado ?? 'ACTIVO',
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo cargar la programación del evento.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [competenciaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.fecha_evento) {
      setError('La fecha del evento es obligatoria.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);
      const payload = {
        id_competencia: competenciaId,
        nombre_jornada: 'Evento principal',
        numero_jornada: 1,
        fecha_inicio: form.fecha_evento,
        fecha_fin: form.fecha_evento,
        estado: form.estado,
      };

      if (jornada?.id_jornada) {
        await jornadasApi.actualizar(jornada.id_jornada, payload);
      } else {
        await jornadasApi.crear(payload);
      }

      setSuccess('Programación guardada correctamente.');
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo guardar la programación del evento.',
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
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Programación del evento
        </h2>
        <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Esta competencia no maneja grupos ni partidos. Registra únicamente la
          fecha y lugar del evento.
        </p>
      </div>

      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Fecha del evento"
            type="date"
            value={form.fecha_evento}
            required
            readOnly={!canManage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fecha_evento: event.target.value,
              }))
            }
          />
          <FormInput
            label="Hora del evento"
            type="time"
            value={form.hora_evento}
            readOnly={!canManage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hora_evento: event.target.value,
              }))
            }
          />
          <FormSelect
            label="Escenario"
            value={form.id_escenario}
            disabled={!canManage || escenarios.length === 0}
            options={escenarios.map((item) => ({
              value: String(item.id_escenario),
              label: item.nombre_escenario,
            }))}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                id_escenario: event.target.value,
              }))
            }
          />
          <FormInput
            label="Lugar del evento"
            value={form.lugar_evento}
            readOnly={!canManage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                lugar_evento: event.target.value,
              }))
            }
          />
          <FormSelect
            label="Estado"
            value={form.estado}
            disabled={!canManage}
            options={[
              { value: 'ACTIVO', label: 'ACTIVO' },
              { value: 'INACTIVO', label: 'INACTIVO' },
            ]}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                estado: event.target.value,
              }))
            }
          />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Observaciones
            <textarea
              value={form.observaciones}
              readOnly={!canManage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observaciones: event.target.value,
                }))
              }
              className={`mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-slate-950 outline-none ${
                canManage
                  ? 'border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-200'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600'
              }`}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          La fecha y el estado se guardan como jornada única. Hora, escenario,
          lugar y observaciones quedan listos en pantalla hasta que el backend
          exponga campos específicos para eventos individuales.
        </p>
        {canManage ? (
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar programación'}
            </Button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
