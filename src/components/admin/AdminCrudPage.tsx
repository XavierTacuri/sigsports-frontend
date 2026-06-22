import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/apiError';
import { CardStat } from '../ui/CardStat';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { ErrorMessage } from '../ui/ErrorMessage';
import { FilterSelect } from '../ui/FilterSelect';
import { FormInput } from '../ui/FormInput';
import { FormSelect, type SelectOption } from '../ui/FormSelect';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../layout/PageHeader';
import { Pagination } from '../ui/Pagination';
import { SearchBar } from '../ui/SearchBar';

export type FormValue = string | boolean | File | null;
export type FormValues = Record<string, FormValue>;

export interface AdminFormField {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'url'
    | 'file'
    | 'select'
    | 'checkbox'
    | 'textarea'
    | 'message';
  options?: SelectOption[];
  required?: boolean | ((values: FormValues, isEditing: boolean) => boolean);
  hideOnEdit?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  readOnlyOnEdit?: boolean;
  helperText?: string;
  accept?: string;
  showWhen?: (values: FormValues, isEditing: boolean) => boolean;
  onValueChange?: (
    value: FormValue,
    values: FormValues,
    isEditing: boolean,
  ) => FormValues;
  previewImage?: boolean;
  existingUrlField?: string;
}

interface StatusToggle<T, TUpdate> {
  isActive: (item: T) => boolean;
  buildPayload: (active: boolean) => TUpdate;
}

interface SummaryCard<T> {
  title: string;
  value: (items: T[]) => string | number;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  icon?: ReactNode;
}

interface AdminFilter<T> {
  name: string;
  label: string;
  options: SelectOption[] | ((items: T[]) => SelectOption[]);
  predicate: (item: T, value: string) => boolean;
}

interface AdminCrudPageProps<T, TCreate, TUpdate> {
  title: string;
  description: string;
  itemName: string;
  columns: DataTableColumn<T>[];
  fields: AdminFormField[];
  list: () => Promise<T[]>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: number, payload: TUpdate) => Promise<T>;
  getId: (item: T) => number | undefined;
  getInitialValues: (item?: T) => FormValues;
  getCreateInitialValues?: () => Promise<FormValues>;
  toCreatePayload: (values: FormValues) => TCreate;
  toUpdatePayload: (values: FormValues) => TUpdate;
  statusToggle?: StatusToggle<T, TUpdate>;
  emptyMessage?: string;
  headerContent?: ReactNode;
  summaryCards?: SummaryCard<T>[];
  searchPlaceholder?: string;
  getSearchText?: (item: T) => string;
  filters?: AdminFilter<T>[];
  validate?: (values: FormValues, isEditing: boolean) => string | null;
}

