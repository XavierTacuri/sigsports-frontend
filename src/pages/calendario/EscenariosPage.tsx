import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { escenariosApi } from '../../api/escenariosApi';
import { GeneralStatusBadge } from '../../components/calendario/CalendarStatusBadges';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { CardStat } from '../../components/ui/CardStat';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAuth } from '../../hooks/useAuth';
import type { Escenario, EscenarioPayload } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

const emptyForm: EscenarioPayload = {
  nombre_escenario: '',
  direccion: null,
  referencia: null,
  estado: 'ACTIVO',
};

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function EscenariosPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const canRead = ['ADMINISTRADOR', 'SECRETARIA'].includes(
    user?.rol?.nombre_rol ?? '',
  );
  const canManage = user?.rol?.nombre_rol === 'ADMINISTRADOR';
  const [items, setItems] = useState<Escenario[]>([]);
  const [editing, setEditing] = useState<Escenario | null>(null);
  const [form, setForm] = useState<EscenarioPayload>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    if (!canRead) {
      setIsLoading(false);
      return;
    }
    try {
      setError('');
      setIsLoading(true);
      setItems(await escenariosApi.listar());
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudieron cargar los escenarios.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [estado, pageSize, search]);

  const open = (item?: Escenario) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            nombre_escenario: item.nombre_escenario,
            direccion: item.direccion ?? null,
            referencia: item.referencia ?? null,
            estado: item.estado,
          }
        : emptyForm,
    );
    setError('');
    setIsModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (editing?.id_escenario) {
        await escenariosApi.actualizar(editing.id_escenario, form);
      } else {
        await escenariosApi.crear(form);
      }
      setIsModalOpen(false);
      await load();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo guardar el escenario.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const text = normalizeText(
          [item.nombre_escenario, item.direccion, item.referencia]
            .filter(Boolean)
            .join(' '),
        );
        const query = normalizeText(search);

        return (!query || text.includes(query)) && (!estado || item.estado === estado);
      }),
    [estado, items, search],
  );
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const filtersActive = Boolean(search || estado);

  if (!user || isLoading) {
    return <LoadingSpinner />;
  }
  if (!canRead) {
    return <ErrorMessage message="No tienes permisos." />;
  }

  return (
    <div className="space-y-5">
      {embedded ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Escenarios</h2>
            <p className="text-sm text-slate-600">
              Administra lugares, canchas y rutas.
            </p>
          </div>
          {canManage ? <Button onClick={() => open()}>Nuevo escenario</Button> : null}
        </div>
      ) : (
        <PageHeader
          title="Escenarios"
          description="Administra lugares, canchas y rutas donde se desarrollan las competencias."
          actionLabel={canManage ? 'Nuevo escenario' : undefined}
          onAction={canManage ? () => open() : undefined}
        />
      )}
      {error && !isModalOpen ? <ErrorMessage message={error} /> : null}
      {!embedded ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <CardStat title="Total" value={items.length} tone="slate" icon="T" />
          <CardStat
            title="Activos"
            value={items.filter((item) => item.estado === 'ACTIVO').length}
            tone="green"
            icon="A"
          />
          <CardStat
            title="Inactivos"
            value={items.filter((item) => item.estado !== 'ACTIVO').length}
            tone="red"
            icon="I"
          />
        </section>
      ) : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <SearchBar
            label="Buscar"
            placeholder="Escenario, dirección o referencia"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect
            label="Estado"
            value={estado}
            options={[
              { value: 'ACTIVO', label: 'Activo' },
              { value: 'INACTIVO', label: 'Inactivo' },
            ]}
            onChange={(event) => setEstado(event.target.value)}
          />
        </div>
      </section>
      <div className="space-y-4">
        <DataTable
          data={paginatedItems}
          getKey={(item) => item.id_escenario ?? item.nombre_escenario}
          emptyMessage={
            filtersActive
              ? 'No hay resultados que coincidan con los filtros.'
              : 'No hay escenarios registrados.'
          }
          columns={[
            {
              key: 'nombre',
              header: 'Escenario',
              render: (item) => item.nombre_escenario,
            },
            {
              key: 'direccion',
              header: 'Dirección',
              render: (item) => item.direccion || '-',
            },
            {
              key: 'referencia',
              header: 'Referencia',
              render: (item) => item.referencia || '-',
            },
            {
              key: 'estado',
              header: 'Estado',
              render: (item) => <GeneralStatusBadge estado={item.estado} />,
            },
          ]}
          renderActions={
            canManage
              ? (item) => (
                  <button
                    type="button"
                    onClick={() => open(item)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  >
                    Editar
                  </button>
                )
              : undefined
          }
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
      {isModalOpen ? (
        <Modal title={editing ? 'Editar escenario' : 'Nuevo escenario'} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre escenario"
                value={form.nombre_escenario}
                required
                onChange={(event) => setForm({ ...form, nombre_escenario: event.target.value })}
              />
              <FormInput
                label="Dirección"
                value={form.direccion ?? ''}
                onChange={(event) => setForm({ ...form, direccion: event.target.value || null })}
              />
              <FormInput
                label="Referencia"
                value={form.referencia ?? ''}
                onChange={(event) => setForm({ ...form, referencia: event.target.value || null })}
              />
              <FormSelect
                label="Estado"
                value={form.estado}
                required
                options={[
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'INACTIVO', label: 'Inactivo' },
                ]}
                onChange={(event) => setForm({ ...form, estado: event.target.value })}
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
