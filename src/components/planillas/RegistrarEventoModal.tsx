import { useMemo, useState, type FormEvent } from 'react';
import type {
  Club,
  EventoPartidoPayload,
  InscripcionCompetencia,
  Jugador,
  Partido,
  PartidoJugador,
  PlanillaPartido,
  TipoEvento,
} from '../../types';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import { Modal } from '../ui/Modal';

interface Props {
  planilla: PlanillaPartido;
  partido: Partido;
  clubes: Club[];
  tiposEventos: TipoEvento[];
  registrados: PartidoJugador[];
  inscripciones: InscripcionCompetencia[];
  jugadores: Jugador[];
  isSubmitting: boolean;
  error: string;
  deporteNombre: string;
  onClose: () => void;
  onSubmit: (payload: EventoPartidoPayload) => Promise<void>;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const getAllowedEventTypes = (deporteNombre: string) => {
  const deporte = normalizeText(deporteNombre);

  if (deporte.includes('FUTBOL') || deporte.includes('INDOR')) {
    return ['GOL', 'AUTOGOL', 'TARJETA_AMARILLA', 'TARJETA_ROJA'];
  }

  return [];
};

const requiresPlayer = new Set([
  'GOL',
  'AUTOGOL',
  'TARJETA_AMARILLA',
  'TARJETA_ROJA',
]);

export function RegistrarEventoModal({
  planilla,
  partido,
  clubes,
  tiposEventos,
  registrados,
  inscripciones,
  jugadores,
  isSubmitting,
  error,
  deporteNombre,
  onClose,
  onSubmit,
}: Props) {
  const [idTipoEvento, setIdTipoEvento] = useState(0);
  const [idClub, setIdClub] = useState(0);
  const [idInscripcion, setIdInscripcion] = useState<number | null>(null);
  const [minuto, setMinuto] = useState<number | null>(null);
  const [valor, setValor] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');

  const selectedType = tiposEventos.find(
    (item) => item.id_tipo_evento === idTipoEvento,
  );
  const selectedTypeName = selectedType
    ? normalizeText(selectedType.nombre_evento)
    : '';
  const allowedEventTypes = getAllowedEventTypes(deporteNombre);
  const filteredEventTypes = tiposEventos.filter(
    (item) =>
      item.activo && allowedEventTypes.includes(normalizeText(item.nombre_evento)),
  );
  const isFootballLike = allowedEventTypes.includes('GOL');
  const isBasket = allowedEventTypes.includes('PUNTOS');
  const isVoley = allowedEventTypes.includes('OBSERVACION');
  const isAutogol = selectedTypeName === 'AUTOGOL';
  const playerRequired = selectedType
    ? requiresPlayer.has(selectedTypeName)
    : false;
  const autogolIsConfigured = tiposEventos.some(
    (item) => item.activo && normalizeText(item.nombre_evento) === 'AUTOGOL',
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
  const playerById = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item])),
    [jugadores],
  );
  const availablePlayers = registrados.filter((item) => item.id_club === idClub);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (playerRequired && !idInscripcion) {
      return;
    }

    if (isBasket && ![1, 2, 3].includes(valor ?? 0)) {
      return;
    }

    if (isVoley && !descripcion.trim()) {
      return;
    }

    await onSubmit({
      id_planilla: planilla.id_planilla ?? 0,
      id_partido: partido.id_partido ?? 0,
      id_club: idClub,
      id_inscripcion_competencia: idInscripcion,
      id_tipo_evento: idTipoEvento,
      minuto,
      valor: isAutogol ? valor ?? 1 : valor,
      descripcion: descripcion.trim() || null,
    });
  };

  return (
    <Modal title="Registrar evento" maxWidth="2xl" onClose={onClose}>
      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Tipo evento"
            value={idTipoEvento || ''}
            required
            options={filteredEventTypes.map((item) => ({
              value: String(item.id_tipo_evento),
              label: item.nombre_evento,
            }))}
            onChange={(event) => {
              setIdTipoEvento(Number(event.target.value));
              setValor(null);
            }}
          />
          <FormSelect
            label="Club"
            value={idClub || ''}
            required
            options={[partido.id_club_local, partido.id_club_visitante].map(
              (id) => ({
                value: String(id),
                label:
                  clubes.find((club) => club.id_club === id)?.nombre_club ??
                  `Club ${id}`,
              }),
            )}
            onChange={(event) => {
              setIdClub(Number(event.target.value));
              setIdInscripcion(null);
            }}
          />
          {isFootballLike || isBasket ? (
            <FormSelect
              label={`Jugador${playerRequired ? '' : ' (opcional)'}`}
              value={idInscripcion ?? ''}
              required={playerRequired}
              disabled={!idClub}
              options={availablePlayers.map((item) => {
                const inscription = inscriptionsById.get(
                  item.id_inscripcion_competencia,
                );
                const player = inscription
                  ? playerById.get(inscription.id_jugador)
                  : undefined;
                return {
                  value: String(item.id_inscripcion_competencia),
                  label:
                    player?.nombre_completo ??
                    `Inscripcion ${item.id_inscripcion_competencia}`,
                };
              })}
              onChange={(event) =>
                setIdInscripcion(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          ) : null}
          {isFootballLike || isBasket ? (
            <FormInput
              label="Minuto"
              type="number"
              min="0"
              value={minuto ?? ''}
              onChange={(event) =>
                setMinuto(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          ) : null}
          {isBasket ? (
            <FormSelect
              label="Valor de puntos"
              value={valor ?? ''}
              required
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
              onChange={(event) =>
                setValor(event.target.value ? Number(event.target.value) : null)
              }
            />
          ) : null}
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Descripcion{isVoley ? ' *' : ''}
            <textarea
              value={descripcion}
              required={isVoley}
              onChange={(event) => setDescripcion(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        {isFootballLike && !autogolIsConfigured ? (
          <ErrorMessage message="El tipo AUTOGOL no está configurado en el backend." />
        ) : null}
        {isAutogol ? (
          <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
            El autogol se registra al club/jugador que lo cometió. El sistema
            sumará el gol al rival.
          </p>
        ) : null}
        {idClub && availablePlayers.length === 0 && !isVoley ? (
          <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No hay jugadores registrados para este club.
          </p>
        ) : null}
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
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !idTipoEvento ||
              !idClub ||
              (playerRequired && !idInscripcion) ||
              (isBasket && ![1, 2, 3].includes(valor ?? 0)) ||
              (isVoley && !descripcion.trim())
            }
          >
            {isSubmitting ? 'Registrando...' : 'Registrar evento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
