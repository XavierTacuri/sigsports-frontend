import api from './axiosConfig';

export type ReporteTipo =
  | 'jugadores'
  | 'inscripciones'
  | 'partidos'
  | 'sanciones'
  | 'tabla-posiciones'
  | 'planillas'
  | 'estadisticas';

export type ReporteFiltros = Record<string, string>;

export type ReporteResponse = unknown;

const endpointByTipo: Record<ReporteTipo, string> = {
  jugadores: '/reportes/jugadores',
  inscripciones: '/reportes/inscripciones',
  partidos: '/reportes/partidos',
  sanciones: '/reportes/sanciones',
  'tabla-posiciones': '/reportes/tabla-posiciones',
  planillas: '/reportes/planillas',
  estadisticas: '/reportes/estadisticas',
};

const cleanFiltros = (filtros: ReporteFiltros) =>
  Object.fromEntries(
    Object.entries(filtros).filter(([, value]) => {
      return (
        value !== '' &&
        value !== null &&
        value !== undefined &&
        value !== 'Todos'
      );
    }),
  );

export const generarReporte = async (
  tipo: ReporteTipo,
  filtros: ReporteFiltros,
) => {
  const cleanParams = cleanFiltros(filtros);
  console.log('Filtros enviados a reporte:', cleanParams);

  const response = await api.get<ReporteResponse>(endpointByTipo[tipo], {
    params: cleanParams,
  });

  return response.data;
};

export const reportesApi = {
  generar: generarReporte,
};
