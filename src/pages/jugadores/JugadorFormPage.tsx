import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { JugadorForm } from '../../components/forms/JugadorForm';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type { Club, Jugador } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

export function JugadorFormPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const role = user?.rol?.nombre_rol;
  const isDelegado = role === 'DELEGADO';
  const isSecretaria = role === 'SECRETARIA';
  const isAdmin = role === 'ADMINISTRADOR';
  const canOpenForm = isEditing
    ? isAdmin || isSecretaria || isDelegado
    : isAdmin || isDelegado;
  const [clubes, setClubes] = useState<Club[]>([]);
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const {
    clubesAsociados,
    selectedClubId,
    selectedClubName,
    loadingClubes,
    errorClubes,
  } = useDelegadoClubes(user ?? null, isDelegado);

  useEffect(() => {
    if (!canOpenForm || !user || (isDelegado && loadingClubes)) {
      if (!canOpenForm) {
        setIsLoading(false);
      }
      if (isDelegado && loadingClubes) {
        setIsLoading(false);
      }
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const clubesData = isDelegado ? clubesAsociados : await clubesApi.listar();
        const jugadorData =
          isEditing && id ? await jugadoresApi.obtener(Number(id)) : null;

        setClubes(clubesData);
        setJugador(jugadorData);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudo preparar el formulario del jugador.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [
    canOpenForm,
    clubesAsociados,
    id,
    isDelegado,
    isEditing,
    loadingClubes,
    user,
  ]);

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }

  if (!canOpenForm) {
    return (
      <ErrorMessage message="No tienes permisos para acceder a este módulo." />
    );
  }

  if (error || errorClubes) {
    return <ErrorMessage message={error || errorClubes} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          {isEditing
            ? isDelegado && jugador?.estado_jugador === 'OBSERVADO'
              ? 'Corregir jugador'
              : 'Editar jugador'
            : 'Registrar jugador'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isSecretaria
            ? 'Edita únicamente los datos básicos del jugador.'
            : 'Las correcciones del delegado volverán a validación.'}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JugadorForm
          clubes={clubes}
          jugador={jugador}
          onCancel={() =>
            navigate(
              searchParams.get('returnTo') ||
                (isSecretaria ? '/validacion-jugadores' : '/jugadores'),
            )
          }
          onSaved={(saved, message) =>
            navigate(
              searchParams.get('returnTo') ||
                (isSecretaria ? '/validacion-jugadores' : '/jugadores'),
              {
                state: {
                  success: message,
                  jugadorId: saved.id_jugador,
                },
              },
            )
          }
          selectedClubId={selectedClubId}
          selectedClubName={selectedClubName}
          loadingClubes={loadingClubes}
        />
      </section>
    </div>
  );
}
