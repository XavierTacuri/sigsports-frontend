import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../../api/campeonatosApi';
import { clubesApi } from '../../api/clubesApi';
import { inscripcionesApi } from '../../api/inscripcionesApi';
import { jugadoresApi } from '../../api/jugadoresApi';
import { partidosApi } from '../../api/partidosApi';
import { planillasApi } from '../../api/planillasApi';
import { usuariosApi } from '../../api/usuariosApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { CardStat } from '../../components/ui/CardStat';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type { Campeonato } from '../../types';

type MetricValue = number | '-';

interface DashboardMetrics {
  usuarios: MetricValue;
  clubes: MetricValue;
  jugadores: MetricValue;
  activos: MetricValue;
  inscripciones: MetricValue;
  pendientes: MetricValue;
  campeonatos: MetricValue;
  partidos: MetricValue;
  planillas: MetricValue;
  estadisticas: MetricValue;
}

const initialMetrics: DashboardMetrics = {
  usuarios: '-',
  clubes: '-',
  jugadores: '-',
  activos: '-',
  inscripciones: '-',
  pendientes: '-',
  campeonatos: '-',
  partidos: '-',
  planillas: '-',
  estadisticas: '-',
};

const countOrZero = async <T,>(request: Promise<T[]>): Promise<number> => {
  try {
    const data = await request;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
};

export function DashboardPage() {
  const { user } = useAuth();
  const userWithRoleFallbacks = user as
    | (typeof user & {
        nombre_rol?: string;
        rol?: { nombre_rol?: string } | string;
      })
    | null;
  const roleName =
    (typeof userWithRoleFallbacks?.rol === 'object'
      ? userWithRoleFallbacks.rol?.nombre_rol?.toUpperCase?.()
      : undefined) ??
    userWithRoleFallbacks?.nombre_rol?.toUpperCase?.() ??
    (typeof userWithRoleFallbacks?.rol === 'string'
      ? userWithRoleFallbacks.rol.toUpperCase?.()
      : undefined) ??
    '';
  const isDelegado = roleName === 'DELEGADO';
  const {
    selectedClubId,
    selectedClubName,
    loadingClubes,
  } = useDelegadoClubes(
    user ?? null,
    isDelegado,
  );
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [campeonatoActivo, setCampeonatoActivo] =
    useState<Campeonato | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadCampeonatos = () =>
      campeonatosApi
        .listar()
        .then((items) => items)
        .catch(() => [] as Campeonato[]);

    const loadDashboard = async () => {
      if (isDelegado && loadingClubes) {
        return;
      }

      if (isDelegado && !selectedClubId) {
        const campeonatos = await loadCampeonatos();

        if (cancelled) return;

        setMetrics({
          ...initialMetrics,
          jugadores: 0,
          activos: 0,
          inscripciones: 0,
          pendientes: 0,
          campeonatos: campeonatos.length,
        });
        setCampeonatoActivo(
          campeonatos.find((campeonato) => campeonato.estado === 'ACTIVO') ??
            null,
        );
        return;
      }

      if (isDelegado && selectedClubId) {
        const [jugadoresClub, inscripcionesClub, campeonatos] =
          await Promise.all([
            jugadoresApi.listarPorClub(selectedClubId).catch(() => []),
            inscripcionesApi
              .getInscripcionesByClub(selectedClubId)
              .catch(() => []),
            loadCampeonatos(),
          ]);

        if (cancelled) return;

        const activos = jugadoresClub.filter(
          (jugador) =>
            String(jugador.estado_jugador ?? '').toUpperCase() === 'ACTIVO',
        ).length;
        const pendientes = jugadoresClub.filter((jugador) => {
          const estado = String(jugador.estado_jugador ?? '').toUpperCase();

          return estado === 'PENDIENTE_VALIDACION' || estado === 'OBSERVADO';
        }).length;

        setMetrics({
          ...initialMetrics,
          jugadores: jugadoresClub.length,
          activos,
          inscripciones: inscripcionesClub.length,
          pendientes,
          campeonatos: campeonatos.length,
        });
        setCampeonatoActivo(
          campeonatos.find((campeonato) => campeonato.estado === 'ACTIVO') ??
            null,
        );
        return;
      }

      if (roleName === 'ADMINISTRADOR') {
        const [
          usuarios,
          clubes,
          jugadores,
          pendientes,
          campeonatos,
        ] = await Promise.all([
          countOrZero(usuariosApi.listar()),
          countOrZero(clubesApi.listar()),
          countOrZero(jugadoresApi.listar()),
          countOrZero(jugadoresApi.listarPendientes()),
          loadCampeonatos(),
        ]);

        if (cancelled) return;

        setMetrics({
          ...initialMetrics,
          usuarios,
          clubes,
          jugadores,
          pendientes,
          campeonatos: campeonatos.length,
        });
        setCampeonatoActivo(
          campeonatos.find((campeonato) => campeonato.estado === 'ACTIVO') ??
            null,
        );
        return;
      }

      if (roleName === 'PLANILLERO') {
        const [partidos, planillas, campeonatos] = await Promise.all([
          countOrZero(partidosApi.listar()),
          countOrZero(planillasApi.listar()),
          loadCampeonatos(),
        ]);

        if (cancelled) return;

        setMetrics({
          ...initialMetrics,
          partidos,
          planillas,
          campeonatos: campeonatos.length,
        });
        setCampeonatoActivo(
          campeonatos.find((campeonato) => campeonato.estado === 'ACTIVO') ??
            null,
        );
        return;
      }

      const [jugadores, pendientes, campeonatos] = await Promise.all([
        countOrZero(jugadoresApi.listar()),
        countOrZero(jugadoresApi.listarPendientes()),
        loadCampeonatos(),
      ]);

      if (cancelled) return;

      setMetrics({
        ...initialMetrics,
        jugadores,
        pendientes,
        campeonatos: campeonatos.length,
      });
      setCampeonatoActivo(
        campeonatos.find((campeonato) => campeonato.estado === 'ACTIVO') ??
          null,
      );
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isDelegado, loadingClubes, roleName, selectedClubId, user]);

  if (!user) {
    return <div className="p-6">Cargando usuario...</div>;
  }

  const fechasCampeonato =
    campeonatoActivo?.fecha_inicio || campeonatoActivo?.fecha_fin
      ? `${campeonatoActivo.fecha_inicio ?? '-'} - ${
          campeonatoActivo.fecha_fin ?? '-'
        }`
      : '-';
  const cardClubTitle = isDelegado ? 'Club asignado' : 'Clubes';
  const clubValue = loadingClubes
    ? 'Cargando...'
    : selectedClubName || 'Sin club asignado';
  const cardClubValue = isDelegado
    ? clubValue
    : metrics.clubes;
  const cards =
    roleName === 'DELEGADO'
      ? [
          {
            title: cardClubTitle,
            value: cardClubValue,
            tone: 'green' as const,
            icon: 'C',
          },
          {
            title: 'Jugadores',
            value: metrics.jugadores,
            tone: 'slate' as const,
            icon: 'J',
          },
          {
            title: 'Activos',
            value: metrics.activos,
            tone: 'blue' as const,
            icon: 'A',
          },
          {
            title: 'Inscripciones',
            value: metrics.inscripciones,
            tone: 'red' as const,
            icon: 'I',
          },
          {
            title: 'Pendientes',
            value: metrics.pendientes,
            tone: 'amber' as const,
            icon: 'P',
          },
        ]
      : roleName === 'PLANILLERO'
        ? [
            {
              title: 'Partidos',
              value: metrics.partidos,
              tone: 'blue' as const,
              icon: 'P',
            },
            {
              title: 'Planillas',
              value: metrics.planillas,
              tone: 'green' as const,
              icon: 'L',
            },
            {
              title: 'Estadisticas',
              value: metrics.estadisticas,
              tone: 'slate' as const,
              icon: 'E',
            },
            {
              title: 'Campeonatos',
              value: metrics.campeonatos,
              tone: 'red' as const,
              icon: 'T',
            },
          ]
        : roleName === 'ADMINISTRADOR'
          ? [
              {
                title: 'Usuarios',
                value: metrics.usuarios,
                tone: 'blue' as const,
                icon: 'U',
              },
              {
                title: 'Clubes',
                value: metrics.clubes,
                tone: 'green' as const,
                icon: 'C',
              },
              {
                title: 'Jugadores',
                value: metrics.jugadores,
                tone: 'slate' as const,
                icon: 'J',
              },
              {
                title: 'Pendientes',
                value: metrics.pendientes,
                tone: 'amber' as const,
                icon: 'P',
              },
              {
                title: 'Campeonatos',
                value: metrics.campeonatos,
                tone: 'red' as const,
                icon: 'T',
              },
            ]
          : [
              {
                title: 'Jugadores',
                value: metrics.jugadores,
                tone: 'slate' as const,
                icon: 'J',
              },
              {
                title: 'Pendientes',
                value: metrics.pendientes,
                tone: 'amber' as const,
                icon: 'P',
              },
              {
                title: 'Campeonatos',
                value: metrics.campeonatos,
                tone: 'red' as const,
                icon: 'T',
              },
            ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema y estado operativo de SigSports."
      />

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <CardStat
            key={card.title}
            title={card.title}
            value={card.value}
            tone={card.tone}
            icon={card.icon}
          />
        ))}
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <article className="min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          {campeonatoActivo ? (
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-950">
                    Jornadas Deportivas Sígsig 2026
                  </h2>
                  <StatusBadge
                    active
                    activeLabel="EN CURSO"
                    tone="amber"
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-amber-900">
                  {fechasCampeonato}
                </p>
                <p className="mt-1 text-sm text-amber-900/80">
                  {campeonatoActivo.nombre_campeonato}
                </p>
              </div>

              <Link
                to="/campeonatos"
                className="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ver detalle →
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Jornadas Deportivas Sígsig 2026
              </h2>
              <p className="mt-2 text-sm font-medium text-amber-900">
                No hay campeonato activo.
              </p>
            </div>
          )}
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Sesión actual</p>
          <h2 className="mt-2 truncate text-lg font-bold text-slate-950">
            {user.nombre_completo || 'Usuario autenticado'}
          </h2>
          <p className="mt-3 truncate text-sm text-slate-600">
            {user.correo_electronico}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {user.rol?.nombre_rol || 'Sin rol asignado'}
          </p>
        </article>
      </section>
    </div>
  );
}
