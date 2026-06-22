import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import type { LoginRequest } from '../../types';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [form, setForm] = useState<LoginRequest>({
    correo_electronico: 'admin@sigsports.com',
    contrasena: 'Admin123*',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    '/dashboard';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(from, { replace: true });
    } catch {
      setError('No se pudo iniciar sesión. Verifica las credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            SigSports
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Iniciar sesión
          </h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="correo_electronico"
            >
              Correo electrónico
            </label>
            <input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              value={form.correo_electronico}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  correo_electronico: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="contrasena"
            >
              Contraseña
            </label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              value={form.contrasena}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contrasena: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </section>
    </div>
  );
}
