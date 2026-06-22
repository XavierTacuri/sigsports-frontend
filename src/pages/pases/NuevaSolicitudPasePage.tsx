import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { clubesApi } from '../../api/clubesApi';
import { solicitudesPasesApi } from '../../api/solicitudesPasesApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { JugadorStatusBadge } from '../../components/jugadores/JugadorStatusBadge';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { Club, JugadorBusquedaPase } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const normalize = (value?: string) => value?.trim().toUpperCase() ?? '';

const toClub = (item: { id_club: number; nombre_club?: string }): Club => ({
  id_club: item.id_club,
  codigo_club: null,
  nombre_club: item.nombre_club ?? `Club ${item.id_club}`,
  siglas: null,
  logo_url: null,
  estado: 'ACTIVO',
});

export function NuevaSolicitudPasePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleName = normalize(user?.rol?.nombre_rol);
  const canCreate = roleName === 'DELEGADO';
  const [clubes, setClubes] = useState<Club[]>([]);
  const [allClubes, setAllClubes] = useState<Club[]>([]);
  const [cedula, setCedula] = useState('');
  const [jugador, setJugador] = useState<JugadorBusquedaPase | null>(null);
  const [idClubDestino, setIdClubDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!canCreate || !user) {
      setIsLoading(false);
      return;
    }

    const loadClubs = async () => {
      try {
        setError('');
        const asociaciones = await usuariosClubesApi.listarPorUsuario(
          user.id_usuario,
        );
        let catalog: Club[] = [];

        try {
          catalog = await clubesApi.listar();
          setAllClubes(catalog);
        } catch {
          catalog = asociaciones.map(toClub);
          setAllClubes(catalog);
        }

        const clubIds = new Set(asociaciones.map((item) => item.id_club));
        const associatedClubs = catalog.filter(
          (club) =>
            club.id_club !== undefined && clubIds.has(club.id_club),
        );
        const availableClubs =
          associatedClubs.length > 0
            ? associatedClubs
            : asociaciones.map(toClub);

        setClubes(availableClubs);
        if (availableClubs.length === 1) {
          setIdClubDestino(String(availableClubs[0].id_club));
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudieron cargar tus clubes asociados.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadClubs();
  }, [canCreate, user]);

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }

  if (!canCreate) {
    return (
      <ErrorMessage message="No tienes permisos para crear solicitudes de pase." />
    );
  }

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchError('');
    setError('');
    setJugador(null);
    setMotivo('');

    if (!cedula.trim()) {
      setSearchError('La cédula es obligatoria.');
      return;
    }

    setIsSearching(true);
    try {
      const found = await solicitudesPasesApi.buscarJugadorParaPase(
        cedula.trim(),
      );
      setJugador(found);

      if (!found.id_jugador) {
        setSearchError(
          'El jugador encontrado no tiene un identificador válido.',
        );
        return;
      }

      if (normalize(found.estado_jugador) !== 'ACTIVO') {
        setSearchError(
          'Solo se puede solicitar el pase de un jugador ACTIVO.',
        );
        return;
      }

    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        if (requestError.response?.status === 403) {
          setSearchError('No tienes permisos para buscar jugadores.');
        } else if (requestError.response?.status === 404) {
          setSearchError('Jugador no encontrado.');
        } else {
          setSearchError(
            getApiErrorMessage(requestError, 'Jugador no encontrado.'),
          );
        }
      } else {
        setSearchError('Jugador no encontrado.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!jugador?.id_jugador) {
      setError('Debes buscar y seleccionar un jugador.');
      return;
    }
    if (normalize(jugador.estado_jugador) !== 'ACTIVO') {
      setError('Solo se puede solicitar el pase de un jugador ACTIVO.');
      return;
    }
    if (!idClubDestino) {
      setError('El club destino es obligatorio.');
      return;
    }
    if (jugador.id_club === Number(idClubDestino)) {
      setError('El jugador ya pertenece al club destino.');
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo de la solicitud es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      await solicitudesPasesApi.createSolicitudPase({
        id_jugador: jugador.id_jugador,
        id_club_destino: Number(idClubDestino),
        motivo_solicitud: motivo.trim(),
      });
      navigate('/pases', {
        state: { success: 'Solicitud de pase creada correctamente.' },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo crear la solicitud. Verifica que no exista otra pendiente.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const originClubName = jugador
    ? jugador.nombre_club_actual ??
      jugador.nombre_club ??
      (typeof jugador.club_actual === 'string'
        ? jugador.club_actual
        : jugador.club_actual?.nombre_club) ??
      allClubes.find((club) => club.id_club === jugador.id_club)
        ?.nombre_club ??
      `Club ${jugador.id_club}`
    : '-';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          Solicitar pase
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Busca al jugador por cédula y selecciona uno de tus clubes como
          destino.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <FormInput
              label="Cédula del jugador"
              value={cedula}
              required
              onChange={(event) => setCedula(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Buscando...' : 'Buscar jugador'}
          </Button>
        </form>
        {searchError ? (
          <div className="mt-4">
            <ErrorMessage message={searchError} />
          </div>
        ) : null}
      </section>

      {jugador ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {jugador.nombre_completo}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Cédula: {jugador.cedula}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Club actual: {originClubName}
              </p>
            </div>
            <JugadorStatusBadge estado={jugador.estado_jugador} />
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Club destino"
            value={idClubDestino}
            required
            disabled={clubes.length === 1}
            options={clubes.map((club) => ({
              value: String(club.id_club),
              label: club.nombre_club,
            }))}
            onChange={(event) => setIdClubDestino(event.target.value)}
          />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Motivo de la solicitud
            <textarea
              value={motivo}
              required
              onChange={(event) => setMotivo(event.target.value)}
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        {clubes.length === 0 ? (
          <ErrorMessage message="No tienes clubes asociados. Contacta al administrador." />
        ) : null}
        {jugador &&
        idClubDestino &&
        jugador.id_club === Number(idClubDestino) ? (
          <ErrorMessage message="El jugador ya pertenece al club destino." />
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Link
            to="/pases"
            className="inline-flex items-center rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !jugador ||
              normalize(jugador.estado_jugador) !== 'ACTIVO' ||
              !idClubDestino ||
              jugador.id_club === Number(idClubDestino) ||
              clubes.length === 0
            }
          >
            {isSubmitting ? 'Enviando...' : 'Crear solicitud'}
          </Button>
        </div>
      </form>
    </div>
  );
}
