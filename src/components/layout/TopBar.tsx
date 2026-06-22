import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

export function TopBar() {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Panel administrativo
        </p>
        <p className="truncate text-sm font-semibold text-slate-950 sm:text-base">
          {user?.nombre_completo
            ? `Hola, ${user.nombre_completo}`
            : 'Hola, usuario'}
        </p>
      </div>

      <Button type="button" onClick={logout} className="shrink-0 px-3 py-2">
        Cerrar sesión
      </Button>
    </header>
  );
}
