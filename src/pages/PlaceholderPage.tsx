import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/usuarios': 'Usuarios',
  '/clubes': 'Clubes',
  '/deportes': 'Deportes',
  '/categorias': 'Categorías',
  '/campeonatos': 'Campeonatos',
  '/competencias': 'Competencias',
  '/jugadores': 'Jugadores',
  '/validaciones': 'Validaciones',
  '/pases': 'Pases',
  '/grupos': 'Grupos',
  '/partidos': 'Partidos',
  '/planillas': 'Planillas',
  '/sanciones': 'Sanciones',
  '/estadisticas': 'Estadísticas',
};

export function PlaceholderPage() {
  const location = useLocation();
  const title = useMemo(
    () => titles[location.pathname] ?? 'Módulo',
    [location.pathname],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
        Módulo
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Página base lista para implementar el CRUD correspondiente.
      </p>
    </section>
  );
}
