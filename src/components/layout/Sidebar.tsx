import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/apiError';
import { getRoleName } from '../../utils/authRole';
import { FormInput } from '../ui/FormInput';
import { Modal } from '../ui/Modal';

type MenuItem = {
  label: string;
  path: string;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

const initialPasswordForm = {
  contrasena_actual: '',
  nueva_contrasena: '',
  confirmar_contrasena: '',
};

const adminMenuSections: MenuSection[] = [
  {
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      { label: 'Usuarios', path: '/usuarios' },
      { label: 'Clubes', path: '/clubes' },
      { label: 'Delegados por club', path: '/usuarios-clubes' },
    ],
  },
  {
    title: 'JUGADORES',
    items: [
      { label: 'Jugadores', path: '/jugadores' },
      { label: 'Validación de jugadores', path: '/validacion-jugadores' },
      { label: 'Inscripciones', path: '/inscripciones' },
      { label: 'Solicitudes de pases', path: '/pases' },
    ],
  },
  {
    title: 'CONFIGURACIÓN DEPORTIVA',
    items: [
      { label: 'Deportes', path: '/deportes' },
      { label: 'Categorías', path: '/categorias' },
      { label: 'Campeonatos', path: '/campeonatos' },
      { label: 'Competencias', path: '/competencias' },
    ],
  },
  {
    title: 'CALENDARIO',
    items: [
      { label: 'Calendario', path: '/calendario' },
      { label: 'Escenarios', path: '/escenarios' },
      { label: 'Partidos', path: '/partidos' },
      { label: 'Eventos individuales', path: '/eventos-individuales' },
    ],
  },
  {
    title: 'RESULTADOS',
    items: [
      { label: 'Planillas', path: '/planillas' },
      { label: 'Estadísticas', path: '/estadisticas' },
      { label: 'Reportes', path: '/reportes' },
      { label: 'Sanciones', path: '/sanciones' },
    ],
  },
];

const playerMenuByRole: Record<string, MenuItem[]> = {
  SECRETARIA: [
    { label: 'Jugadores', path: '/jugadores' },
    { label: 'Validación de jugadores', path: '/validacion-jugadores' },
    { label: 'Inscripciones', path: '/inscripciones' },
    { label: 'Inscribir jugador', path: '/inscripciones/nueva' },
    { label: 'Solicitudes de pases', path: '/pases' },
    { label: 'Calendario', path: '/calendario' },
    { label: 'Eventos individuales', path: '/eventos-individuales' },
    { label: 'Estadísticas', path: '/estadisticas' },
    { label: 'Reportes', path: '/reportes' },
  ],
  DELEGADO: [
    { label: 'Mis jugadores', path: '/jugadores' },
    { label: 'Mis inscripciones', path: '/inscripciones' },
    { label: 'Inscribir jugador', path: '/inscripciones/nueva' },
    { label: 'Mis solicitudes de pase', path: '/pases' },
    { label: 'Solicitar pase', path: '/pases/nueva' },
    { label: 'Mis partidos', path: '/partidos' },
    { label: 'Mis eventos individuales', path: '/eventos-individuales' },
    { label: 'Estadísticas', path: '/estadisticas' },
    { label: 'Reportes', path: '/reportes' },
  ],
  PLANILLERO: [
    { label: 'Partidos', path: '/partidos' },
    { label: 'Planillas', path: '/planillas' },
    { label: 'Eventos individuales', path: '/eventos-individuales' },
    { label: 'Estadísticas', path: '/estadisticas' },
    { label: 'Reportes', path: '/reportes' },
  ],
};

