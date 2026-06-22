import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { Jugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAssetUrl } from '../../utils/assetUrl';

export function JugadorDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [clubName, setClubName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const role = user?.rol?.nombre_rol;
  const canRead = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'].includes(
    role ?? '',
  );

  useEffect(() => {
    if (!canRead || !id) {
      setIsLoading(false);
      return;
    }

    Promise.all([jugadoresApi.obtener(Number(id)), clubesApi.listar()])
      .then(([jugadorData, clubes]) => {
        setJugador(jugadorData);
        setClubName(
          clubes.find((club) => club.id_club === jugadorData.id_club)
            ?.nombre_club ?? `Club ${jugadorData.id_club}`,
        );
      })
      .catch((requestError) =>
        setError(
          getApiErrorMessage(requestError, 'No se pudo cargar el jugador.'),
        ),
      )
      .finally(() => setIsLoading(false));
  }, [canRead, id]);

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  if (!canRead) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este módulo." />
    );
  }

  if (error || !jugador) {
    return <ErrorMessage message={error || 'Jugador no encontrado.'} />;
  }

  const fields = [
    ['Cédula', jugador.cedula],
    ['Nombre completo', jugador.nombre_completo],
    ['Club', clubName],
    ['Fecha de nacimiento', jugador.fecha_nacimiento],
    ['Lugar de nacimiento', jugador.lugar_nacimiento || '-'],
    ['Género', jugador.genero || '-'],
    ['Fecha de registro', jugador.fecha_registro || '-'],
    ['Observación', jugador.observacion_validacion || '-'],
    ['Motivo de rechazo', jugador.motivo_rechazo || '-'],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Detalle del jugador
          </h1>
          <div className="mt-2">
            <JugadorStatusBadge estado={jugador.estado_jugador} />
          </div>
        </div>
        <div className="flex gap-2">
          {role === 'ADMINISTRADOR' || role === 'SECRETARIA' ? (
            <Link
              to={`/jugadores/${jugador.id_jugador}/editar${
                role === 'SECRETARIA'
                  ? '?returnTo=/validacion-jugadores'
                  : ''
              }`}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {role === 'SECRETARIA' ? 'Editar datos' : 'Editar'}
            </Link>
          ) : null}
          {role === 'DELEGADO' &&
          ['PENDIENTE_VALIDACION', 'OBSERVADO'].includes(
            jugador.estado_jugador,
          ) ? (
            <Link
              to={`/jugadores/${jugador.id_jugador}/editar`}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {jugador.estado_jugador === 'OBSERVADO'
                ? 'Corregir'
                : 'Editar'}
            </Link>
          ) : null}
          <Link
            to="/jugadores"
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Volver
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
          <div>
            {jugador.foto_url ? (
              <img
                src={getAssetUrl(jugador.foto_url)}
                alt={jugador.nombre_completo}
                className="h-40 w-40 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                Sin foto
              </div>
            )}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {jugador.documento_identidad_url ? (
          <a
            href={getAssetUrl(jugador.documento_identidad_url)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Ver documento de identidad
          </a>
        ) : null}
      </section>
    </div>
  );
}
