import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { competenciasApi } from '../../api/competenciasApi';
import { gruposApi } from '../../api/gruposApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { Competencia, Grupo } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { GoleadoresSection } from './GoleadoresSection';
import { SancionesEstadisticasSection } from './SancionesEstadisticasSection';
import { TablaPosicionesSection } from './TablaPosicionesSection';

export type EstadisticasTab = 'tabla' | 'goleadores' | 'sanciones';

export function EstadisticasPage({
  initialTab = 'tabla',
}: {
  initialTab?: EstadisticasTab;
}) {
  const { user } = useAuth();
  const roleName = getRoleName(user);
  const canViewStats = [
    'ADMINISTRADOR',
    'SECRETARIA',
    'PLANILLERO',
    'DELEGADO',
  ].includes(roleName);
  const [tab, setTab] = useState<EstadisticasTab>(initialTab);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [competenciaId, setCompetenciaId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !canViewStats) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setError('');
        setIsLoading(true);
        setCompetencias(await competenciasApi.listar());
      } catch (requestError) {
        setError(
          axios.isAxiosError(requestError) &&
            requestError.response?.status === 403
            ? 'No se pudieron cargar los datos.'
            : getApiErrorMessage(
                requestError,
                'No se pudieron cargar los datos.',
              ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [canViewStats, user]);

  const selectedCompetencia = useMemo(
    () =>
      competencias.find(
        (item) => item.id_competencia === Number(competenciaId),
      ),
    [competenciaId, competencias],
  );
  const hasGroups = grupos.length > 0;

  const selectCompetition = async (value: string) => {
    setCompetenciaId(value);
    setGrupoId('');
    setGrupos([]);
    setError('');

    if (!value) return;

    try {
      setIsLoadingGroups(true);
      setGrupos(await gruposApi.listarPorCompetencia(Number(value)));
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError) && requestError.response?.status === 403
          ? 'No se pudieron cargar los datos.'
          : getApiErrorMessage(requestError, 'No se pudieron cargar los grupos.'),
      );
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const tabs = [
    { id: 'tabla' as const, label: 'Tabla de posiciones' },
    { id: 'goleadores' as const, label: 'Goleadores' },
    { id: 'sanciones' as const, label: 'Sanciones' },
  ];

  if (!user) {
    return <p className="text-sm text-slate-600">Cargando usuario...</p>;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!canViewStats) {
    return <ErrorMessage message="No tienes permisos." />;
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Estadísticas deportivas"
        description="Consulta resultados calculados por el backend a partir de planillas finalizadas."
      />

      {error ? <ErrorMessage message={error} /> : null}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <FormSelect
          label="Competencia"
          value={competenciaId}
          options={competencias.map((item) => ({
            value: String(item.id_competencia),
            label: item.nombre_competencia,
          }))}
          onChange={(event) => void selectCompetition(event.target.value)}
        />

        {competenciaId && hasGroups ? (
          <FormSelect
            label={isLoadingGroups ? 'Cargando grupos...' : 'Grupo'}
            value={grupoId}
            disabled={isLoadingGroups}
            options={grupos.map((item) => ({
              value: String(item.id_grupo),
              label: item.nombre_grupo,
            }))}
            onChange={(event) => setGrupoId(event.target.value)}
          />
        ) : null}
      </section>

      {!competenciaId ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
          Selecciona una competencia para ver estadísticas.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {tab === 'tabla' ? (
              <TablaPosicionesSection
                competenciaId={Number(competenciaId)}
                grupoId={grupoId ? Number(grupoId) : undefined}
                hasGroups={hasGroups}
              />
            ) : null}
            {tab === 'goleadores' ? (
              <GoleadoresSection competenciaId={Number(competenciaId)} />
            ) : null}
            {tab === 'sanciones' ? (
              <SancionesEstadisticasSection
                competenciaId={Number(competenciaId)}
                competenciaNombre={
                  selectedCompetencia?.nombre_competencia ?? 'Competencia'
                }
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
