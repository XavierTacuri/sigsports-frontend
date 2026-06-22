import { useEffect, useMemo, useState } from 'react';
import { clubesApi } from '../../api/clubesApi';
import { competenciasApi } from '../../api/competenciasApi';
import { deportesApi } from '../../api/deportesApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import type { Club, Competencia, Deporte } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { FasesCompetenciaSection } from './FasesCompetenciaSection';
import { GruposSection } from './GruposSection';
import { JornadasSection } from './JornadasSection';
import { PartidosSection } from './PartidosSection';
import { ProgramacionEventoSection } from './ProgramacionEventoSection';
import { Link } from 'react-router-dom';

type Tab = 'fases' | 'grupos' | 'jornadas' | 'partidos';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const getDeporteNombre = (
  competencia: (Competencia & {
    deporte?: { nombre_deporte?: string };
    nombre_deporte?: string;
    deporte_nombre?: string;
  }) | undefined,
) =>
  competencia?.deporte?.nombre_deporte ??
  competencia?.nombre_deporte ??
  competencia?.deporte_nombre ??
  competencia?.nombre_competencia ??
  '';

const isSinGruposSport = (value: string) => {
  const deporteNombre = normalizeText(value);

  return (
    deporteNombre.includes('CICLISMO') ||
    deporteNombre.includes('ATLETISMO') ||
    deporteNombre.includes('AJEDREZ') ||
    deporteNombre.includes('AJEDRES')
  );
};

const isConGruposSport = (value: string) => {
  const deporteNombre = normalizeText(value);

  return (
    deporteNombre.includes('FUTBOL') ||
    deporteNombre.includes('INDOR') ||
    deporteNombre.includes('BASQUET') ||
    deporteNombre.includes('VOLEY') ||
    deporteNombre.includes('TENIS DE MESA')
  );
};

export function CalendarioPage() {
  const { user } = useAuth();
  const role = user?.rol?.nombre_rol ?? '';
  const canRead = ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'].includes(role);
  const canManage = role === 'ADMINISTRADOR';
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [visibleClubIds, setVisibleClubIds] = useState<Set<number> | undefined>();
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState<Tab>('fases');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !canRead) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        setError('');
        const [competitionData, clubData, sportData] = await Promise.all([
          competenciasApi.listar(),
          clubesApi.listar(),
          deportesApi.listar(),
        ]);
        setCompetencias(competitionData);
        setClubes(clubData);
        setDeportes(sportData);
        if (role === 'DELEGADO') {
          const links = await usuariosClubesApi.listarPorUsuario(user.id_usuario);
          setVisibleClubIds(new Set(links.map((item) => item.id_club)));
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'No se pudo cargar la administración del calendario.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [canRead, role, user]);

  const selectedCompetition = competencias.find(
    (item) => item.id_competencia === Number(selectedId),
  );
  const sportName = useMemo(() => {
    const sport = deportes.find(
      (item) => item.id_deporte === selectedCompetition?.id_deporte,
    );
    return sport?.nombre_deporte ?? getDeporteNombre(selectedCompetition);
  }, [deportes, selectedCompetition]);
  const isSinGrupos = isSinGruposSport(sportName);
  const isConGrupos = isConGruposSport(sportName);
  const handlesGroups = isConGrupos || !isSinGrupos;

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }
  if (!canRead) {
    return <ErrorMessage message="No tienes permisos." />;
  }

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'fases', label: 'Fases', visible: true },
    { id: 'grupos', label: 'Grupos', visible: true },
    { id: 'jornadas', label: 'Jornadas', visible: true },
    { id: 'partidos', label: 'Partidos', visible: true },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Calendario deportivo"
        description="Administra fases, grupos, jornadas, escenarios y partidos."
      />
      {error ? <ErrorMessage message={error} /> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <FormSelect
          label="Seleccionar competencia"
          value={selectedId}
          options={competencias.map((item) => ({
            value: String(item.id_competencia),
            label: item.nombre_competencia,
          }))}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setTab('fases');
          }}
        />
        {selectedCompetition ? (
          <p className="mt-2 text-xs text-slate-500">
            Deporte: {sportName || `Deporte ${selectedCompetition.id_deporte}`}
          </p>
        ) : null}
      </section>

      {!selectedId ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          Selecciona una competencia para administrar el calendario.
        </p>
      ) : (
        <>
          {handlesGroups ? (
            <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {tabs
                .filter((item) => item.visible)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      tab === item.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {!handlesGroups ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <h2 className="text-lg font-bold text-blue-950">
                    Esta competencia se gestiona mediante eventos individuales.
                  </h2>
                  <p className="mt-1 text-sm text-blue-800">
                    No se crean fases, grupos ni partidos local vs visitante para
                    disciplinas individuales.
                  </p>
                  <Link
                    to="/eventos-individuales"
                    className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Ir a eventos individuales
                  </Link>
                </div>
                <ProgramacionEventoSection
                  competenciaId={Number(selectedId)}
                  canManage={canManage}
                />
              </div>
            ) : null}
            {handlesGroups && tab === 'fases' ? (
              <FasesCompetenciaSection
                competenciaId={Number(selectedId)}
                canManage={canManage}
              />
            ) : null}
            {handlesGroups && tab === 'grupos' ? (
                <GruposSection
                  competenciaId={Number(selectedId)}
                  clubes={clubes}
                  canManage={canManage}
                />
            ) : null}
            {handlesGroups && tab === 'jornadas' ? (
              <JornadasSection
                competenciaId={Number(selectedId)}
                canManage={canManage}
              />
            ) : null}
            {handlesGroups && tab === 'partidos' ? (
              <PartidosSection
                competenciaId={Number(selectedId)}
                clubes={clubes}
                canManage={canManage}
                visibleClubIds={visibleClubIds}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
