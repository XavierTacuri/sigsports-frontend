export const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

type PartidoDeporteLike = {
  competencia?: {
    deporte?: {
      nombre_deporte?: string | null;
    } | null;
    nombre_deporte?: string | null;
    deporte_nombre?: string | null;
    nombre_competencia?: string | null;
  } | null;
  nombre_deporte?: string | null;
  deporte_nombre?: string | null;
  nombre_competencia?: string | null;
};

export const getDeporteNombreFromPartido = (
  partido?: PartidoDeporteLike | null,
) => {
  if (!partido) return '';

  return (
    partido?.competencia?.deporte?.nombre_deporte ??
    partido?.competencia?.nombre_deporte ??
    partido?.competencia?.deporte_nombre ??
    partido?.nombre_deporte ??
    partido?.deporte_nombre ??
    partido?.competencia?.nombre_competencia ??
    partido?.nombre_competencia ??
    ''
  );
};

export const isFutbolOIndor = (partido?: PartidoDeporteLike | null) => {
  const deporte = normalizeText(getDeporteNombreFromPartido(partido));
  return deporte.includes('FUTBOL') || deporte.includes('INDOR');
};

export const isSoloMarcador = (partido?: PartidoDeporteLike | null) => {
  if (!partido) return false;
  return !isFutbolOIndor(partido);
};
