import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { deportesApi } from '../../api/deportesApi';
import type { Deporte, DeportePayload } from '../../types';
import { optionalText } from '../../utils/formValues';

const columns = [
  {
    key: 'nombre',
    header: 'Disciplina',
    render: (deporte: Deporte) => deporte.nombre_deporte,
  },
  {
    key: 'tipo',
    header: 'Tipo',
    render: (deporte: Deporte) => deporte.tipo_deporte,
  },
  {
    key: 'marcador',
    header: 'Permite marcador',
    render: (deporte: Deporte) => (deporte.permite_goles ? 'Sí' : 'No'),
  },
  {
    key: 'tarjetas',
    header: 'Permite tarjetas',
    render: (deporte: Deporte) => (deporte.permite_tarjetas ? 'Sí' : 'No'),
  },
  {
    key: 'tabla',
    header: 'Tabla de posiciones',
    render: (deporte: Deporte) =>
      deporte.permite_tabla_posiciones ? 'Sí' : 'No',
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (deporte: Deporte) => <StatusBadge active={deporte.activo} />,
  },
];

const fields = [
  { name: 'nombre_deporte', label: 'Nombre del deporte', required: true },
  {
    name: 'tipo_deporte',
    label: 'Tipo de deporte',
    type: 'select' as const,
    required: true,
    options: [
      { value: 'EQUIPO', label: 'Equipo' },
      { value: 'INDIVIDUAL', label: 'Individual' },
      { value: 'RESULTADO', label: 'Resultado' },
    ],
  },
  {
    name: 'descripcion',
    label: 'Descripción',
    type: 'textarea' as const,
  },
  { name: 'permite_goles', label: 'Permite marcador', type: 'checkbox' as const },
  {
    name: 'permite_tarjetas',
    label: 'Permite tarjetas',
    type: 'checkbox' as const,
  },
  {
    name: 'permite_tabla_posiciones',
    label: 'Permite tabla de posiciones',
    type: 'checkbox' as const,
  },
  { name: 'activo', label: 'Activo', type: 'checkbox' as const },
];

const initialValues = (deporte?: Deporte): FormValues => ({
  nombre_deporte: deporte?.nombre_deporte ?? '',
  tipo_deporte: deporte?.tipo_deporte ?? '',
  descripcion: deporte?.descripcion ?? '',
  permite_goles: deporte?.permite_goles ?? false,
  permite_tarjetas: deporte?.permite_tarjetas ?? false,
  permite_tabla_posiciones: deporte?.permite_tabla_posiciones ?? false,
  activo: deporte?.activo ?? true,
});

const toPayload = (values: FormValues): DeportePayload => ({
  nombre_deporte: String(values.nombre_deporte).trim(),
  tipo_deporte: String(values.tipo_deporte).trim(),
  descripcion: optionalText(values.descripcion),
  permite_goles: Boolean(values.permite_goles),
  permite_tarjetas: Boolean(values.permite_tarjetas),
  permite_tabla_posiciones: Boolean(values.permite_tabla_posiciones),
  activo: Boolean(values.activo),
});

export function DeportesPage() {
  return (
    <AdminCrudPage
      title="Disciplinas"
      description="Administra las disciplinas deportivas del campeonato."
      itemName="Disciplina"
      columns={columns}
      fields={fields}
      list={deportesApi.listar}
      create={deportesApi.crear}
      update={deportesApi.actualizar}
      getId={(deporte) => deporte.id_deporte}
      getInitialValues={initialValues}
      toCreatePayload={toPayload}
      toUpdatePayload={toPayload}
      statusToggle={{
        isActive: (deporte) => deporte.activo,
        buildPayload: (activo) => ({ activo }),
      }}
      summaryCards={[
        { title: 'Total disciplinas', value: (items) => items.length, tone: 'slate', icon: 'T' },
        { title: 'Activas', value: (items) => items.filter((deporte) => deporte.activo).length, tone: 'green', icon: 'A' },
        { title: 'Con grupos', value: (items) => items.filter((deporte) => deporte.permite_tabla_posiciones).length, tone: 'blue', icon: 'G' },
        { title: 'Individuales', value: (items) => items.filter((deporte) => deporte.tipo_deporte === 'INDIVIDUAL').length, tone: 'amber', icon: 'I' },
      ]}
      searchPlaceholder="Disciplina"
      getSearchText={(deporte) =>
        [deporte.nombre_deporte, deporte.tipo_deporte, deporte.descripcion]
          .filter(Boolean)
          .join(' ')
      }
      filters={[
        {
          name: 'tipo',
          label: 'Tipo de deporte',
          options: [
            { value: 'EQUIPO', label: 'Equipo' },
            { value: 'INDIVIDUAL', label: 'Individual' },
            { value: 'RESULTADO', label: 'Resultado' },
          ],
          predicate: (deporte, value) => deporte.tipo_deporte === value,
        },
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (deporte, value) =>
            value === 'ACTIVO' ? deporte.activo : !deporte.activo,
        },
      ]}
      emptyMessage="No hay disciplinas registradas."
    />
  );
}
