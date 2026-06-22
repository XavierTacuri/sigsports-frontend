import { useEffect, useMemo, useState } from 'react';
import { campeonatosApi } from '../../api/campeonatosApi';
import { categoriasApi } from '../../api/categoriasApi';
import { competenciasApi } from '../../api/competenciasApi';
import { deportesApi } from '../../api/deportesApi';
import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import type {
  Campeonato,
  Categoria,
  Competencia,
  CompetenciaPayload,
  Deporte,
} from '../../types';
import { optionalNumber, requiredNumber } from '../../utils/formValues';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const SIN_GRUPOS = ['ATLETISMO', 'AJEDREZ', 'CICLISMO'];
const CON_GRUPOS = [
  'BASQUET',
  'FUTBOL',
  'INDOR',
  'VOLEY',
  'TENIS DE MESA',
];
const CON_SANCIONES = ['FUTBOL', 'INDOR'];

const includesSport = (sportName: string, names: string[]) =>
  names.some((name) => sportName.includes(name));

const getSportName = (values: FormValues, deportes: Deporte[]) => {
  const selectedDeporte = deportes.find(
    (deporte) => deporte.id_deporte === Number(values.id_deporte),
  );

  return normalizeText(selectedDeporte?.nombre_deporte ?? '');
};

const getSportPreset = (
  sportName: string,
): Partial<FormValues> => {
  const groupDefaults = {
    tipo_competencia: 'EQUIPOS',
    formato_competencia: 'GRUPOS_ELIMINATORIAS',
    tipo_puntuacion: 'PUNTOS',
    cantidad_equipos: '12',
    cantidad_grupos: '4',
    equipos_por_grupo: '3',
    clasificados_por_grupo: '1',
    permite_sanciones: includesSport(sportName, CON_SANCIONES),
  };

  if (includesSport(sportName, CON_GRUPOS)) {
    return groupDefaults;
  }

  const individualDefaults = {
    tipo_competencia: 'INDIVIDUAL',
    formato_competencia: 'CLASIFICACION_GENERAL',
    cantidad_equipos: '12',
    cantidad_grupos: '',
    equipos_por_grupo: '',
    clasificados_por_grupo: '',
    permite_sanciones: false,
  };

  if (sportName.includes('AJEDREZ')) {
    return { ...individualDefaults, tipo_puntuacion: 'POSICION' };
  }

  if (sportName.includes('ATLETISMO')) {
    return { ...individualDefaults, tipo_puntuacion: 'TIEMPO_MARCA' };
  }

  if (sportName.includes('CICLISMO')) {
    return { ...individualDefaults, tipo_puntuacion: 'TIEMPO' };
  }

  return {
    cantidad_grupos: '',
    equipos_por_grupo: '',
    clasificados_por_grupo: '',
    permite_sanciones: false,
  };
};

const initialValues = (competencia?: Competencia): FormValues => ({
  id_campeonato: competencia?.id_campeonato?.toString() ?? '',
  id_deporte: competencia?.id_deporte?.toString() ?? '',
  id_categoria: competencia?.id_categoria?.toString() ?? '',
  nombre_competencia: competencia?.nombre_competencia ?? '',
  tipo_competencia: competencia?.tipo_competencia ?? '',
  formato_competencia: competencia?.formato_competencia ?? '',
  tipo_puntuacion: competencia?.tipo_puntuacion ?? '',
  cantidad_equipos: competencia?.cantidad_equipos?.toString() ?? '',
  cantidad_grupos: competencia?.cantidad_grupos?.toString() ?? '',
  equipos_por_grupo: competencia?.equipos_por_grupo?.toString() ?? '',
  clasificados_por_grupo:
    competencia?.clasificados_por_grupo?.toString() ?? '',
  permite_sanciones: competencia?.permite_sanciones ?? false,
  estado: competencia?.estado ?? 'ACTIVO',
});

