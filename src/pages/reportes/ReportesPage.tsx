import { useEffect, useMemo, useState } from 'react';
import { clubesApi } from '../../api/clubesApi';
import { reportesApi, type ReporteFiltros, type ReporteTipo } from '../../api/reportesApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { FormInput } from '../../components/ui/FormInput';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type { Club } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';

type ReporteConfig = {
  tipo: ReporteTipo;
  label: string;
  endpoint: string;
  roles: string[];
  fields: FilterField[];
  columns: ReportColumn[];
};

type FilterField = {
  name: keyof ReporteFiltros;
  label: string;
  type: 'text' | 'date' | 'select';
  options?: { value: string; label: string }[];
  delegadoHidden?: boolean;
};

type ReportColumn = {
  key: string;
  header: string;
  accessors: string[];
};

type ReporteNormalizado = {
  titulo: string;
  fecha_generacion: string;
  filtros: Record<string, unknown>;
  registros: Record<string, unknown>[];
};

const roleReportes: Record<string, ReporteTipo[]> = {
  ADMINISTRADOR: [
    'jugadores',
    'inscripciones',
    'partidos',
    'sanciones',
    'tabla-posiciones',
    'planillas',
    'estadisticas',
  ],
  SECRETARIA: [
    'jugadores',
    'inscripciones',
    'sanciones',
    'partidos',
    'tabla-posiciones',
    'estadisticas',
  ],
  DELEGADO: [
    'jugadores',
    'inscripciones',
    'partidos',
    'sanciones',
    'tabla-posiciones',
    'estadisticas',
  ],
  PLANILLERO: ['partidos', 'planillas', 'tabla-posiciones', 'estadisticas'],
};

const commonFields: FilterField[] = [
  { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
  { name: 'fecha_desde', label: 'Fecha desde', type: 'date' },
  { name: 'fecha_hasta', label: 'Fecha hasta', type: 'date' },
  { name: 'busqueda', label: 'Buscar', type: 'text' },
];

const estadoJugadorOptions = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'PENDIENTE', label: 'PENDIENTE' },
  { value: 'OBSERVADO', label: 'OBSERVADO' },
  { value: 'RECHAZADO', label: 'RECHAZADO' },
];

const estadoPartidoOptions = [
  { value: 'PROGRAMADO', label: 'PROGRAMADO' },
  { value: 'EN_CURSO', label: 'EN CURSO' },
  { value: 'FINALIZADO', label: 'FINALIZADO' },
  { value: 'SUSPENDIDO', label: 'SUSPENDIDO' },
];

const estadoInscripcionOptions = [
  { value: 'ACTIVA', label: 'ACTIVA' },
  { value: 'INACTIVA', label: 'INACTIVA' },
  { value: 'RETIRADA', label: 'RETIRADA' },
  { value: 'SUSPENDIDA', label: 'SUSPENDIDA' },
];

