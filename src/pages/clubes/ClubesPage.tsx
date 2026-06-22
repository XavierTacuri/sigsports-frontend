import { clubesApi } from '../../api/clubesApi';
import { uploadClubLogo } from '../../api/uploadsApi';
import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Club, ClubPayload } from '../../types';
import { getAssetUrl } from '../../utils/assetUrl';
import { optionalText } from '../../utils/formValues';

interface ClubFormPayload {
  payload: Partial<ClubPayload>;
  logoFile: File | null;
}

const columns = [
  {
    key: 'codigo',
    header: 'Código',
    render: (club: Club) => club.codigo_club || '-',
  },
  {
    key: 'logo',
    header: 'Logo',
    render: (club: Club) =>
      club.logo_url ? (
        <img
          src={getAssetUrl(club.logo_url)}
          alt={`Logo de ${club.nombre_club}`}
          className="h-10 w-10 rounded-md border border-slate-200 object-contain"
        />
      ) : (
        '-'
      ),
  },
  {
    key: 'nombre',
    header: 'Nombre del club',
    render: (club: Club) => club.nombre_club,
  },
  { key: 'siglas', header: 'Siglas', render: (club: Club) => club.siglas || '-' },
  {
    key: 'estado',
    header: 'Estado',
    render: (club: Club) => <StatusBadge active={club.estado === 'ACTIVO'} />,
  },
];

const fields = [
  {
    name: 'codigo_club',
    label: 'Código del club',
    readOnly: true,
    helperText: 'El código se genera automáticamente.',
  },
  { name: 'nombre_club', label: 'Nombre del club', required: true },
  { name: 'siglas', label: 'Siglas' },
  {
    name: 'logo_file',
    label: 'Logo del club',
    type: 'file' as const,
    accept: 'image/png,image/jpeg,image/jpg,image/webp',
    helperText: 'Formatos permitidos: PNG, JPG, JPEG y WEBP.',
    previewImage: true,
    existingUrlField: 'logo_preview',
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
];

const initialValues = (club?: Club): FormValues => ({
  codigo_club: club?.codigo_club ?? '',
  nombre_club: club?.nombre_club ?? '',
  siglas: club?.siglas ?? '',
  logo_url: club?.logo_url ?? '',
  logo_preview: getAssetUrl(club?.logo_url),
  logo_file: null,
  estado: club?.estado ?? 'ACTIVO',
});

const getNextClubCode = (clubes: Club[]) => {
  const codes = clubes
    .map((club) => club.codigo_club?.trim())
    .filter((code): code is string => Boolean(code))
    .map(Number)
    .filter((code) => !Number.isNaN(code));
  const maxCode = codes.length > 0 ? Math.max(...codes) : 0;

  return String(maxCode + 1);
};

const getCreateInitialValues = async (): Promise<FormValues> => {
  const clubes = await clubesApi.listar();

  return {
    ...initialValues(),
    codigo_club: getNextClubCode(clubes),
  };
};

const toFormPayload = (values: FormValues): ClubFormPayload => ({
  payload: {
    codigo_club: optionalText(values.codigo_club),
    nombre_club: String(values.nombre_club).trim(),
    siglas: optionalText(values.siglas),
    logo_url: optionalText(values.logo_url),
    estado: String(values.estado),
  },
  logoFile: values.logo_file instanceof File ? values.logo_file : null,
});

const resolveLogo = async ({ payload, logoFile }: ClubFormPayload) => {
  if (!logoFile) {
    return payload;
  }

  const upload = await uploadClubLogo(logoFile);
  return { ...payload, logo_url: upload.url };
};

export function ClubesPage() {
  return (
    <AdminCrudPage
      title="Clubes"
      description="Administra los clubes participantes del campeonato."
      itemName="Club"
      columns={columns}
      fields={fields}
      list={clubesApi.listar}
      create={async (formPayload) =>
        clubesApi.crear((await resolveLogo(formPayload)) as ClubPayload)
      }
      update={async (id, formPayload) =>
        clubesApi.actualizar(id, await resolveLogo(formPayload))
      }
      getId={(club) => club.id_club}
      getInitialValues={initialValues}
      getCreateInitialValues={getCreateInitialValues}
      toCreatePayload={toFormPayload}
      toUpdatePayload={toFormPayload}
      statusToggle={{
        isActive: (club) => club.estado === 'ACTIVO',
        buildPayload: (active) => ({
          payload: {
            estado: active ? 'ACTIVO' : 'INACTIVO',
          },
          logoFile: null,
        }),
      }}
      summaryCards={[
        { title: 'Total clubes', value: (items) => items.length, tone: 'slate', icon: 'T' },
        { title: 'Activos', value: (items) => items.filter((club) => club.estado === 'ACTIVO').length, tone: 'green', icon: 'A' },
        { title: 'Inactivos', value: (items) => items.filter((club) => club.estado !== 'ACTIVO').length, tone: 'red', icon: 'I' },
      ]}
      searchPlaceholder="Nombre, código o siglas"
      getSearchText={(club) =>
        [club.nombre_club, club.codigo_club, club.siglas].filter(Boolean).join(' ')
      }
      filters={[
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (club, value) => club.estado === value,
        },
      ]}
      emptyMessage="No hay clubes registrados."
    />
  );
}
