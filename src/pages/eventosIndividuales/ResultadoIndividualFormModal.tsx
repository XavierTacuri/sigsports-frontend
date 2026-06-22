import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { Modal } from '../../components/ui/Modal';
import type {
  EventoIndividualParticipante,
  EventoIndividualResultado,
  EventoIndividualResultadoPayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  competenciaNombre: string;
  participante: EventoIndividualParticipante;
  resultado?: EventoIndividualResultado | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: EventoIndividualResultadoPayload) => Promise<void>;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const getVisibility = (competenciaNombre: string) => {
  const competencia = normalizeText(competenciaNombre);

  if (competencia.includes('AJEDREZ') || competencia.includes('AJEDRES')) {
    return { puntaje: true, tiempo: false, marca: false };
  }

  if (competencia.includes('CICLISMO')) {
    return { puntaje: false, tiempo: true, marca: false };
  }

  if (competencia.includes('ATLETISMO')) {
    return { puntaje: false, tiempo: true, marca: true };
  }

  return { puntaje: true, tiempo: true, marca: true };
};

export function ResultadoIndividualFormModal({
  competenciaNombre,
  participante,
  resultado,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const visibility = useMemo(
    () => getVisibility(competenciaNombre),
    [competenciaNombre],
  );
  const [puesto, setPuesto] = useState(resultado?.puesto ? String(resultado.puesto) : '');
  const [puntaje, setPuntaje] = useState(
    resultado?.puntaje !== null && resultado?.puntaje !== undefined
      ? String(resultado.puntaje)
      : '',
  );
  const [tiempo, setTiempo] = useState(resultado?.tiempo ?? '');
  const [marca, setMarca] = useState(resultado?.marca ?? '');
  const [observaciones, setObservaciones] = useState(
    resultado?.observaciones ?? '',
  );
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericPuesto = Number(puesto);

    if (!numericPuesto || numericPuesto <= 0) {
      setError('El puesto es obligatorio y debe ser mayor a 0.');
      return;
    }

    try {
      setError('');
      await onSubmit({
        id_inscripcion_competencia:
          participante.id_inscripcion_competencia ?? null,
        puesto: numericPuesto,
        puntaje: visibility.puntaje && puntaje ? Number(puntaje) : null,
        tiempo: visibility.tiempo && tiempo ? tiempo : null,
        marca: visibility.marca && marca ? marca : null,
        observaciones: observaciones.trim() || null,
      });
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'No se pudo guardar el resultado.',
      );
      const normalized = normalizeText(message);

      if (normalized.includes('PUESTO')) {
        setError('Ya existe un participante con ese puesto.');
        return;
      }

      if (
        normalized.includes('RESULTADO') ||
        normalized.includes('PARTICIPANTE')
      ) {
        setError('Este participante ya tiene resultado registrado.');
        return;
      }

      setError(message);
    }
  };

  return (
    <Modal
      title={resultado ? 'Editar resultado' : 'Registrar resultado'}
      maxWidth="2xl"
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={submit}>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            {participante.nombre_completo}
          </p>
          <p className="text-sm text-slate-600">
            {participante.cedula} - {participante.nombre_club}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Puesto"
            type="number"
            min="1"
            required
            value={puesto}
            onChange={(event) => setPuesto(event.target.value)}
          />
          {visibility.puntaje ? (
            <FormInput
              label="Puntaje"
              type="number"
              step="0.01"
              value={puntaje}
              onChange={(event) => setPuntaje(event.target.value)}
            />
          ) : null}
          {visibility.tiempo ? (
            <FormInput
              label="Tiempo"
              value={tiempo}
              placeholder="00:00:00"
              onChange={(event) => setTiempo(event.target.value)}
            />
          ) : null}
          {visibility.marca ? (
            <FormInput
              label="Marca"
              value={marca}
              onChange={(event) => setMarca(event.target.value)}
            />
          ) : null}
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Observaciones
            <textarea
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        {error ? <ErrorMessage message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            disabled={isSubmitting}
            className="bg-slate-200 text-slate-800 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar resultado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