export function CompetenciasPage() {
  const { user } = useAuth();
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    if (user?.rol?.nombre_rol !== 'ADMINISTRADOR') {
      return;
    }

    Promise.all([
      campeonatosApi.listar(),
      deportesApi.listar(),
      categoriasApi.listar(),
    ])
      .then(([campeonatosData, deportesData, categoriasData]) => {
        setCampeonatos(campeonatosData);
        setDeportes(deportesData);
        setCategorias(categoriasData);
      })
      .catch(() =>
        setCatalogError('No se pudieron cargar los catálogos del formulario.'),
      );
  }, [user?.rol?.nombre_rol]);

  const fields = useMemo(
    () => [
      {
        name: 'id_campeonato',
        label: 'Campeonato',
        type: 'select' as const,
        required: true,
        options: campeonatos.map((item) => ({
          value: String(item.id_campeonato),
          label: `${item.nombre_campeonato} (${item.anio})`,
        })),
      },
      {
        name: 'id_deporte',
        label: 'Disciplina',
        type: 'select' as const,
        required: true,
        options: deportes.map((item) => ({
          value: String(item.id_deporte),
          label: item.nombre_deporte,
        })),
        onValueChange: (value: string | boolean | File | null, values: FormValues) => {
          const nextValues = { ...values, id_deporte: value };
          const sportName = getSportName(nextValues, deportes);

          return { ...nextValues, ...getSportPreset(sportName) };
        },
      },
      {
        name: 'sin_grupos_message',
        label:
          'Esta competencia no maneja grupos ni partidos. Se programará mediante eventos individuales.',
        type: 'message' as const,
        helperText:
          'Esta competencia no maneja grupos ni partidos. Se programará mediante eventos individuales.',
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), SIN_GRUPOS),
      },
      {
        name: 'id_categoria',
        label: 'Categoría',
        type: 'select' as const,
        required: true,
        options: categorias.map((item) => ({
          value: String(item.id_categoria),
          label: item.nombre_categoria,
        })),
      },
      {
        name: 'nombre_competencia',
        label: 'Nombre de la competencia',
        required: true,
      },
      {
        name: 'tipo_competencia',
        label: 'Tipo de competencia',
        required: true,
        type: 'select' as const,
        options: [
          { value: 'EQUIPOS', label: 'Equipos' },
          { value: 'INDIVIDUAL', label: 'Individual' },
          { value: 'RESULTADO', label: 'Resultado' },
        ],
      },
      {
        name: 'formato_competencia',
        label: 'Formato de competencia',
        required: true,
        type: 'select' as const,
        options: [
          { value: 'GRUPOS_ELIMINATORIAS', label: 'Grupos y eliminatorias' },
          { value: 'CLASIFICACION_GENERAL', label: 'Clasificación general' },
          { value: 'TODOS_CONTRA_TODOS', label: 'Todos contra todos' },
        ],
      },
      {
        name: 'tipo_puntuacion',
        label: 'Tipo de puntuación',
        required: true,
        type: 'select' as const,
        options: [
          { value: 'PUNTOS', label: 'Puntos' },
          { value: 'POSICION', label: 'Posición' },
          { value: 'TIEMPO', label: 'Tiempo' },
          { value: 'TIEMPO_MARCA', label: 'Tiempo o marca' },
        ],
      },
      {
        name: 'cantidad_equipos',
        label: 'Cantidad de participantes',
        type: 'number' as const,
        required: true,
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), SIN_GRUPOS),
      },
      {
        name: 'cantidad_equipos',
        label: 'Cantidad de clubes',
        type: 'number' as const,
        required: true,
        showWhen: (values: FormValues) =>
          !includesSport(getSportName(values, deportes), SIN_GRUPOS),
      },
      {
        name: 'cantidad_grupos',
        label: 'Número de grupos',
        type: 'number' as const,
        required: true,
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), CON_GRUPOS),
      },
      {
        name: 'equipos_por_grupo',
        label: 'Clubes por grupo',
        type: 'number' as const,
        required: true,
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), CON_GRUPOS),
      },
      {
        name: 'clasificados_por_grupo',
        label: 'Clasificados por grupo',
        type: 'number' as const,
        required: true,
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), CON_GRUPOS),
      },
      {
        name: 'permite_sanciones',
        label: 'Permite sanciones',
        type: 'checkbox' as const,
        showWhen: (values: FormValues) =>
          includesSport(getSportName(values, deportes), CON_SANCIONES),
      },
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
    ],
    [campeonatos, categorias, deportes],
  );

  const toPayload = (values: FormValues): CompetenciaPayload => {
    const sportName = getSportName(values, deportes);
    const isConGrupos = includesSport(sportName, CON_GRUPOS);
    const permiteSanciones = includesSport(sportName, CON_SANCIONES);

    if (
      isConGrupos &&
      (!values.cantidad_grupos ||
        !values.equipos_por_grupo ||
        !values.clasificados_por_grupo)
    ) {
      throw new Error(
        'Número de grupos, clubes por grupo y clasificados por grupo son obligatorios.',
      );
    }

    return {
      id_campeonato: requiredNumber(values.id_campeonato),
      id_deporte: requiredNumber(values.id_deporte),
      id_categoria: requiredNumber(values.id_categoria),
      nombre_competencia: String(values.nombre_competencia).trim(),
      tipo_competencia: String(values.tipo_competencia).trim(),
      formato_competencia: String(values.formato_competencia).trim(),
      tipo_puntuacion: String(values.tipo_puntuacion).trim(),
      cantidad_equipos: optionalNumber(values.cantidad_equipos),
      cantidad_grupos: isConGrupos
        ? optionalNumber(values.cantidad_grupos)
        : null,
      equipos_por_grupo: isConGrupos
        ? optionalNumber(values.equipos_por_grupo)
        : null,
      clasificados_por_grupo: isConGrupos
        ? optionalNumber(values.clasificados_por_grupo)
        : null,
      permite_sanciones:
        permiteSanciones && Boolean(values.permite_sanciones),
      fecha_inicio: null,
      fecha_fin: null,
      estado: String(values.estado),
    };
  };

  const columns = useMemo(() => {
    const campeonatoNames = new Map(
      campeonatos.map((item) => [item.id_campeonato, item.nombre_campeonato]),
    );
    const deporteNames = new Map(
      deportes.map((item) => [item.id_deporte, item.nombre_deporte]),
    );
    const categoriaNames = new Map(
      categorias.map((item) => [item.id_categoria, item.nombre_categoria]),
    );

    return [
      {
        key: 'nombre',
        header: 'Competencia',
        render: (item: Competencia) => item.nombre_competencia,
      },
      {
        key: 'campeonato',
        header: 'Campeonato',
        render: (item: Competencia) =>
          campeonatoNames.get(item.id_campeonato) ?? item.id_campeonato,
      },
      {
        key: 'deporte',
        header: 'Disciplina',
        render: (item: Competencia) =>
          deporteNames.get(item.id_deporte) ?? item.id_deporte,
      },
      {
        key: 'categoria',
        header: 'Categoría',
        render: (item: Competencia) =>
          categoriaNames.get(item.id_categoria) ?? item.id_categoria,
      },
      {
        key: 'formato',
        header: 'Formato',
        render: (item: Competencia) => item.formato_competencia,
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: Competencia) => (
          <StatusBadge active={item.estado === 'ACTIVO'} />
        ),
      },
    ];
  }, [campeonatos, categorias, deportes]);

  return (
    <AdminCrudPage
      title="Competencias"
      description="Configura las competencias de cada campeonato."
      itemName="Competencia"
      columns={columns}
      fields={fields}
      list={competenciasApi.listar}
      create={competenciasApi.crear}
      update={competenciasApi.actualizar}
      getId={(item) => item.id_competencia}
      getInitialValues={initialValues}
      toCreatePayload={toPayload}
      toUpdatePayload={toPayload}
      statusToggle={{
        isActive: (item) => item.estado === 'ACTIVO',
        buildPayload: (active) => ({ estado: active ? 'ACTIVO' : 'INACTIVO' }),
      }}
      headerContent={
        catalogError ? (
          <p className="mt-2 text-sm text-red-700">{catalogError}</p>
        ) : null
      }
      summaryCards={[
        { title: 'Total competencias', value: (items) => items.length, tone: 'slate', icon: 'T' },
        { title: 'Activas', value: (items) => items.filter((item) => item.estado === 'ACTIVO').length, tone: 'green', icon: 'A' },
        { title: 'Con grupos', value: (items) => items.filter((item) => item.cantidad_grupos !== null && item.cantidad_grupos !== 0).length, tone: 'blue', icon: 'G' },
        { title: 'Sin grupos', value: (items) => items.filter((item) => !item.cantidad_grupos).length, tone: 'amber', icon: 'S' },
      ]}
      searchPlaceholder="Competencia"
      getSearchText={(item) =>
        [
          item.nombre_competencia,
          item.tipo_competencia,
          item.formato_competencia,
          campeonatos.find((campeonato) => campeonato.id_campeonato === item.id_campeonato)?.nombre_campeonato,
          deportes.find((deporte) => deporte.id_deporte === item.id_deporte)?.nombre_deporte,
          categorias.find((categoria) => categoria.id_categoria === item.id_categoria)?.nombre_categoria,
        ]
          .filter(Boolean)
          .join(' ')
      }
      filters={[
        {
          name: 'campeonato',
          label: 'Campeonato',
          options: campeonatos.map((campeonato) => ({
            value: String(campeonato.id_campeonato),
            label: campeonato.nombre_campeonato,
          })),
          predicate: (item, value) => item.id_campeonato === Number(value),
        },
        {
          name: 'disciplina',
          label: 'Disciplina',
          options: deportes.map((deporte) => ({
            value: String(deporte.id_deporte),
            label: deporte.nombre_deporte,
          })),
          predicate: (item, value) => item.id_deporte === Number(value),
        },
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (item, value) => item.estado === value,
        },
      ]}
      emptyMessage="No hay competencias registradas."
    />
  );
}