const reportes: ReporteConfig[] = [
  {
    tipo: 'jugadores',
    label: 'Jugadores',
    endpoint: '/reportes/jugadores',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'],
    fields: [
      { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoJugadorOptions },
      { name: 'genero', label: 'Genero', type: 'text' },
      { name: 'busqueda', label: 'Buscar', type: 'text' },
    ],
    columns: [
      { key: 'cedula', header: 'Cedula', accessors: ['cedula', 'cedula_jugador', 'jugador.cedula'] },
      { key: 'nombre', header: 'Nombre completo', accessors: ['nombre_completo', 'nombre_jugador', 'jugador'] },
      { key: 'club', header: 'Club', accessors: ['club.nombre_club', 'club', 'nombre_club', 'club_nombre'] },
      { key: 'fecha_nacimiento', header: 'Fecha nacimiento', accessors: ['fecha_nacimiento', 'jugador.fecha_nacimiento'] },
      { key: 'genero', header: 'Genero', accessors: ['genero'] },
      { key: 'estado', header: 'Estado', accessors: ['estado_jugador', 'estado'] },
    ],
  },
  {
    tipo: 'inscripciones',
    label: 'Inscripciones',
    endpoint: '/reportes/inscripciones',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'],
    fields: [
      { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
      { name: 'competencia', label: 'Competencia', type: 'text' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoInscripcionOptions },
      { name: 'busqueda', label: 'Buscar', type: 'text' },
    ],
    columns: [
      { key: 'competencia', header: 'Competencia', accessors: ['competencia.nombre_competencia', 'competencia', 'nombre_competencia', 'competencia_nombre'] },
      { key: 'club', header: 'Club', accessors: ['club.nombre_club', 'club', 'nombre_club', 'club_nombre'] },
      { key: 'jugador', header: 'Jugador', accessors: ['jugador', 'nombre_jugador', 'nombre_completo'] },
      { key: 'cedula', header: 'Cedula', accessors: ['cedula', 'cedula_jugador', 'jugador.cedula'] },
      { key: 'camiseta', header: 'Numero camiseta', accessors: ['numero_camiseta'] },
      { key: 'anio', header: 'Anio', accessors: ['anio_participacion', 'anio'] },
      { key: 'estado', header: 'Estado', accessors: ['estado_inscripcion', 'estado'] },
    ],
  },
  {
    tipo: 'partidos',
    label: 'Partidos',
    endpoint: '/reportes/partidos',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO', 'PLANILLERO'],
    fields: [
      { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
      { name: 'competencia', label: 'Competencia', type: 'text' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoPartidoOptions },
      ...commonFields.filter((field) => field.name !== 'id_club'),
    ],
    columns: [
      { key: 'partido', header: 'Partido', accessors: ['partido', 'descripcion_partido', 'nombre_partido'] },
      { key: 'competencia', header: 'Competencia', accessors: ['competencia.nombre_competencia', 'competencia', 'nombre_competencia'] },
      { key: 'fecha', header: 'Fecha', accessors: ['fecha_partido', 'fecha', 'programado_para'] },
      { key: 'hora', header: 'Hora', accessors: ['hora_partido', 'hora'] },
      { key: 'escenario', header: 'Escenario', accessors: ['escenario.nombre_escenario', 'escenario', 'nombre_escenario'] },
      { key: 'estado', header: 'Estado', accessors: ['estado_partido', 'estado'] },
      { key: 'resultado', header: 'Resultado', accessors: ['resultado', 'marcador'] },
    ],
  },
  {
    tipo: 'sanciones',
    label: 'Sanciones',
    endpoint: '/reportes/sanciones',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO'],
    fields: [
      { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
      { name: 'tipo', label: 'Tipo', type: 'text' },
      ...commonFields.filter((field) => field.name !== 'id_club'),
    ],
    columns: [
      { key: 'jugador', header: 'Jugador', accessors: ['jugador', 'nombre_jugador', 'nombre_completo'] },
      { key: 'cedula', header: 'Cedula', accessors: ['cedula', 'cedula_jugador', 'jugador.cedula'] },
      { key: 'club', header: 'Club', accessors: ['club.nombre_club', 'club', 'nombre_club'] },
      { key: 'competencia', header: 'Competencia', accessors: ['competencia.nombre_competencia', 'competencia', 'nombre_competencia'] },
      { key: 'tipo', header: 'Tipo', accessors: ['tipo_sancion', 'tipo'] },
      { key: 'suspension', header: 'Suspension', accessors: ['partidos_suspension', 'suspension', 'fechas_suspension'] },
      { key: 'estado', header: 'Estado', accessors: ['estado_sancion', 'estado'] },
    ],
  },
  {
    tipo: 'tabla-posiciones',
    label: 'Tabla de posiciones',
    endpoint: '/reportes/tabla-posiciones',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO', 'PLANILLERO'],
    fields: [
      { name: 'competencia', label: 'Competencia', type: 'text' },
      { name: 'grupo', label: 'Grupo', type: 'text' },
    ],
    columns: [
      { key: 'posicion', header: 'Posicion', accessors: ['posicion', 'puesto'] },
      { key: 'club', header: 'Club', accessors: ['club.nombre_club', 'club', 'nombre_club'] },
      { key: 'pj', header: 'PJ', accessors: ['partidos_jugados', 'pj'] },
      { key: 'pg', header: 'PG', accessors: ['partidos_ganados', 'pg'] },
      { key: 'pe', header: 'PE', accessors: ['partidos_empatados', 'pe'] },
      { key: 'pp', header: 'PP', accessors: ['partidos_perdidos', 'pp'] },
      { key: 'gf', header: 'GF', accessors: ['goles_favor', 'gf'] },
      { key: 'gc', header: 'GC', accessors: ['goles_contra', 'gc'] },
      { key: 'dg', header: 'DG', accessors: ['diferencia_goles', 'dg'] },
      { key: 'pts', header: 'PTS', accessors: ['puntos', 'pts'] },
    ],
  },
  {
    tipo: 'planillas',
    label: 'Planillas',
    endpoint: '/reportes/planillas',
    roles: ['ADMINISTRADOR', 'PLANILLERO'],
    fields: [
      { name: 'competencia', label: 'Competencia', type: 'text' },
      { name: 'estado', label: 'Estado', type: 'text' },
      ...commonFields.filter((field) => field.name !== 'id_club'),
    ],
    columns: [
      { key: 'partido', header: 'Partido', accessors: ['partido', 'descripcion_partido'] },
      { key: 'fecha', header: 'Fecha', accessors: ['fecha_partido', 'fecha'] },
      { key: 'estado', header: 'Estado', accessors: ['estado_planilla', 'estado'] },
      { key: 'marcador', header: 'Marcador', accessors: ['marcador', 'resultado'] },
      { key: 'responsable', header: 'Responsable', accessors: ['responsable', 'planillero'] },
    ],
  },
  {
    tipo: 'estadisticas',
    label: 'Estadisticas',
    endpoint: '/reportes/estadisticas',
    roles: ['ADMINISTRADOR', 'SECRETARIA', 'DELEGADO', 'PLANILLERO'],
    fields: [
      { name: 'competencia', label: 'Competencia', type: 'text' },
      { name: 'id_club', label: 'Club', type: 'select', delegadoHidden: true },
      { name: 'busqueda', label: 'Buscar', type: 'text' },
    ],
    columns: [
      { key: 'jugador', header: 'Jugador / Club', accessors: ['nombre_jugador', 'nombre_club', 'nombre', 'jugador', 'club'] },
      { key: 'competencia', header: 'Competencia', accessors: ['nombre_competencia', 'competencia'] },
      { key: 'metricas', header: 'Metricas', accessors: ['metrica', 'tipo', 'descripcion'] },
      { key: 'valor', header: 'Valor', accessors: ['valor', 'total', 'cantidad'] },
      { key: 'periodo', header: 'Periodo', accessors: ['periodo', 'anio'] },
    ],
  },
];

const initialFilters: ReporteFiltros = {
  id_club: '',
  competencia: '',
  estado: '',
  genero: '',
  tipo: '',
  grupo: '',
  fecha_desde: '',
  fecha_hasta: '',
  busqueda: '',
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return String(
      objectValue.nombre ??
        objectValue.nombre_club ??
        objectValue.nombre_completo ??
        objectValue.nombre_competencia ??
        JSON.stringify(value),
    );
  }

  return String(value);
};

const getNestedValue = (item: Record<string, unknown>, accessor: string) =>
  accessor.split('.').reduce<unknown>((current, key) => {
    if (
      current &&
      typeof current === 'object' &&
      key in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, item);

const getValue = (item: Record<string, unknown>, accessors: string[]) => {
  for (const accessor of accessors) {
    const value = accessor.includes('.')
      ? getNestedValue(item, accessor)
      : item[accessor];

    if (value !== null && value !== undefined && value !== '') {
      return formatValue(value);
    }
  }

  return '-';
};

const normalizeReporteResponse = (response: unknown): ReporteNormalizado => {
  const today = new Date().toISOString().slice(0, 10);

  if (Array.isArray(response)) {
    return {
      titulo: 'Reporte',
      fecha_generacion: today,
      filtros: {},
      registros: response as Record<string, unknown>[],
    };
  }

  if (!response || typeof response !== 'object') {
    return {
      titulo: 'Reporte',
      fecha_generacion: today,
      filtros: {},
      registros: [],
    };
  }

  const objectResponse = response as Record<string, unknown>;

  if (Array.isArray(objectResponse.registros)) {
    return {
      titulo: String(objectResponse.titulo ?? 'Reporte'),
      fecha_generacion: String(objectResponse.fecha_generacion ?? today),
      filtros: (objectResponse.filtros as Record<string, unknown>) ?? {},
      registros: objectResponse.registros as Record<string, unknown>[],
    };
  }

  if (Array.isArray(objectResponse.data)) {
    return {
      titulo: String(objectResponse.titulo ?? 'Reporte'),
      fecha_generacion: String(objectResponse.fecha_generacion ?? today),
      filtros: (objectResponse.filtros as Record<string, unknown>) ?? {},
      registros: objectResponse.data as Record<string, unknown>[],
    };
  }

  if (Array.isArray(objectResponse.items)) {
    return {
      titulo: String(objectResponse.titulo ?? 'Reporte'),
      fecha_generacion: String(objectResponse.fecha_generacion ?? today),
      filtros: (objectResponse.filtros as Record<string, unknown>) ?? {},
      registros: objectResponse.items as Record<string, unknown>[],
    };
  }

  return {
    titulo: String(objectResponse.titulo ?? 'Reporte'),
    fecha_generacion: String(objectResponse.fecha_generacion ?? today),
    filtros: (objectResponse.filtros as Record<string, unknown>) ?? {},
    registros: [],
  };
};

const getAppliedFilters = (config: ReporteConfig, filters: ReporteFiltros) =>
  config.fields
    .map((field) => ({
      label: field.label,
      value: filters[field.name] ?? '',
    }))
    .filter((filter) => filter.value !== '');

export function ReportesPage() {
  const { user, isLoading } = useAuth();
  const role = getRoleName(user);
  const isDelegado = role === 'DELEGADO';
  const allowedTypes = roleReportes[role] ?? [];
  const availableReports = reportes.filter((reporte) =>
    allowedTypes.includes(reporte.tipo),
  );
  const {
    selectedClubId,
    selectedClubName,
    loadingClubes: loadingDelegadoClubes,
    errorClubes,
  } = useDelegadoClubes(user ?? null, isDelegado);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<ReporteTipo>(
    availableReports[0]?.tipo ?? 'jugadores',
  );
  const [filters, setFilters] = useState<ReporteFiltros>(initialFilters);
  const [reporte, setReporte] = useState<ReporteNormalizado | null>(null);
  const [registros, setRegistros] = useState<Record<string, unknown>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selectedReport =
    availableReports.find((reporte) => reporte.tipo === selectedTipo) ??
    availableReports[0];
  const visibleFields = useMemo(
    () =>
      selectedReport?.fields.filter(
        (field) => !(role === 'DELEGADO' && field.delegadoHidden),
      ) ?? [],
    [role, selectedReport],
  );
  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(
    () =>
      selectedReport?.columns.map((column) => ({
        key: column.key,
        header: column.header,
        render: (item) => getValue(item, column.accessors),
      })) ?? [],
    [selectedReport],
  );
  const totalRegistros = registros.length;
  const totalPages = Math.max(1, Math.ceil(totalRegistros / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRegistros);
  const registrosPaginados = registros.slice(startIndex, endIndex);

  useEffect(() => {
    if (isDelegado) {
      return;
    }

    let active = true;

    clubesApi
      .listar()
      .then((data) => {
        if (!active) return;

        const clubesData = Array.isArray(data)
          ? data
          : ((data as { items?: Club[]; data?: Club[] }).items ??
            (data as { items?: Club[]; data?: Club[] }).data ??
            []);

        setClubes(
          clubesData.filter(
            (club) => String(club.estado ?? '').toUpperCase() === 'ACTIVO',
          ),
        );
      })
      .catch(() => {
        if (active) {
          setClubes([]);
        }
      });

    return () => {
      active = false;
    };
  }, [isDelegado]);

  useEffect(() => {
    if (!isDelegado || !selectedClubId) return;

    setFilters((current) => ({
      ...current,
      id_club: String(selectedClubId),
    }));
    setCurrentPage(1);
  }, [isDelegado, selectedClubId]);

  const getEffectiveFilters = () => ({
    ...filters,
    id_club:
      isDelegado && selectedClubId
        ? String(selectedClubId)
        : (filters.id_club ?? ''),
  });

  const handleGenerate = async () => {
    if (!selectedReport) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await reportesApi.generar(
        selectedReport.tipo,
        getEffectiveFilters(),
      );
      console.log('Reporte generado:', response);

      const reporteNormalizado = normalizeReporteResponse(response);
      setReporte(reporteNormalizado);
      setRegistros(reporteNormalizado.registros ?? []);
      setCurrentPage(1);
    } catch (requestError) {
      console.error('Error generando reporte:', requestError);
      setReporte(null);
      setRegistros([]);
      setError(getApiErrorMessage(requestError, 'No se pudo generar el reporte.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setFilters({
      ...initialFilters,
      id_club:
        isDelegado && selectedClubId
          ? String(selectedClubId)
          : '',
    });
    setReporte(null);
    setRegistros([]);
    setCurrentPage(1);
    setError('');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !user || (isDelegado && loadingDelegadoClubes)) {
    return <p>Cargando usuario...</p>;
  }

  if (!selectedReport) {
    return <ErrorMessage message="No tienes reportes disponibles para tu rol." />;
  }

  const effectiveFilters = getEffectiveFilters();
  const appliedFilters = getAppliedFilters(selectedReport, effectiveFilters).map(
    (filter) =>
      filter.label === 'Club'
        ? {
            ...filter,
            value:
              selectedClubName ||
              clubes.find(
                (club) => String(club.id_club) === String(filter.value),
              )?.nombre_club ||
              filter.value,
          }
        : filter,
  );

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="no-print">
        <PageHeader
          title="Reportes"
          description="Genera reportes para imprimir o exportar."
        />
      </div>

      <section className="no-print rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Tipo de reporte"
            value={selectedReport.tipo}
            allLabel="Selecciona"
            options={availableReports.map((reporte) => ({
              value: reporte.tipo,
              label: reporte.label,
            }))}
            onChange={(event) => {
              setSelectedTipo(event.target.value as ReporteTipo);
              setReporte(null);
              setRegistros([]);
              setCurrentPage(1);
              setError('');
            }}
          />
          {isDelegado ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Club asignado:</span>{' '}
              {selectedClubName || 'Sin club asignado'}
            </div>
          ) : null}
          {visibleFields.map((field) =>
            field.name === 'id_club' ? (
              <FilterSelect
                key={field.name}
                label={field.label}
                value={filters.id_club ?? ''}
                allLabel="Todos los clubes"
                options={clubes.map((club) => ({
                  value: String(club.id_club),
                  label: club.nombre_club,
                }))}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    id_club: event.target.value,
                  }));
                  setCurrentPage(1);
                }}
              />
            ) : field.type === 'select' ? (
              <FilterSelect
                key={field.name}
                label={field.label}
                value={filters[field.name] ?? ''}
                options={field.options ?? []}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }));
                  setCurrentPage(1);
                }}
              />
            ) : (
              <FormInput
                key={field.name}
                label={field.label}
                type={field.type}
                value={filters[field.name] ?? ''}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }));
                  setCurrentPage(1);
                }}
              />
            ),
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" disabled={isGenerating} onClick={() => void handleGenerate()}>
            {isGenerating ? 'Generando...' : 'Generar'}
          </Button>
          <button
            type="button"
            disabled={!reporte || registros.length === 0}
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
          >
            Limpiar
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Endpoint: {selectedReport.endpoint}
        </p>
      </section>

      {error ? (
        <div className="no-print">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      <ReportPrintLayout
        title={reporte?.titulo ?? selectedReport.label}
        generatedAt={reporte?.fecha_generacion}
        filters={appliedFilters}
        columns={selectedReport.columns}
        rows={registros}
      />

      <div className="no-print">
        {isGenerating ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Generando reporte...
          </p>
        ) : error ? null : !reporte ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Selecciona filtros y genera un reporte para ver la vista previa.
          </p>
        ) : registros.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No hay registros para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <DataTable
              columns={columns}
              data={registrosPaginados}
              getKey={(item) =>
                String(
                  item.id ??
                    item.id_reporte ??
                    item.id_jugador ??
                    item.id_partido ??
                    item.id_inscripcion ??
                    registros.indexOf(item),
                )
              }
              emptyMessage="No hay resultados para este reporte."
            />
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="font-medium text-slate-700">Registros</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 sm:w-auto"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  Mostrando {totalRegistros === 0 ? 0 : startIndex + 1}-
                  {endIndex} de {totalRegistros} registros
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <span className="text-center font-medium text-slate-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReportPrintLayoutProps {
  title: string;
  generatedAt?: string;
  filters: { label: string; value: string }[];
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

function ReportPrintLayout({
  title,
  generatedAt,
  filters,
  columns,
  rows,
}: ReportPrintLayoutProps) {
  const formattedGeneratedAt = generatedAt ?? new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <section className="print-area hidden bg-white p-6 print:block">
      <header className="mb-6 border-b border-slate-300 pb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          SigSports
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fecha de generación: {formattedGeneratedAt}
        </p>
      </header>

      <div className="mb-5">
        <h3 className="text-sm font-bold text-slate-900">Filtros aplicados</h3>
        {filters.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
            {filters.map((filter) => (
              <p key={filter.label}>
                <span className="font-semibold">{filter.label}:</span>{' '}
                {filter.value}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Sin filtros aplicados.</p>
        )}
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border border-slate-300 bg-slate-100 px-2 py-2">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column.key} className="border border-slate-300 px-2 py-2">
                    {getValue(row, column.accessors)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="border border-slate-300 px-2 py-3 text-center" colSpan={columns.length}>
                No hay resultados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <footer className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-500">
        Reporte generado desde SigSports.
      </footer>
    </section>
  );
}
