import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { categoriasApi } from '../../api/categoriasApi';
import type { Categoria, CategoriaPayload } from '../../types';
import { optionalNumber, optionalText } from '../../utils/formValues';

const columns = [
  {
    key: 'nombre',
    header: 'Categoría',
    render: (categoria: Categoria) => categoria.nombre_categoria,
  },
  {
    key: 'edad_minima',
    header: 'Edad mínima',
    render: (categoria: Categoria) => categoria.edad_minima ?? '-',
  },
  {
    key: 'edad_maxima',
    header: 'Edad máxima',
    render: (categoria: Categoria) => categoria.edad_maxima ?? '-',
  },
  {
    key: 'genero',
    header: 'Género',
    render: (categoria: Categoria) => categoria.genero || '-',
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (categoria: Categoria) => <StatusBadge active={categoria.activo} />,
  },
];

const fields = [
  { name: 'nombre_categoria', label: 'Nombre de la categoría', required: true },
  {
    name: 'genero',
    label: 'Género',
    type: 'select' as const,
    options: [
      { value: 'MASCULINO', label: 'Masculino' },
      { value: 'FEMENINO', label: 'Femenino' },
      { value: 'MIXTO', label: 'Mixto' },
    ],
  },
  { name: 'edad_minima', label: 'Edad mínima', type: 'number' as const },
  { name: 'edad_maxima', label: 'Edad máxima', type: 'number' as const },
  {
    name: 'descripcion',
    label: 'Descripción',
    type: 'textarea' as const,
  },
  { name: 'activo', label: 'Activo', type: 'checkbox' as const },
];

const initialValues = (categoria?: Categoria): FormValues => ({
  nombre_categoria: categoria?.nombre_categoria ?? '',
  genero: categoria?.genero ?? '',
  edad_minima: categoria?.edad_minima?.toString() ?? '',
  edad_maxima: categoria?.edad_maxima?.toString() ?? '',
  descripcion: categoria?.descripcion ?? '',
  activo: categoria?.activo ?? true,
});

const toPayload = (values: FormValues): CategoriaPayload => ({
  nombre_categoria: String(values.nombre_categoria).trim(),
  genero: optionalText(values.genero),
  edad_minima: optionalNumber(values.edad_minima),
  edad_maxima: optionalNumber(values.edad_maxima),
  descripcion: optionalText(values.descripcion),
  activo: Boolean(values.activo),
});

export function CategoriasPage() {
  return (
    <AdminCrudPage
      title="Categorías"
      description="Administra categorías por edad y género."
      itemName="Categoría"
      columns={columns}
      fields={fields}
      list={categoriasApi.listar}
      create={categoriasApi.crear}
      update={categoriasApi.actualizar}
      getId={(categoria) => categoria.id_categoria}
      getInitialValues={initialValues}
      toCreatePayload={toPayload}
      toUpdatePayload={toPayload}
      statusToggle={{
        isActive: (categoria) => categoria.activo,
        buildPayload: (activo) => ({ activo }),
      }}
      summaryCards={[
        { title: 'Total categorías', value: (items) => items.length, tone: 'slate', icon: 'T' },
        { title: 'Activas', value: (items) => items.filter((categoria) => categoria.activo).length, tone: 'green', icon: 'A' },
        { title: 'Masculinas', value: (items) => items.filter((categoria) => categoria.genero === 'MASCULINO').length, tone: 'blue', icon: 'M' },
        { title: 'Femeninas', value: (items) => items.filter((categoria) => categoria.genero === 'FEMENINO').length, tone: 'red', icon: 'F' },
      ]}
      searchPlaceholder="Categoría"
      getSearchText={(categoria) =>
        [categoria.nombre_categoria, categoria.genero, categoria.descripcion]
          .filter(Boolean)
          .join(' ')
      }
      filters={[
        {
          name: 'genero',
          label: 'Género',
          options: [
            { value: 'MASCULINO', label: 'Masculino' },
            { value: 'FEMENINO', label: 'Femenino' },
            { value: 'MIXTO', label: 'Mixto' },
          ],
          predicate: (categoria, value) => categoria.genero === value,
        },
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (categoria, value) =>
            value === 'ACTIVO' ? categoria.activo : !categoria.activo,
        },
      ]}
      validate={(values) => {
        const min = values.edad_minima === '' ? null : Number(values.edad_minima);
        const max = values.edad_maxima === '' ? null : Number(values.edad_maxima);

        if (min !== null && min < 0) return 'La edad mínima debe ser mayor o igual a 0.';
        if (max !== null && max < 0) return 'La edad máxima debe ser mayor o igual a 0.';
        if (min !== null && max !== null && min > max) {
          return 'La edad mínima no puede ser mayor que la edad máxima.';
        }

        return null;
      }}
      emptyMessage="No hay categorías registradas."
    />
  );
}