export function AdminCrudPage<T, TCreate, TUpdate>({
  title,
  description,
  itemName,
  columns,
  fields,
  list,
  create,
  update,
  getId,
  getInitialValues,
  getCreateInitialValues,
  toCreatePayload,
  toUpdatePayload,
  statusToggle,
  emptyMessage,
  headerContent,
  summaryCards,
  searchPlaceholder = 'Buscar',
  getSearchText,
  filters = [],
  validate,
}: AdminCrudPageProps<T, TCreate, TUpdate>) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingCreate, setIsPreparingCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [toggleItem, setToggleItem] = useState<T | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormValues>(() => getInitialValues());
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const isAdmin = user?.rol?.nombre_rol === 'ADMINISTRADOR';

  const loadData = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      setItems(await list());
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          `No se pudieron cargar los registros de ${title.toLowerCase()}.`,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, list, title]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = async () => {
    try {
      setError('');
      setIsPreparingCreate(true);
      const initialValues = getCreateInitialValues
        ? await getCreateInitialValues()
        : getInitialValues();

      setEditingItem(null);
      setForm(initialValues);
      setFilePreviews({});
      setIsModalOpen(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          `No se pudo preparar el nuevo ${itemName.toLowerCase()}.`,
        ),
      );
    } finally {
      setIsPreparingCreate(false);
    }
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setForm(getInitialValues(item));
    setFilePreviews({});
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingItem(null);
      setFilePreviews({});
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const validationMessage = validate?.(form, Boolean(editingItem));
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingItem) {
        const id = getId(editingItem);

        if (id === undefined) {
          throw new Error('El registro no tiene identificador.');
        }

        await update(id, toUpdatePayload(form));
      } else {
        await create(toCreatePayload(form));
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          `No se pudo guardar el ${itemName.toLowerCase()}.`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: T) => {
    if (!statusToggle) {
      return;
    }

    const id = getId(item);

    if (id === undefined) {
      return;
    }

    try {
      setError('');
      await update(id, statusToggle.buildPayload(!statusToggle.isActive(item)));
      await loadData();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'No se pudo actualizar el estado.'),
      );
    }
  };

  const normalizedSearch = search
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      (getSearchText?.(item) ?? JSON.stringify(item))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesFilters = filters.every((filter) => {
      const value = filterValues[filter.name] ?? '';
      return !value || filter.predicate(item, value);
    });

    return matchesSearch && matchesFilters;
  });
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const filtersActive =
    Boolean(search) || Object.values(filterValues).some(Boolean);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterValues, pageSize, search]);

  if (!user) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <ErrorMessage message="No tienes permisos para administrar este módulo." />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={title}
        description={description}
        actionLabel={isPreparingCreate ? 'Preparando...' : `Nuevo ${itemName.toLowerCase()}`}
        onAction={() => void openCreate()}
      />
      {headerContent}

      {error && !isModalOpen ? <ErrorMessage message={error} /> : null}

      {summaryCards?.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <CardStat
              key={card.title}
              title={card.title}
              value={card.value(items)}
              tone={card.tone}
              icon={card.icon}
            />
          ))}
        </section>
      ) : null}

      {(getSearchText || filters.length > 0) && !isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            {getSearchText ? (
              <SearchBar
                label="Buscar"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            ) : null}
            {filters.map((filter) => (
              <FilterSelect
                key={filter.name}
                label={filter.label}
                value={filterValues[filter.name] ?? ''}
                options={
                  typeof filter.options === 'function'
                    ? filter.options(items)
                    : filter.options
                }
                onChange={(event) =>
                  setFilterValues((current) => ({
                    ...current,
                    [filter.name]: event.target.value,
                  }))
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={paginatedItems}
            getKey={(item) => getId(item) ?? JSON.stringify(item)}
            emptyMessage={
              filtersActive
                ? 'No hay resultados que coincidan con los filtros.'
                : emptyMessage
            }
            renderActions={(item) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Editar
                </button>
                {statusToggle ? (
                  <button
                    type="button"
                    onClick={() => setToggleItem(item)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {statusToggle.isActive(item) ? 'Desactivar' : 'Activar'}
                  </button>
                ) : null}
              </div>
            )}
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
      )}

      {isModalOpen ? (
        <Modal
          title={`${editingItem ? 'Editar' : 'Nuevo'} ${itemName.toLowerCase()}`}
          onClose={closeModal}
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields
                .filter((field) => !(editingItem && field.hideOnEdit))
                .filter((field) =>
                  field.showWhen
                    ? field.showWhen(form, Boolean(editingItem))
                    : true,
                )
                .map((field) => {
                  const value = form[field.name];
                  const required =
                    typeof field.required === 'function'
                      ? field.required(form, Boolean(editingItem))
                      : field.required;

                  if (field.type === 'message') {
                    return (
                      <p
                        key={field.name}
                        className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 sm:col-span-2"
                      >
                        {field.helperText ?? field.label}
                      </p>
                    );
                  }

                  if (field.type === 'checkbox') {
                    return (
                      <label
                        key={field.name}
                        className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.name]: event.target.checked,
                            }))
                          }
                          className="h-4 w-4"
                        />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <FormSelect
                        key={field.name}
                          id={field.name}
                          label={field.label}
                          options={field.options ?? []}
                          value={String(value ?? '')}
                          required={required}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setForm((current) =>
                              field.onValueChange
                                ? field.onValueChange(
                                    nextValue,
                                    current,
                                    Boolean(editingItem),
                                  )
                                : {
                                    ...current,
                                    [field.name]: nextValue,
                                  },
                            );
                          }}
                      />
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <label
                        key={field.name}
                        className="block text-sm font-medium text-slate-700 sm:col-span-2"
                        htmlFor={field.name}
                      >
                        {field.label}
                        <textarea
                          id={field.name}
                          value={String(value ?? '')}
                          required={required}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.name]: event.target.value,
                            }))
                          }
                          className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    );
                  }

                  if (field.type === 'file') {
                    const existingUrl = field.existingUrlField
                      ? String(form[field.existingUrlField] ?? '')
                      : '';
                    const previewUrl = filePreviews[field.name] || existingUrl;

                    return (
                      <label
                        key={field.name}
                        className="block text-sm font-medium text-slate-700"
                        htmlFor={field.name}
                      >
                        {field.label}
                        <input
                          id={field.name}
                          type="file"
                          accept={field.accept}
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            setForm((current) => ({
                              ...current,
                              [field.name]: file,
                            }));

                            if (file && field.previewImage) {
                              setFilePreviews((current) => ({
                                ...current,
                                [field.name]: URL.createObjectURL(file),
                              }));
                            }
                          }}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:font-semibold file:text-white"
                        />
                        {field.helperText ? (
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            {field.helperText}
                          </span>
                        ) : null}
                        {field.previewImage && previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Vista previa"
                            className="mt-3 h-20 w-20 rounded-md border border-slate-200 object-contain"
                          />
                        ) : null}
                      </label>
                    );
                  }

                  return (
                    <FormInput
                      key={field.name}
                      id={field.name}
                      label={field.label}
                      type={field.type ?? 'text'}
                      value={value instanceof File ? '' : String(value ?? '')}
                      required={required}
                      placeholder={field.placeholder}
                      readOnly={
                        field.readOnly ||
                        (Boolean(editingItem) && field.readOnlyOnEdit)
                      }
                      helperText={field.helperText}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  );
                })}
            </div>

            {error ? <ErrorMessage message={error} /> : null}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {toggleItem && statusToggle ? (
        <ConfirmDialog
          title={
            statusToggle.isActive(toggleItem)
              ? `Desactivar ${itemName.toLowerCase()}`
              : `Activar ${itemName.toLowerCase()}`
          }
          message={`¿Deseas ${
            statusToggle.isActive(toggleItem) ? 'desactivar' : 'activar'
          } este registro?`}
          confirmLabel={statusToggle.isActive(toggleItem) ? 'Desactivar' : 'Activar'}
          onCancel={() => setToggleItem(null)}
          onConfirm={() => {
            const item = toggleItem;
            setToggleItem(null);
            void handleToggle(item);
          }}
        />
      ) : null}
    </div>
  );
}
