import { useEffect, useState, type FormEvent } from 'react';
import { competenciasApi } from '../../api/competenciasApi';
import { escenariosApi } from '../../api/escenariosApi';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { Modal } from '../../components/ui/Modal';
import type {
  Competencia,
  Escenario,
  EventoIndividual,
  EventoIndividualCreate,
  EventoIndividualUpdate,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

type CompetenciaOption = Competencia & Record<string, unknown>;

interface EventoIndividualFormModalProps {
  evento?: EventoIndividual | null;
  onClose: () => void;
  onSubmit: (
    payload: EventoIndividualCreate | EventoIndividualUpdate,
  ) => Promise<void>;
}

interface FormState {
  id_competencia: string;
  id_escenario: string;
  nombre_evento: string;
  fecha_evento: string;
  hora_evento: string;
  tipo_evento: string;
  estado_evento: string;
  observaciones: string;
}

const tiposEvento = [
  'CLASIFICACION_GENERAL',
  'TIEMPO',
  'MARCA',
  'POSICION',
  'RONDA',
  'OTRO',
];

const estadosEvento = ['PROGRAMADO', 'FINALIZADO', 'SUSPENDIDO', 'CANCELADO'];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const getCompetenciaNombre = (competencia: CompetenciaOption) =>
  (typeof competencia.nombre_competencia === 'string' &&
    competencia.nombre_competencia) ||
  (typeof competencia.competencia_nombre === 'string' &&
    competencia.competencia_nombre) ||
  (typeof competencia.nombre === 'string' && competencia.nombre) ||
  '';

const getDeporteNombre = (competencia: CompetenciaOption) => {
  const deporte = competencia.deporte as Record<string, unknown> | undefined;

  return (
    (typeof deporte?.nombre_deporte === 'string' && deporte.nombre_deporte) ||
    (typeof competencia.nombre_deporte === 'string' && competencia.nombre_deporte) ||
    (typeof competencia.deporte_nombre === 'string' && competencia.deporte_nombre) ||
    getCompetenciaNombre(competencia)
  );
};

const isCompetenciaIndividual = (competencia: CompetenciaOption) => {
  const nombre = normalizeText(getDeporteNombre(competencia));

  return (
    nombre.includes('CICLISMO') ||
    nombre.includes('ATLETISMO') ||
    nombre.includes('AJEDREZ') ||
    nombre.includes('AJEDRES')
  );
};

const toDateInputValue = (value?: string | null) => value?.slice(0, 10) ?? '';
const toTimeInputValue = (value?: string | null) => value?.slice(0, 5) ?? '';

export function EventoIndividualFormModal({
  evento,
  onClose,
  onSubmit,
}: EventoIndividualFormModalProps) {
  const [competencias, setCompetencias] = useState<CompetenciaOption[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [form, setForm] = useState<FormState>({
    id_competencia: evento?.id_competencia ? String(evento.id_competencia) : '',
    id_escenario: evento?.id_escenario ? String(evento.id_escenario) : '',
    nombre_evento: evento?.nombre_evento ?? '',
    fecha_evento: toDateInputValue(evento?.fecha_evento),
    hora_evento: toTimeInputValue(evento?.hora_evento),
    tipo_evento: evento?.tipo_evento ?? '',
    estado_evento: evento?.estado_evento ?? 'PROGRAMADO',
    observaciones: evento?.observaciones ?? '',
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const competenciasResponse = await competenciasApi.listar();
        const individuales = (competenciasResponse as CompetenciaOption[]).filter(
          isCompetenciaIndividual,
        );
        setCompetencias(individuales);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar las competencias.',
          ),
        );
      } finally {
        setIsLoadingOptions(false);
      }

      try {
        setEscenarios(await escenariosApi.listar());
      } catch {
        setEscenarios([]);
      }
    };

    void loadOptions();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!evento && !form.id_competencia) {
      setError('La competencia es obligatoria.');
      return;
    }

    if (!form.nombre_evento.trim()) {
      setError('El nombre del evento es obligatorio.');
      return;
    }

    if (!form.fecha_evento) {
      setError('La fecha del evento es obligatoria.');
      return;
    }

    const basePayload = {
      id_escenario: form.id_escenario ? Number(form.id_escenario) : null,
      nombre_evento: form.nombre_evento.trim(),
      fecha_evento: form.fecha_evento,
      hora_evento: form.hora_evento || null,
      tipo_evento: form.tipo_evento || null,
      estado_evento: form.estado_evento || 'PROGRAMADO',
      observaciones: form.observaciones.trim() || null,
    };

    const payload = evento
      ? basePayload
      : {
          ...basePayload,
          id_competencia: Number(form.id_competencia),
        };

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(payload);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar el evento.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={evento ? 'Editar evento individual' : 'Nuevo evento individual'}
      maxWidth="2xl"
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Competencia individual"
            value={form.id_competencia}
            required={!evento}
            disabled={Boolean(evento)}
            options={competencias.map((competencia) => ({
              value: String(competencia.id_competencia),
              label: getCompetenciaNombre(competencia),
            }))}
            onChange={(event) =>
              setForm({ ...form, id_competencia: event.target.value })
            }
          />
          <FormInput
            label="Nombre del evento"
            value={form.nombre_evento}
            required
            onChange={(event) =>
              setForm({ ...form, nombre_evento: event.target.value })
            }
          />
          <FormInput
            label="Fecha del evento"
            type="date"
            value={form.fecha_evento}
            required
            onChange={(event) =>
              setForm({ ...form, fecha_evento: event.target.value })
            }
          />
          <FormInput
            label="Hora del evento"
            type="time"
            value={form.hora_evento}
            onChange={(event) =>
              setForm({ ...form, hora_evento: event.target.value })
            }
          />
          <FormSelect
            label="Escenario"
            value={form.id_escenario}
            options={escenarios.map((escenario) => ({
              value: String(escenario.id_escenario),
              label: escenario.nombre_escenario,
            }))}
            onChange={(event) =>
              setForm({ ...form, id_escenario: event.target.value })
            }
          />
          <FormSelect
            label="Tipo de evento"
            value={form.tipo_evento}
            options={tiposEvento.map((tipo) => ({ value: tipo, label: tipo }))}
            onChange={(event) =>
              setForm({ ...form, tipo_evento: event.target.value })
            }
          />
          <FormSelect
            label="Estado"
            value={form.estado_evento}
            required
            options={estadosEvento.map((estado) => ({
              value: estado,
              label: estado,
            }))}
            onChange={(event) =>
              setForm({ ...form, estado_evento: event.target.value })
            }
          />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Observaciones
            <textarea
              value={form.observaciones}
              rows={3}
              onChange={(event) =>
                setForm({ ...form, observaciones: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        {isLoadingOptions ? (
          <p className="text-sm text-slate-600">Cargando opciones...</p>
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            className="bg-slate-200 text-slate-800 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
