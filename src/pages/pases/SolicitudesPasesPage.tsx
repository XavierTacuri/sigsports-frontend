import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { solicitudesPasesApi } from '../../api/solicitudesPasesApi';
import { usuariosApi } from '../../api/usuariosApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { SolicitudPaseStatusBadge } from '../../components/pases/SolicitudPaseStatusBadge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import type {
  Club,
  Jugador,
  SolicitudPase,
  Usuario,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const allowedRoles = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'];
const estados = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO'];

const normalize = (value?: string) => value?.trim().toUpperCase() ?? '';
const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

const getPaseJugadorNombre = (pase: SolicitudPase) => {
  return (
    pase.jugador?.nombre_completo ??
    pase.nombre_jugador ??
    pase.jugador_nombre ??
    (joinName(pase.jugador?.nombres, pase.jugador?.apellidos) || undefined) ??
    '-'
  );
};

const getPaseJugadorCedula = (pase: SolicitudPase) => {
  return (
    pase.jugador?.cedula ??
    pase.cedula_jugador ??
    pase.jugador_cedula ??
    (pase as { cedula?: string }).cedula ??
    '-'
  );
};

const getClubOrigenNombre = (pase: SolicitudPase) => {
  return (
    pase.club_origen?.nombre_club ??
    pase.nombre_club_origen ??
    pase.club_origen_nombre ??
    '-'
  );
};

const getClubDestinoNombre = (pase: SolicitudPase) => {
  return (
    pase.club_destino?.nombre_club ??
    pase.nombre_club_destino ??
    pase.club_destino_nombre ??
    '-'
  );
};

const getSolicitadoPorNombre = (pase: SolicitudPase) => {
  return (
    pase.usuario_solicita?.nombre_completo ??
    pase.nombre_usuario_solicita ??
    pase.solicitado_por ??
    '-'
  );
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-EC', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
};

export function SolicitudesPasesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roleName = normalize(user?.rol?.nombre_rol);
  const canRead = allowedRoles.includes(roleName);
  const canReview =
    roleName === 'ADMINISTRADOR' || roleName === 'SECRETARIA';
  const canCreate = roleName === 'DELEGADO';
  const [solicitudes, setSolicitudes] = useState<SolicitudPase[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estadoFilter, setEstadoFilter] = useState(
    normalize(searchParams.get('estado') ?? ''),
  );
  const [rejecting, setRejecting] = useState<SolicitudPase | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setEstadoFilter(normalize(searchParams.get('estado') ?? ''));
  }, [searchParams]);

  useEffect(() => {
    if (!canRead || !user) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError('');
        setIsLoading(true);

        const solicitudesData =
          await solicitudesPasesApi.getSolicitudesPases();
        let clubIds = new Set<number>();

        if (roleName === 'DELEGADO') {
          const asociaciones = await usuariosClubesApi.listarPorUsuario(
            user.id_usuario,
          );
          clubIds = new Set(asociaciones.map((item) => item.id_club));
          setSolicitudes(
            solicitudesData.filter(
              (item) =>
                item.id_usuario_solicita === user.id_usuario ||
                clubIds.has(item.id_club_origen) ||
                clubIds.has(item.id_club_destino),
            ),
          );
        } else {
          setSolicitudes(solicitudesData);
        }

        const [clubesResult, jugadoresResult, usuariosResult] =
          await Promise.allSettled([
            clubesApi.listar(),
            jugadoresApi.listar(),
            usuariosApi.listar(),
          ]);

        setClubes(
          clubesResult.status === 'fulfilled' ? clubesResult.value : [],
        );
        setJugadores(
          jugadoresResult.status === 'fulfilled'
            ? jugadoresResult.value
            : [],
        );
        setUsuarios(
          usuariosResult.status === 'fulfilled'
            ? usuariosResult.value
            : [],
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar las solicitudes de pases.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [canRead, roleName, user]);

  const filteredSolicitudes = useMemo(
    () =>
      solicitudes.filter(
        (item) =>
          !estadoFilter ||
          normalize(item.estado_pase) === estadoFilter,
      ),
    [estadoFilter, solicitudes],
  );

  const replaceSolicitud = (updated: SolicitudPase) => {
    setSolicitudes((current) =>
      current.map((item) =>
        item.id_pase === updated.id_pase ? updated : item,
      ),
    );
  };

  const handleApprove = async (item: SolicitudPase) => {
    if (!item.id_pase || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.aprobarSolicitudPase(
        item.id_pase,
        { observacion_revision: 'Solicitud aprobada' },
      );
      replaceSolicitud(updated);
      setSuccess('Solicitud aprobada correctamente.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo aprobar la solicitud.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rejecting?.id_pase || !rejectReason.trim() || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.rechazarSolicitudPase(
        rejecting.id_pase,
        { observacion_revision: rejectReason.trim() },
      );
      replaceSolicitud(updated);
      setRejecting(null);
      setRejectReason('');
      setSuccess('Solicitud rechazada correctamente.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo rechazar la solicitud.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (item: SolicitudPase) => {
    if (!item.id_pase || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.cancelarSolicitudPase(
        item.id_pase,
      );
      replaceSolicitud(updated);
      setSuccess('Solicitud cancelada correctamente.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo cancelar la solicitud.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    const jugadoresById = new Map(
      jugadores.map((item) => [item.id_jugador, item]),
    );
    const clubNames = new Map(
      clubes.map((item) => [item.id_club, item.nombre_club]),
    );
    const userNames = new Map(
      usuarios.map((item) => [item.id_usuario, item.nombre_completo]),
    );

    return [
      {
        key: 'jugador',
        header: 'Jugador',
        render: (item: SolicitudPase) =>
          getPaseJugadorNombre(item) !== '-'
            ? getPaseJugadorNombre(item)
            : jugadoresById.get(item.id_jugador)?.nombre_completo ??
              (item.id_jugador ? `Jugador ${item.id_jugador}` : '-'),
      },
      {
        key: 'cedula',
        header: 'Cédula',
        render: (item: SolicitudPase) =>
          getPaseJugadorCedula(item) !== '-'
            ? getPaseJugadorCedula(item)
            : jugadoresById.get(item.id_jugador)?.cedula ?? '-',
      },
      {
        key: 'origen',
        header: 'Club origen',
        render: (item: SolicitudPase) =>
          getClubOrigenNombre(item) !== '-'
            ? getClubOrigenNombre(item)
            : clubNames.get(item.id_club_origen) ?? '-',
      },
      {
        key: 'destino',
        header: 'Club destino',
        render: (item: SolicitudPase) =>
          getClubDestinoNombre(item) !== '-'
            ? getClubDestinoNombre(item)
            : clubNames.get(item.id_club_destino) ?? '-',
      },
      {
        key: 'solicitante',
        header: 'Solicitado por',
        render: (item: SolicitudPase) =>
          item.id_usuario_solicita === user?.id_usuario
            ? user?.nombre_completo ?? 'Usuario autenticado'
            : getSolicitadoPorNombre(item) !== '-'
              ? getSolicitadoPorNombre(item)
              : userNames.get(item.id_usuario_solicita) ?? '-',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: SolicitudPase) => (
          <SolicitudPaseStatusBadge estado={item.estado_pase} />
        ),
      },
      {
        key: 'fecha',
        header: 'Fecha solicitud',
        render: (item: SolicitudPase) =>
          formatDate(item.fecha_solicitud),
      },
    ];
  }, [clubes, jugadores, user, usuarios]);

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }

  if (!canRead) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este módulo." />
    );
  }

  const locationSuccess = (location.state as { success?: string } | null)
    ?.success;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            {roleName === 'DELEGADO'
              ? 'Mis solicitudes de pase'
              : 'Solicitudes de pases'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta y gestiona las solicitudes de traslado de jugadores.
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/pases/nueva"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Solicitar pase
          </Link>
        ) : null}
      </div>

      {locationSuccess || success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {locationSuccess || success}
        </p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      <section className="max-w-sm rounded-lg border border-slate-200 bg-white p-4">
        <FormSelect
          label="Estado"
          value={estadoFilter}
          options={estados.map((estado) => ({
            value: estado,
            label: estado,
          }))}
          onChange={(event) => setEstadoFilter(event.target.value)}
        />
      </section>

      <DataTable
        columns={columns}
        data={filteredSolicitudes}
        getKey={(item) =>
          item.id_pase ??
          `${item.id_jugador}-${item.id_club_destino}-${item.fecha_solicitud}`
        }
        emptyMessage="No hay solicitudes que coincidan con el filtro."
        renderActions={(item) => {
          const isPending = normalize(item.estado_pase) === 'PENDIENTE';
          const canCancel =
            isPending &&
            (roleName === 'ADMINISTRADOR' ||
              (roleName === 'DELEGADO' &&
                item.id_usuario_solicita === user.id_usuario));

          return (
            <div className="flex justify-end gap-2">
              <Link
                to={`/pases/${item.id_pase}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ver detalle
              </Link>
              {canReview && isPending ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleApprove(item)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setRejecting(item);
                      setRejectReason('');
                      setError('');
                    }}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-slate-400"
                  >
                    Rechazar
                  </button>
                </>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleCancel(item)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          );
        }}
      />

      {rejecting ? (
        <Modal
          title="Rechazar solicitud de pase"
          onClose={() => {
            if (!isSubmitting) {
              setRejecting(null);
              setRejectReason('');
            }
          }}
        >
          <form className="space-y-4" onSubmit={handleReject}>
            <label className="block text-sm font-medium text-slate-700">
              Motivo del rechazo
              <textarea
                value={rejectReason}
                required
                onChange={(event) => setRejectReason(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setRejecting(null)}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? 'Rechazando...' : 'Confirmar rechazo'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
