import { useMemo, useState, type FormEvent } from 'react';
import type { SancionActiva } from '../../api/sancionesApi';
import type {
  Club,
  InscripcionCompetencia,
  Jugador,
  Partido,
  PartidoJugador,
  PartidoJugadorPayload,
} from '../../types';
import { normalizeText } from '../../utils/planillaDeporte';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';

interface Props {
  partido: Partido;
  clubes: Club[];
  inscripciones: InscripcionCompetencia[];
  jugadores: Jugador[];
  registrados: PartidoJugador[];
  sanciones: SancionActiva[];
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: PartidoJugadorPayload[]) => Promise<void>;
}

interface SelectedPlayer {
  id_inscripcion_competencia: number;
  id_club: number;
  titular: boolean;
  ingreso: boolean;
  observacion: string;
}

export function AgregarJugadorPartidoModal({
  partido,
  clubes,
  inscripciones,
  jugadores,
  registrados,
  sanciones,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [activeClubId, setActiveClubId] = useState(partido.id_club_local);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<number, SelectedPlayer>>({});

  const jugadorById = useMemo(
    () => new Map(jugadores.map((item) => [item.id_jugador, item])),
    [jugadores],
  );
  const clubNames = useMemo(
    () => new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
    [clubes],
  );
  const registeredIds = useMemo(
    () => new Set(registrados.map((item) => item.id_inscripcion_competencia)),
    [registrados],
  );
  const sanctionedPlayerIds = useMemo(
    () =>
      new Set(
        sanciones
          .map((item) => item.id_jugador)
          .filter((id): id is number => id !== undefined),
      ),
    [sanciones],
  );
  const sanctionedInscriptionIds = useMemo(
    () =>
      new Set(
        sanciones
          .map((item) => item.id_inscripcion_competencia)
          .filter((id): id is number => id !== undefined),
      ),
    [sanciones],
  );

  const teams = [
    { id: partido.id_club_local, label: 'Local' },
    { id: partido.id_club_visitante, label: 'Visitante' },
  ];

  const available = useMemo(
    () =>
      inscripciones
        .filter(
          (item) =>
            (item.id_club === partido.id_club_local ||
              item.id_club === partido.id_club_visitante) &&
            item.estado_inscripcion.trim().toUpperCase() === 'ACTIVA' &&
            item.id_inscripcion_competencia !== undefined &&
            !sanctionedInscriptionIds.has(item.id_inscripcion_competencia) &&
            !sanctionedPlayerIds.has(item.id_jugador),
        )
        .map((item) => ({
          inscription: item,
          player: jugadorById.get(item.id_jugador),
          alreadyAdded: registeredIds.has(item.id_inscripcion_competencia ?? 0),
        })),
    [
      inscripciones,
      jugadorById,
      partido.id_club_local,
      partido.id_club_visitante,
      registeredIds,
      sanctionedInscriptionIds,
      sanctionedPlayerIds,
    ],
  );

  const visiblePlayers = available.filter(({ inscription, player }) => {
    if (inscription.id_club !== activeClubId) {
      return false;
    }

    const term = normalizeText(search);
    if (!term) {
      return true;
    }

    return normalizeText(
      `${player?.nombre_completo ?? ''} ${player?.cedula ?? ''} ${
        inscription.numero_camiseta ?? ''
      }`,
    ).includes(term);
  });

  const selectedCount = Object.keys(selected).length;

  const togglePlayer = (inscription: InscripcionCompetencia) => {
    const id = inscription.id_inscripcion_competencia;
    if (!id || registeredIds.has(id)) {
      return;
    }

    setSelected((current) => {
      if (current[id]) {
        const next = { ...current };
        delete next[id];
        return next;
      }

      return {
        ...current,
        [id]: {
          id_inscripcion_competencia: id,
          id_club: inscription.id_club,
          titular: false,
          ingreso: true,
          observacion: '',
        },
      };
    });
  };

  const updateSelected = (
    id: number,
    values: Partial<Omit<SelectedPlayer, 'id_inscripcion_competencia'>>,
  ) => {
    setSelected((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...values,
      },
    }));
  };

  const markVisible = () => {
    setSelected((current) => {
      const next = { ...current };
      visiblePlayers.forEach(({ inscription, alreadyAdded }) => {
        const id = inscription.id_inscripcion_competencia;
        if (!id || alreadyAdded || next[id]) {
          return;
        }
        next[id] = {
          id_inscripcion_competencia: id,
          id_club: inscription.id_club,
          titular: false,
          ingreso: true,
          observacion: '',
        };
      });
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(
      Object.values(selected).map((item) => ({
        id_partido: partido.id_partido ?? 0,
        id_inscripcion_competencia: item.id_inscripcion_competencia,
        id_club: item.id_club,
        titular: item.titular,
        ingreso: item.ingreso,
        observacion: item.observacion.trim() || null,
      })),
    );
  };

  return (
    <Modal title="Seleccionar jugadores del partido" maxWidth="4xl" onClose={onClose}>
      <form className="space-y-5" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          Selecciona los jugadores que participaran en este partido.
        </p>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar jugador por nombre o cedula"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setActiveClubId(team.id)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  activeClubId === team.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {team.label}: {clubNames.get(team.id) ?? `Club ${team.id}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">
            {selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button type="button" className="bg-slate-200 text-slate-800 hover:bg-slate-300" onClick={markVisible}>
              Marcar todos
            </Button>
            <Button type="button" className="bg-slate-200 text-slate-800 hover:bg-slate-300" onClick={() => setSelected({})}>
              Limpiar seleccion
            </Button>
          </div>
        </div>

        <div className="max-h-[44vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {visiblePlayers.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No hay jugadores disponibles para este filtro.
            </p>
          ) : (
            visiblePlayers.map(({ inscription, player, alreadyAdded }) => {
              const id = inscription.id_inscripcion_competencia ?? 0;
              const isChecked = Boolean(selected[id]);
              return (
                <div
                  key={id}
                  className={`rounded-lg border p-3 ${
                    alreadyAdded
                      ? 'border-slate-200 bg-slate-50'
                      : isChecked
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked || alreadyAdded}
                      disabled={alreadyAdded}
                      onChange={() => togglePlayer(inscription)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          #{inscription.numero_camiseta ?? '-'}{' '}
                          {player?.nombre_completo ?? `Jugador ${inscription.id_jugador}`}
                        </p>
                        {alreadyAdded ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            Ya agregado
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {player?.cedula ?? 'Sin cedula'}
                      </p>
                    </div>
                  </div>

                  {isChecked ? (
                    <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selected[id].titular}
                          onChange={(event) =>
                            updateSelected(id, { titular: event.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        Titular
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selected[id].ingreso}
                          onChange={(event) =>
                            updateSelected(id, { ingreso: event.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        Ingreso
                      </label>
                      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                        Observacion
                        <input
                          value={selected[id].observacion}
                          onChange={(event) =>
                            updateSelected(id, { observacion: event.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
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
          <Button type="submit" disabled={isSubmitting || selectedCount === 0}>
            {isSubmitting ? 'Agregando...' : 'Agregar seleccionados'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
