import { useEffect, useState } from 'react';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type { Club, Competencia } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { PartidosSection } from './PartidosSection';

export function PartidosPage() {
  const { user } = useAuth();
  const role = user?.rol?.nombre_rol ?? '';
  const isDelegado = role === 'DELEGADO';
  const canRead = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO', 'PLANILLERO'].includes(role);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [visibleClubIds, setVisibleClubIds] = useState<Set<number> | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectedClubId, loadingClubes } = useDelegadoClubes(
    user ?? null,
    isDelegado,
  );

  useEffect(() => {
    if (!user || !canRead || (isDelegado && loadingClubes)) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        setError('');
        const [competitionData, clubData] = await Promise.all([
          competenciasApi.listar(),
          clubesApi.listar(),
        ]);
        setCompetencias(competitionData);
        setClubes(clubData);
        if (isDelegado) {
          setVisibleClubIds(
            selectedClubId ? new Set([Number(selectedClubId)]) : new Set(),
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(requestError, 'No se pudo cargar el módulo de partidos.'),
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [canRead, isDelegado, loadingClubes, selectedClubId, user]);

  if (!user || isLoading || loadingClubes) {
    return <LoadingSpinner />;
  }
  if (!canRead) {
    return <ErrorMessage message="No tienes permisos." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={role === 'DELEGADO' ? 'Mis partidos' : 'Partidos'}
        description="Consulta y administra los partidos programados."
      />
      {error ? <ErrorMessage message={error} /> : null}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <FormSelect
          label="Competencia"
          value={selectedId}
          options={competencias.map((item) => ({
            value: String(item.id_competencia),
            label: item.nombre_competencia,
          }))}
          onChange={(event) => setSelectedId(event.target.value)}
        />
      </div>
      {selectedId ? (
        <PartidosSection
          competenciaId={Number(selectedId)}
          clubes={clubes}
          canManage={role === 'ADMINISTRADOR'}
          visibleClubIds={visibleClubIds}
        />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          Selecciona una competencia para consultar los partidos.
        </p>
      )}
    </div>
  );
}
