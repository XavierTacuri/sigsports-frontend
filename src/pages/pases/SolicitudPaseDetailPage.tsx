import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { solicitudesPasesApi } from '../../api/solicitudesPasesApi';
import { usuariosApi } from '../../api/usuariosApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { SolicitudPaseStatusBadge } from '../../components/pases/SolicitudPaseStatusBadge';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import type { Club, Jugador, SolicitudPase, Usuario } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const allowedRoles = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'];
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
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(date);
};

export function SolicitudPaseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const roleName = normalize(user?.rol?.nombre_rol);
  const canRead = allowedRoles.includes(roleName);
  const canReview =
    roleName === 'ADMINISTRADOR' || roleName === 'SECRETARIA';
  const [solicitud, setSolicitud] = useState<SolicitudPase | null>(null);
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [clubOrigen, setClubOrigen] = useState<Club | null>(null);
  const [clubDestino, setClubDestino] = useState<Club | null>(null);
  const [usuarioSolicita, setUsuarioSolicita] = useState<Usuario | null>(
    null,
  );
  const [usuarioRevisa, setUsuarioRevisa] = useState<Usuario | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    if (!canRead || !user || !id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError('');
        const solicitudData =
          await solicitudesPasesApi.getSolicitudPaseById(Number(id));

        if (roleName === 'DELEGADO') {
          const asociaciones = await usuariosClubesApi.listarPorUsuario(
            user.id_usuario,
          );
          const clubIds = new Set(asociaciones.map((item) => item.id_club));
          const canAccess =
            solicitudData.id_usuario_solicita === user.id_usuario ||
            clubIds.has(solicitudData.id_club_origen) ||
            clubIds.has(solicitudData.id_club_destino);

          if (!canAccess) {
            setPermissionError(
              'No tienes permisos para consultar esta solicitud.',
            );
            return;
          }
        }

        setSolicitud(solicitudData);
        if (solicitudData.jugador) {
          setJugador(solicitudData.jugador as Jugador);
        }
        if (solicitudData.club_origen) {
          setClubOrigen(solicitudData.club_origen as Club);
        }
        if (solicitudData.club_destino) {
          setClubDestino(solicitudData.club_destino as Club);
        }
        if (solicitudData.usuario_solicita) {
          setUsuarioSolicita(solicitudData.usuario_solicita as Usuario);
        }
        const [jugadorResult, clubesResult, usuariosResult] =
          await Promise.allSettled([
            jugadoresApi.obtener(solicitudData.id_jugador),
            clubesApi.listar(),
            usuariosApi.listar(),
          ]);

        if (jugadorResult.status === 'fulfilled') {
          setJugador(jugadorResult.value);
        }
        if (clubesResult.status === 'fulfilled') {
          setClubOrigen(
            clubesResult.value.find(
              (item) =>
                item.id_club === solicitudData.id_club_origen,
            ) ?? null,
          );
          setClubDestino(
            clubesResult.value.find(
              (item) =>
                item.id_club === solicitudData.id_club_destino,
            ) ?? null,
          );
        }
        if (usuariosResult.status === 'fulfilled') {
          setUsuarioSolicita(
            usuariosResult.value.find(
              (item) =>
                item.id_usuario === solicitudData.id_usuario_solicita,
            ) ?? null,
          );
          setUsuarioRevisa(
            usuariosResult.value.find(
              (item) =>
                item.id_usuario === solicitudData.id_usuario_revisa,
            ) ?? null,
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudo cargar la solicitud de pase.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [canRead, id, roleName, user]);

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }

  if (!canRead || permissionError) {
    return (
      <ErrorMessage
        message={
          permissionError ||
          'No tienes permisos para acceder a este módulo.'
        }
      />
    );
  }

  if (error || !solicitud) {
    return (
      <ErrorMessage message={error || 'Solicitud no encontrada.'} />
    );
  }

  const handleApprove = async () => {
    if (!solicitud.id_pase || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.aprobarSolicitudPase(
        solicitud.id_pase,
        { observacion_revision: 'Solicitud aprobada' },
      );
      setSolicitud(updated);
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
    if (!solicitud.id_pase || !rejectReason.trim() || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.rechazarSolicitudPase(
        solicitud.id_pase,
        { observacion_revision: rejectReason.trim() },
      );
      setSolicitud(updated);
      setShowRejectModal(false);
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

  const handleCancel = async () => {
    if (!solicitud.id_pase || isSubmitting) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await solicitudesPasesApi.cancelarSolicitudPase(
        solicitud.id_pase,
      );
      setSolicitud(updated);
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

  const isPending = normalize(solicitud.estado_pase) === 'PENDIENTE';
  const canCancel =
    isPending &&
    (roleName === 'ADMINISTRADOR' ||
      (roleName === 'DELEGADO' &&
        solicitud.id_usuario_solicita === user.id_usuario));
  const fields = [
    [
      'Jugador',
      getPaseJugadorNombre(solicitud) !== '-'
        ? getPaseJugadorNombre(solicitud)
        : jugador?.nombre_completo ?? '-',
    ],
    ['Cédula', jugador?.cedula ?? '-'],
    [
      'Estado del jugador',
      solicitud.jugador?.estado_jugador ?? jugador?.estado_jugador ?? '-',
    ],
    [
      'Club origen',
      getClubOrigenNombre(solicitud) !== '-'
        ? getClubOrigenNombre(solicitud)
        : clubOrigen?.nombre_club ?? '-',
    ],
    [
      'Club destino',
      getClubDestinoNombre(solicitud) !== '-'
        ? getClubDestinoNombre(solicitud)
        : clubDestino?.nombre_club ?? '-',
    ],
    ['Motivo de solicitud', solicitud.motivo_solicitud || '-'],
    ['Fecha solicitud', formatDate(solicitud.fecha_solicitud)],
    [
      'Usuario solicitante',
      solicitud.id_usuario_solicita === user.id_usuario
        ? user.nombre_completo
        : getSolicitadoPorNombre(solicitud) !== '-'
          ? getSolicitadoPorNombre(solicitud)
          : usuarioSolicita?.nombre_completo ?? '-',
    ],
    ['Fecha revisión', formatDate(solicitud.fecha_revision)],
    [
      'Usuario que revisó',
      solicitud.id_usuario_revisa === user.id_usuario
        ? user.nombre_completo
        : usuarioRevisa?.nombre_completo ??
        (solicitud.id_usuario_revisa
          ? `Usuario ${solicitud.id_usuario_revisa}`
          : '-'),
    ],
    ['Observación de revisión', solicitud.observacion_revision || '-'],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Detalle de solicitud de pase
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SolicitudPaseStatusBadge estado={solicitud.estado_pase} />
            {jugador ? (
              <JugadorStatusBadge estado={jugador.estado_jugador} />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview && isPending ? (
            <>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleApprove()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? 'Procesando...' : 'Aprobar'}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowRejectModal(true);
                  setRejectReason('');
                  setError('');
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Rechazar
              </Button>
            </>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleCancel()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Cancelando...' : 'Cancelar solicitud'}
            </Button>
          ) : null}
          <Link
            to="/pases"
            className="inline-flex items-center rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
          >
            Volver
          </Link>
        </div>
      </div>

      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {showRejectModal ? (
        <Modal
          title="Rechazar solicitud de pase"
          onClose={() => {
            if (!isSubmitting) {
              setShowRejectModal(false);
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
                onClick={() => setShowRejectModal(false)}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Volver
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
