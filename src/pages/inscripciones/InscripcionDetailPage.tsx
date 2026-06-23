import axios from 'axios';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { inscripcionesApi } from '../../api/inscripcionesApi';
import { InscripcionStatusBadge } from '../../components/inscripciones/InscripcionStatusBadge';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { InscripcionCompetencia } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';

const allowedRoles = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'];

type InscripcionDetalle = InscripcionCompetencia & {
  competencia?: {
    nombre?: string;
    nombre_competencia?: string;
  };
  club?: {
    nombre?: string;
    nombre_club?: string;
  };
  jugador?: {
    nombres?: string;
    apellidos?: string;
    nombre_completo?: string;
    cedula?: string;
  };
  nombre_competencia?: string;
  competencia_nombre?: string;
  nombre_club?: string;
  club_nombre?: string;
  nombre_jugador?: string;
  nombre_completo?: string;
  cedula?: string;
};

const joinName = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' ');

const getCompetenciaNombre = (item: InscripcionDetalle) =>
  item.competencia?.nombre_competencia ??
  item.nombre_competencia ??
  item.competencia_nombre ??
  item.competencia?.nombre ??
  `Competencia ${item.id_competencia}`;

const getClubNombre = (item: InscripcionDetalle) =>
  item.club?.nombre_club ??
  item.nombre_club ??
  item.club_nombre ??
  item.club?.nombre ??
  `Club ${item.id_club}`;

const getJugadorNombre = (item: InscripcionDetalle) => {
  const nombreDesdeJugador = joinName(
    item.jugador?.nombres,
    item.jugador?.apellidos,
  );

  return (
    item.jugador?.nombre_completo ??
    (nombreDesdeJugador || undefined) ??
    item.nombre_jugador ??
    item.nombre_completo ??
    '-'
  );
};

const getJugadorCedula = (item: InscripcionDetalle) =>
  item.jugador?.cedula ?? item.cedula ?? '-';

const formatDate = (value?: string) => {
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

const getDetailErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      return 'No se pudo cargar el detalle de esta inscripción.';
    }

    if (error.response?.status === 404) {
      return 'Inscripción no encontrada.';
    }

    if (error.response?.status === 422) {
      return getApiErrorMessage(error, 'No se pudo validar la inscripción.');
    }
  }

  return getApiErrorMessage(
    error,
    'Ocurrió un error al cargar la inscripción.',
  );
};

export function InscripcionDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const roleName = getRoleName(user);
  const canRead = allowedRoles.includes(roleName);
  const canEdit = ['ADMINISTRADOR', 'DELEGADO'].includes(roleName);
  const stateInscripcion = (
    location.state as { inscripcion?: InscripcionCompetencia } | null
  )?.inscripcion as InscripcionDetalle | undefined;
  const [inscripcion, setInscripcion] = useState<InscripcionDetalle | null>(
    stateInscripcion ?? null,
  );
  const [editForm, setEditForm] = useState({
    numero_camiseta: stateInscripcion?.numero_camiseta
      ? String(stateInscripcion.numero_camiseta)
      : '',
    observaciones: stateInscripcion?.observaciones ?? '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!canRead || !user || !id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError('');
        setIsLoading(true);
        const data = (await inscripcionesApi.getInscripcionById(
          Number(id),
        )) as InscripcionDetalle;
        setInscripcion(data);
        setEditForm({
          numero_camiseta: data.numero_camiseta
            ? String(data.numero_camiseta)
            : '',
          observaciones: data.observaciones ?? '',
        });
      } catch (requestError) {
        setError(getDetailErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [canRead, id, isAuthLoading, user]);

  const resetEditForm = () => {
    if (!inscripcion) {
      return;
    }

    setEditForm({
      numero_camiseta: inscripcion.numero_camiseta
        ? String(inscripcion.numero_camiseta)
        : '',
      observaciones: inscripcion.observaciones ?? '',
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inscripcion?.id_inscripcion_competencia) {
      return;
    }

    if (editForm.numero_camiseta && Number(editForm.numero_camiseta) <= 0) {
      setError('El número de camiseta debe ser mayor a 0.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);
      const numeroCamisetaValue = editForm.numero_camiseta
        ? Number(editForm.numero_camiseta)
        : null;
      const updated = (await inscripcionesApi.updateInscripcion(
        inscripcion.id_inscripcion_competencia,
        {
          numero_camiseta: numeroCamisetaValue,
          observaciones: editForm.observaciones.trim() || null,
        },
      )) as InscripcionDetalle;

      setInscripcion(updated);
      setEditForm({
        numero_camiseta: updated.numero_camiseta
          ? String(updated.numero_camiseta)
          : '',
        observaciones: updated.observaciones ?? '',
      });
      setIsEditing(false);
      setSuccess('Inscripción actualizada correctamente.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo actualizar la inscripción.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!canRead) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este módulo." />
    );
  }

  if (error && !inscripcion) {
    return <ErrorMessage message={error} />;
  }

  if (!inscripcion) {
    return <ErrorMessage message="Inscripción no encontrada." />;
  }

  const fields = [
    ['Competencia', getCompetenciaNombre(inscripcion)],
    ['Club', getClubNombre(inscripcion)],
    ['Jugador', getJugadorNombre(inscripcion)],
    ['Cédula', getJugadorCedula(inscripcion)],
    ['Número de camiseta', inscripcion.numero_camiseta ?? '-'],
    ['Año de participación', inscripcion.anio_participacion ?? '-'],
    ['Estado', inscripcion.estado_inscripcion],
    ['Observaciones', inscripcion.observaciones || '-'],
    ['Fecha de inscripción', formatDate(inscripcion.fecha_inscripcion)],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Detalle de inscripción
          </h1>
          <div className="mt-2">
            <InscripcionStatusBadge estado={inscripcion.estado_inscripcion} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !isEditing ? (
            <Button type="button" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => navigate('/inscripciones')}
            className="bg-slate-200 text-slate-800 hover:bg-slate-300"
          >
            Volver a mis inscripciones
          </Button>
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

      {canEdit && isEditing ? (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            Editar inscripción
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Número de camiseta"
              type="number"
              min="1"
              value={editForm.numero_camiseta}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  numero_camiseta: event.target.value,
                }))
              }
            />
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Observaciones
              <textarea
                value={editForm.observaciones}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    observaciones: event.target.value,
                  }))
                }
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                resetEditForm();
                setIsEditing(false);
                setError('');
              }}
              className="bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
