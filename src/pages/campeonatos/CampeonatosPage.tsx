import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { campeonatosApi } from '../../api/campeonatosApi';
import type { Campeonato, CampeonatoPayload } from '../../types';
import { optionalText, requiredNumber } from '../../utils/formValues';

const columns = [
  {
    key: 'nombre',
    header: 'Campeonato',
    render: (campeonato: Campeonato) => campeonato.nombre_campeonato,
  },
  {
    key: 'anio',
    header: 'Año',
    render: (campeonato: Campeonato) => campeonato.anio,
  },
  {
    key: 'fechas',
    header: 'Fechas',
    render: (campeonato: Campeonato) =>
      `${campeonato.fecha_inicio ?? '-'} / ${campeonato.fecha_fin ?? '-'}`,
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (campeonato: Campeonato) => (
      <StatusBadge active={campeonato.estado === 'ACTIVO'} />
    ),
  },
];

const fields = [
  { name: 'nombre_campeonato', label: 'Nombre del campeonato', required: true },
  { name: 'anio', label: 'Año', type: 'number' as const, required: true },
  {
    name: 'fecha_inicio',
    label: 'Fecha de inicio',
    type: 'date' as const,
  },
  { name: 'fecha_fin', label: 'Fecha de fin', type: 'date' as const },
  {
    name: 'estado',
    label: 'Estado',
    type: 'select' as const,
    required: true,
    options: [
      { value: 'ACTIVO', label: 'Activo' },
      { value: 'INACTIVO', label: 'Inactivo' },
    ],
  },
];

const initialValues = (campeonato?: Campeonato): FormValues => ({
  nombre_campeonato: campeonato?.nombre_campeonato ?? '',
  edicion: campeonato?.edicion ?? '',
  anio: campeonato?.anio?.toString() ?? new Date().getFullYear().toString(),
  fecha_inicio: campeonato?.fecha_inicio ?? '',
  fecha_fin: campeonato?.fecha_fin ?? '',
  descripcion: campeonato?.descripcion ?? '',
  estado: campeonato?.estado ?? 'ACTIVO',
});

const toPayload = (values: FormValues): CampeonatoPayload => ({
  nombre_campeonato: String(values.nombre_campeonato).trim(),
  edicion: optionalText(values.edicion),
  anio: requiredNumber(values.anio),
  fecha_inicio: optionalText(values.fecha_inicio),
  fecha_fin: optionalText(values.fecha_fin),
  descripcion: optionalText(values.descripcion),
  estado: String(values.estado),
});

export function CampeonatosPage() {
  return (
    <AdminCrudPage
      title="Campeonatos"
      description="Administra las ediciones y fechas de los campeonatos."
      itemName="Campeonato"
      columns={columns}
      fields={fields}
      list={campeonatosApi.listar}
      create={campeonatosApi.crear}
      update={campeonatosApi.actualizar}
      getId={(campeonato) => campeonato.id_campeonato}
      getInitialValues={initialValues}
      toCreatePayload={toPayload}
      toUpdatePayload={toPayload}
      statusToggle={{
        isActive: (campeonato) => campeonato.estado === 'ACTIVO',
        buildPayload: (active) => ({ estado: active ? 'ACTIVO' : 'INACTIVO' }),
      }}
      summaryCards={[
        { title: 'Total campeonatos', value: (items) => items.length, tone: 'slate', icon: 'T' },
        { title: 'Activos', value: (items) => items.filter((campeonato) => campeonato.estado === 'ACTIVO').length, tone: 'green', icon: 'A' },
        {
          title: 'En curso',
          value: (items) => {
            const today = new Date().toISOString().slice(0, 10);
            return items.filter((campeonato) =>
              campeonato.fecha_inicio &&
              campeonato.fecha_fin &&
              campeonato.fecha_inicio <= today &&
              campeonato.fecha_fin >= today
            ).length;
          },
          tone: 'blue',
          icon: 'C',
        },
        {
          title: 'Finalizados',
          value: (items) => {
            const today = new Date().toISOString().slice(0, 10);
            return items.filter((campeonato) => campeonato.fecha_fin && campeonato.fecha_fin < today).length;
          },
          tone: 'amber',
          icon: 'F',
        },
      ]}
      searchPlaceholder="Campeonato"
      getSearchText={(campeonato) =>
        [campeonato.nombre_campeonato, campeonato.edicion, String(campeonato.anio)]
          .filter(Boolean)
          .join(' ')
      }
      filters={[
        {
          name: 'anio',
          label: 'Año',
          options: (items) =>
            [...new Set(items.map((campeonato) => String(campeonato.anio)))]
              .sort()
              .map((anio) => ({ value: anio, label: anio })),
          predicate: (campeonato, value) => String(campeonato.anio) === value,
        },
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (campeonato, value) => campeonato.estado === value,
        },
      ]}
      validate={(values) => {
        if (!String(values.nombre_campeonato ?? '').trim()) {
          return 'El nombre del campeonato es obligatorio.';
        }
        if (!values.anio) return 'El año es obligatorio.';
        if (
          values.fecha_inicio &&
          values.fecha_fin &&
          String(values.fecha_inicio) > String(values.fecha_fin)
        ) {
          return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
        }

        return null;
      }}
      emptyMessage="No hay campeonatos registrados."
    />
  );
}