export function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const role = getRoleName(user);
  const menuSections =
    role === 'ADMINISTRADOR'
      ? adminMenuSections
      : [
          {
            items: [
              { label: 'Dashboard', path: '/dashboard' },
              ...(playerMenuByRole[role] ?? []),
            ],
          },
        ];

  const isActive = (path: string, exact = false) => {
    const [pathname] = path.split('?');

    if (exact) {
      return path.includes('?')
        ? `${location.pathname}${location.search}` === path
        : location.pathname === pathname && location.search === '';
    }

    return location.pathname.startsWith(pathname);
  };

  const isMenuItemActive = (path: string) => {
    if (path === '/dashboard') {
      return isActive('/dashboard', true);
    }

    if (path.includes('?')) {
      return isActive(path, true);
    }

    if (path === '/inscripciones') {
      return (
        isActive('/inscripciones', true) ||
        /^\/inscripciones\/\d+$/.test(location.pathname)
      );
    }

    if (path === '/inscripciones/nueva') {
      return isActive('/inscripciones/nueva', true);
    }

    if (path === '/jugadores') {
      return (
        isActive('/jugadores', true) ||
        /^\/jugadores\/\d+$/.test(location.pathname) ||
        /^\/jugadores\/\d+\/editar$/.test(location.pathname)
      );
    }

    if (path === '/jugadores/nuevo') {
      return isActive('/jugadores/nuevo', true);
    }

    if (path === '/pases') {
      return isActive('/pases', true) || /^\/pases\/\d+$/.test(location.pathname);
    }

    if (path === '/pases/nueva') {
      return isActive('/pases/nueva', true);
    }

    return isActive(path, true);
  };

  const openPasswordModal = () => {
    setPasswordForm(initialPasswordForm);
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (isSavingPassword) return;

    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPasswordForm(initialPasswordForm);
  };

  const validatePasswordForm = () => {
    if (
      !passwordForm.contrasena_actual ||
      !passwordForm.nueva_contrasena ||
      !passwordForm.confirmar_contrasena
    ) {
      return 'Todos los campos son obligatorios.';
    }

    if (passwordForm.nueva_contrasena.length < 8) {
      return 'La nueva contraseña debe tener al menos 8 caracteres.';
    }

    if (passwordForm.nueva_contrasena !== passwordForm.confirmar_contrasena) {
      return 'La nueva contraseña y la confirmación deben coincidir.';
    }

    if (passwordForm.nueva_contrasena === passwordForm.contrasena_actual) {
      return 'La nueva contraseña no puede ser igual a la contraseña actual.';
    }

    return '';
  };

  const handlePasswordSubmit = async () => {
    const validationError = validatePasswordForm();

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');

    try {
      await authApi.cambiarContrasena(passwordForm);
      setIsPasswordModalOpen(false);
      setPasswordForm(initialPasswordForm);
      setPasswordSuccess('Contraseña actualizada correctamente.');
    } catch (requestError) {
      setPasswordError(
        getApiErrorMessage(
          requestError,
          'No se pudo actualizar la contraseña.',
        ),
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <aside className="hidden h-screen w-[240px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Administración
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">SigSports</h1>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title ?? `section-${sectionIndex}`} className="space-y-1">
            {section.title ? (
              <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = isMenuItemActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="min-w-0 rounded-xl bg-slate-50 p-3">
          <p className="truncate text-sm font-semibold text-slate-950">
            {user?.nombre_completo || 'Usuario'}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {role || 'Sin rol'}
          </p>
          {passwordSuccess ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              {passwordSuccess}
            </p>
          ) : null}
          <button
            type="button"
            onClick={openPasswordModal}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
          >
            Cambiar contraseña
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {isPasswordModalOpen ? (
        <Modal title="Cambiar contraseña" onClose={closePasswordModal} maxWidth="xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePasswordSubmit();
            }}
          >
            {passwordError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordError}
              </p>
            ) : null}

            <FormInput
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.contrasena_actual}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  contrasena_actual: event.target.value,
                }))
              }
            />
            <FormInput
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordForm.nueva_contrasena}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  nueva_contrasena: event.target.value,
                }))
              }
            />
            <FormInput
              label="Confirmar nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordForm.confirmar_contrasena}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmar_contrasena: event.target.value,
                }))
              }
            />

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={closePasswordModal}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSavingPassword ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </aside>
  );
}
