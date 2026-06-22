import { useCallback, useEffect, useMemo, useState } from 'react';
import { clubesApi } from '../../api/clubesApi';
import { usuariosApi } from '../../api/usuariosApi';
import { usuariosClubesApi } from '../../api/usuariosClubesApi';
import {
  AdminCrudPage,
  type FormValues,
} from '../../components/admin/AdminCrudPage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import type {
  Club,
  Rol,
  Usuario,
  UsuarioClub,
  UsuarioCreatePayload,
  UsuarioUpdatePayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { optionalText, requiredNumber } from '../../utils/formValues';

interface UsuarioCreateFormPayload {
  usuario: UsuarioCreatePayload;
  idClub: number | null;
  isDelegate: boolean;
}

interface UsuarioUpdateFormPayload {
  usuario: UsuarioUpdatePayload;
  idClub: number | null;
  isDelegate: boolean;
  associationId: number | null;
  manageAssociation: boolean;
}

export function UsuariosPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [associations, setAssociations] = useState<UsuarioClub[]>([]);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    if (user?.rol?.nombre_rol !== 'ADMINISTRADOR') {
      return;
    }

    Promise.all([
      usuariosApi.listarRoles(),
      clubesApi.listar(),
      usuariosClubesApi.listar(),
    ])
      .then(([rolesData, clubesData, associationsData]) => {
        setRoles(rolesData);
        setClubes(clubesData);
        setAssociations(associationsData);
      })
      .catch(() =>
        setCatalogError(
          'No se pudieron cargar roles, clubes o asociaciones.',
        ),
      );
  }, [user?.rol?.nombre_rol]);

  const delegateRole = roles.find((role) => role.nombre_rol === 'DELEGADO');

  const getActiveAssociation = useCallback(
    (idUsuario?: number) =>
      associations.find(
        (association) =>
          association.id_usuario === idUsuario && association.activo,
      ),
    [associations],
  );

  const initialValues = (usuario?: Usuario): FormValues => {
    const association = getActiveAssociation(usuario?.id_usuario);

    return {
      id_rol: usuario?.id_rol?.toString() ?? '',
      nombre_completo: usuario?.nombre_completo ?? '',
      correo_electronico: usuario?.correo_electronico ?? '',
      contrasena: '',
      telefono: usuario?.telefono ?? '',
      activo: usuario?.activo ?? true,
      id_club: association?.id_club?.toString() ?? '',
      association_id: association?.id_usuario_club?.toString() ?? '',
    };
  };

  const fields = useMemo(
    () => [
      {
        name: 'id_rol',
        label: 'Rol',
        type: 'select' as const,
        required: true,
        options: roles
          .filter((role) => role.activo)
          .map((role) => ({
            value: String(role.id_rol),
            label: role.nombre_rol,
          })),
      },
      {
        name: 'id_club',
        label: 'Club asignado',
        type: 'select' as const,
        required: true,
        options: clubes
          .filter((club) => club.estado === 'ACTIVO')
          .map((club) => ({
            value: String(club.id_club),
            label: club.nombre_club,
          })),
        showWhen: (values: FormValues) =>
          Number(values.id_rol) === delegateRole?.id_rol,
      },
      { name: 'nombre_completo', label: 'Nombre completo', required: true },
      {
        name: 'correo_electronico',
        label: 'Correo electrónico',
        type: 'email' as const,
        required: true,
        hideOnEdit: true,
      },
      {
        name: 'contrasena',
        label: 'Contraseña',
        type: 'password' as const,
        required: true,
        hideOnEdit: true,
      },
      { name: 'telefono', label: 'Teléfono' },
      { name: 'activo', label: 'Activo', type: 'checkbox' as const },
    ],
    [clubes, delegateRole?.id_rol, roles],
  );

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Usuario',
        render: (item: Usuario) => item.nombre_completo,
      },
      {
        key: 'correo',
        header: 'Correo',
        render: (item: Usuario) => item.correo_electronico,
      },
      {
        key: 'rol',
        header: 'Rol',
        render: (item: Usuario) =>
          item.rol?.nombre_rol ??
          roles.find((role) => role.id_rol === item.id_rol)?.nombre_rol ??
          item.id_rol,
      },
      {
        key: 'telefono',
        header: 'Teléfono',
        render: (item: Usuario) => item.telefono || '-',
      },
      {
        key: 'club',
        header: 'Club asignado',
        render: (item: Usuario) => {
          const association = getActiveAssociation(item.id_usuario);
          return (
            clubes.find((club) => club.id_club === association?.id_club)
              ?.nombre_club ?? '-'
          );
        },
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item: Usuario) => <StatusBadge active={item.activo} />,
      },
    ],
    [clubes, getActiveAssociation, roles],
  );

  const toCreatePayload = (
    values: FormValues,
  ): UsuarioCreateFormPayload => {
    const isDelegate = Number(values.id_rol) === delegateRole?.id_rol;

    return {
      usuario: {
        id_rol: requiredNumber(values.id_rol),
        nombre_completo: String(values.nombre_completo).trim(),
        correo_electronico: String(values.correo_electronico).trim(),
        contrasena: String(values.contrasena),
        telefono: optionalText(values.telefono),
        activo: Boolean(values.activo),
      },
      idClub: isDelegate ? requiredNumber(values.id_club) : null,
      isDelegate,
    };
  };

  const toUpdatePayload = (
    values: FormValues,
  ): UsuarioUpdateFormPayload => {
    const isDelegate = Number(values.id_rol) === delegateRole?.id_rol;

    return {
      usuario: {
        id_rol: requiredNumber(values.id_rol),
        nombre_completo: String(values.nombre_completo).trim(),
        telefono: optionalText(values.telefono),
        activo: Boolean(values.activo),
      },
      idClub: isDelegate ? requiredNumber(values.id_club) : null,
      isDelegate,
      associationId: values.association_id
        ? Number(values.association_id)
        : null,
      manageAssociation: true,
    };
  };

  const createUser = async (formPayload: UsuarioCreateFormPayload) => {
    const createdUser = await usuariosApi.crear(formPayload.usuario);

    if (!formPayload.isDelegate) {
      return createdUser;
    }

    if (!createdUser.id_usuario || !formPayload.idClub) {
      throw new Error('El delegado requiere un club asignado.');
    }

    try {
      const association = await usuariosClubesApi.crear({
        id_usuario: createdUser.id_usuario,
        id_club: formPayload.idClub,
        cargo: 'DELEGADO',
        activo: true,
      });
      setAssociations((current) => [...current, association]);
    } catch (error) {
      throw new Error(
        `El usuario fue creado, pero no se pudo asociar al club. ${getApiErrorMessage(
          error,
          '',
        )}`.trim(),
      );
    }

    return createdUser;
  };

  const updateUser = async (
    idUsuario: number,
    formPayload: UsuarioUpdateFormPayload,
  ) => {
    const updatedUser = await usuariosApi.actualizar(
      idUsuario,
      formPayload.usuario,
    );

    try {
      if (!formPayload.manageAssociation) {
        return updatedUser;
      }

      if (formPayload.isDelegate && formPayload.idClub) {
        const association = formPayload.associationId
          ? await usuariosClubesApi.actualizar(formPayload.associationId, {
              id_club: formPayload.idClub,
              cargo: 'DELEGADO',
              activo: true,
            })
          : await usuariosClubesApi.crear({
              id_usuario: idUsuario,
              id_club: formPayload.idClub,
              cargo: 'DELEGADO',
              activo: true,
            });

        setAssociations((current) => [
          ...current.filter(
            (item) => item.id_usuario_club !== association.id_usuario_club,
          ),
          association,
        ]);
      } else if (formPayload.associationId) {
        const association = await usuariosClubesApi.actualizar(
          formPayload.associationId,
          { activo: false },
        );
        setAssociations((current) => [
          ...current.filter(
            (item) => item.id_usuario_club !== association.id_usuario_club,
          ),
          association,
        ]);
      }
    } catch (error) {
      throw new Error(
        `El usuario fue actualizado, pero no se pudo actualizar su club. ${getApiErrorMessage(
          error,
          '',
        )}`.trim(),
      );
    }

    return updatedUser;
  };

  return (
    <AdminCrudPage
      title="Usuarios"
      description="Administra usuarios, roles y asignaciones de delegados."
      itemName="Usuario"
      columns={columns}
      fields={fields}
      list={usuariosApi.listar}
      create={createUser}
      update={updateUser}
      getId={(item) => item.id_usuario}
      getInitialValues={initialValues}
      toCreatePayload={toCreatePayload}
      toUpdatePayload={toUpdatePayload}
      statusToggle={{
        isActive: (item) => item.activo,
        buildPayload: (activo) => ({
          usuario: { activo },
          idClub: null,
          isDelegate: false,
          associationId: null,
          manageAssociation: false,
        }),
      }}
      headerContent={
        catalogError ? (
          <p className="mt-2 text-sm text-red-700">{catalogError}</p>
        ) : null
      }
      emptyMessage="No hay usuarios registrados."
    />
  );
}
