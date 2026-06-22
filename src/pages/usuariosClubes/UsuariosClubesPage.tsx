import { useEffect, useMemo, useState } from 'react';
import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { clubesApi } from '../../api/clubesApi';
import { usuariosApi } from '../../api/usuariosApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import { useAuth } from '../../hooks/useAuth';
import type {
  Club,
  Usuario,
  UsuarioClub,
  UsuarioClubCreatePayload,
  UsuarioClubUpdatePayload,
} from '../../types';
import { requiredNumber } from '../../utils/formValues';

const initialValues = (association?: UsuarioClub): FormValues => ({
  id_usuario: association?.id_usuario?.toString() ?? '',
  id_club: association?.id_club?.toString() ?? '',
  activo: association?.activo ?? true,
});

const toCreatePayload = (
  values: FormValues,
): UsuarioClubCreatePayload => ({
  id_usuario: requiredNumber(values.id_usuario),
  id_club: requiredNumber(values.id_club),
  cargo: 'DELEGADO',
  activo: Boolean(values.activo),
});

const toUpdatePayload = (
  values: FormValues,
): UsuarioClubUpdatePayload => ({
  activo: Boolean(values.activo),
});

export function UsuariosClubesPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const usuarioNames = useMemo(
    () => new Map(usuarios.map((item) => [item.id_usuario, item.nombre_completo])),
    [usuarios],
  );
  const clubNames = useMemo(
    () => new Map(clubes.map((item) => [item.id_club, item.nombre_club])),
    [clubes],
  );

  useEffect(() => {
    if (user?.rol?.nombre_rol !== 'ADMINISTRADOR') {
      return;
    }

    Promise.all([usuariosApi.listar(), clubesApi.listar()])
      .then(([usuariosData, clubesData]) => {
        setUsuarios(
          usuariosData.filter(
            (usuario) => usuario.rol?.nombre_rol === 'DELEGADO',
          ),
        );
        setClubes(clubesData);
      })
      .catch(() =>
        setCatalogError('No se pudieron cargar usuarios y clubes.'),
      );
  }, [user?.rol?.nombre_rol]);

  const fields = useMemo(
    () => [
      {
        name: 'id_usuario',
        label: 'Usuario delegado',
        type: 'select' as const,
        required: true,
        hideOnEdit: true,
        options: usuarios.map((item) => ({
          value: String(item.id_usuario),
          label: `${item.nombre_completo} (${item.correo_electronico})`,
        })),
      },
      {
        name: 'id_club',
        label: 'Club',
        type: 'select' as const,
        required: true,
        hideOnEdit: true,
        options: clubes.map((item) => ({
          value: String(item.id_club),
          label: item.nombre_club,
        })),
      },
      { name: 'activo', label: 'Activo', type: 'checkbox' as const },
    ],
    [clubes, usuarios],
  );

  const columns = useMemo(() => {
    return [
      {
        key: 'club',
        header: 'Club',
        render: (item: UsuarioClub) =>
          clubNames.get(item.id_club) ?? item.id_club,
      },
      {
        key: 'usuario',
        header: 'Delegado',
        render: (item: UsuarioClub) =>
          usuarioNames.get(item.id_usuario) ?? item.id_usuario,
      },
      {
        key: 'correo',
        header: 'Correo',
        render: (item: UsuarioClub) =>
          usuarios.find((usuario) => usuario.id_usuario === item.id_usuario)
            ?.correo_electronico ?? '-',
      },
      {
        key: 'telefono',
        header: 'Teléfono',
        render: (item: UsuarioClub) =>
          usuarios.find((usuario) => usuario.id_usuario === item.id_usuario)
            ?.telefono ?? '-',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: UsuarioClub) => <StatusBadge active={item.activo} />,
      },
    ];
  }, [clubNames, usuarioNames, usuarios]);

  return (
    <AdminCrudPage
      title="Delegados por club"
      description="Asigna delegados responsables a cada club."
      itemName="Delegado"
      columns={columns}
      fields={fields}
      list={usuariosClubesApi.listar}
      create={async (payload) => {
        const asociaciones = await usuariosClubesApi.listar();
        const duplicated = asociaciones.some(
          (item) =>
            item.activo &&
            item.id_usuario === payload.id_usuario &&
            item.id_club === payload.id_club,
        );

        if (duplicated) {
          throw new Error('Ya existe una asociación activa para este delegado y club.');
        }

        return usuariosClubesApi.crear(payload);
      }}
      update={usuariosClubesApi.actualizar}
      getId={(item) => item.id_usuario_club}
      getInitialValues={initialValues}
      toCreatePayload={toCreatePayload}
      toUpdatePayload={toUpdatePayload}
      statusToggle={{
        isActive: (item) => item.activo,
        buildPayload: (activo) => ({ activo }),
      }}
      headerContent={
        catalogError ? (
          <p className="mt-2 text-sm text-red-700">{catalogError}</p>
        ) : null
      }
      summaryCards={[
        { title: 'Clubes con delegado', value: (items) => new Set(items.filter((item) => item.activo).map((item) => item.id_club)).size, tone: 'green', icon: 'C' },
        { title: 'Clubes sin delegado', value: (items) => clubes.filter((club) => !items.some((item) => item.activo && item.id_club === club.id_club)).length, tone: 'amber', icon: 'S' },
        { title: 'Delegados activos', value: (items) => new Set(items.filter((item) => item.activo).map((item) => item.id_usuario)).size, tone: 'blue', icon: 'D' },
      ]}
      searchPlaceholder="Club o delegado"
      getSearchText={(item) => {
        const usuario = usuarios.find((current) => current.id_usuario === item.id_usuario);
        return [
          clubNames.get(item.id_club),
          usuario?.nombre_completo,
          usuario?.correo_electronico,
          usuario?.telefono,
        ].filter(Boolean).join(' ');
      }}
      filters={[
        {
          name: 'estado',
          label: 'Estado',
          options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
          ],
          predicate: (item, value) =>
            value === 'ACTIVO' ? item.activo : !item.activo,
        },
      ]}
      emptyMessage="No hay usuarios asociados a clubes."
    />
  );
}
