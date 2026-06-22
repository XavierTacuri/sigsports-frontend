import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import type { Club, Jugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAssetUrl } from '../../utils/assetUrl';
import { paginate } from '../../utils/pagination';

type ValidationAction = 'rechazar' | 'observar';

export function ValidacionJugadoresPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Jugador | null>(null);
  const [action, setAction] = useState<ValidationAction | null>(null);
  const [comment, setComment] = useState('');
  const roleName = user?.rol?.nombre_rol?.toUpperCase() ?? '';
  const canValidate = ['ADMINISTRADOR', 'SECRETARIA'].includes(roleName);

  const loadJugadoresPendientes = useCallback(async () => {
    if (!canValidate) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const [jugadoresData, clubesData] = await Promise.all([
        jugadoresApi.listarPendientes(),
        clubesApi.listar(),
      ]);
      setJugadores(jugadoresData);
      setClubes(clubesData);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudieron cargar los jugadores pendientes.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canValidate]);

  useEffect(() => {
    void loadJugadoresPendientes();
  }, [loadJugadoresPendientes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [jugadores, pageSize]);

  const totalPages = Math.ceil(jugadores.length / pageSize);
  const paginatedJugadores = paginate(jugadores, currentPage, pageSize);

  const approve = async (jugador: Jugador) => {
    if (!jugador.id_jugador) {
      return;
    }

    try {
      setError('');
      await jugadoresApi.aprobar(jugador.id_jugador, {
        observacion: 'Documentos correctos',
      });
      await loadJugadoresPendientes();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo aprobar el jugador.'),
      );
    }
  };

  const submitValidation = async () => {
    if (!selected?.id_jugador || !action || !comment.trim()) {
      setError('Debes ingresar un motivo u observación.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      if (action === 'rechazar') {
        await jugadoresApi.rechazar(selected.id_jugador, {
          motivo_rechazo: comment.trim(),
        });
      } else {
        await jugadoresApi.observar(selected.id_jugador, {
          observacion: comment.trim(),
        });
      }
      setSelected(null);
      setAction(null);
      setComment('');
      await loadJugadoresPendientes();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          `No se pudo ${action} el jugador.`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    const clubNames = new Map(
      clubes.map((club) => [club.id_club, club.nombre_club]),
    );

    return [
      {
        key: 'foto',
        header: 'Foto',
        render: (jugador: Jugador) =>
          jugador.foto_url ? (
            <img
              src={getAssetUrl(jugador.foto_url)}
              alt={jugador.nombre_completo}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            '-'
          ),
      },
      { key: 'cedula', header: 'Cédula', render: (item: Jugador) => item.cedula },
      {
        key: 'nombre',
        header: 'Nombre',
        render: (item: Jugador) => item.nombre_completo,
      },
      {
        key: 'club',
        header: 'Club',
        render: (item: Jugador) =>
          clubNames.get(item.id_club) ?? `Club ${item.id_club}`,
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: Jugador) => (
          <JugadorStatusBadge estado={item.estado_jugador} />
        ),
      },
      {
        key: 'documento',
        header: 'Documento',
        render: (item: Jugador) =>
          item.documento_identidad_url ? (
            <a
              href={getAssetUrl(item.documento_identidad_url)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 hover:underline"
            >
              Ver documento
            </a>
          ) : (
            'Sin documento'
          ),
      },
    ];
  }, [clubes]);

  if (!user || isLoading) {
    return <p>Cargando jugadores pendientes...</p>;
  }

  if (!canValidate) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este módulo." />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          Validación de jugadores
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Revisa documentos y valida jugadores pendientes u observados.
        </p>
      </div>

      {error && !selected ? <ErrorMessage message={error} /> : null}
      {(location.state as { success?: string } | null)?.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {(location.state as { success?: string }).success}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={paginatedJugadores}
        getKey={(item) => item.id_jugador ?? item.cedula}
        emptyMessage="No hay jugadores pendientes de validación."
        renderActions={(item) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/jugadores/${item.id_jugador}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Ver detalle
            </Link>
            <Link
              to={`/jugadores/${item.id_jugador}/editar?returnTo=/validacion-jugadores`}
              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
            >
              Editar datos
            </Link>
            <button
              type="button"
              onClick={() => void approve(item)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(item);
                setAction('observar');
                setComment('');
                setError('');
              }}
              className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Observar
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(item);
                setAction('rechazar');
                setComment('');
                setError('');
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Rechazar
            </button>
          </div>
        )}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={jugadores.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {selected && action ? (
        <Modal
          title={action === 'rechazar' ? 'Rechazar jugador' : 'Observar jugador'}
          onClose={() => {
            if (!isSubmitting) {
              setSelected(null);
              setAction(null);
              setError('');
            }
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {selected.nombre_completo} - {selected.cedula}
            </p>
            <label className="block text-sm font-medium text-slate-700">
              {action === 'rechazar'
                ? 'Motivo del rechazo'
                : 'Observación'}
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                required
              />
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setSelected(null);
                  setAction(null);
                  setError('');
                }}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitValidation()}
                className={
                  action === 'rechazar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                }
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
