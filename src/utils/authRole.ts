type UserWithFlexibleRole = {
  nombre_rol?: unknown;
  rol?: unknown;
};

type RoleObject = {
  nombre_rol?: unknown;
};

export const getRoleName = (user: unknown) => {
  const authUser = user as UserWithFlexibleRole | null | undefined;
  const role = authUser?.rol;
  const roleObject = role as RoleObject | null | undefined;
  const rawRole =
    (typeof roleObject?.nombre_rol === 'string' && roleObject.nombre_rol) ||
    (typeof authUser?.nombre_rol === 'string' && authUser.nombre_rol) ||
    (typeof role === 'string' && role) ||
    '';

  return rawRole.trim().toUpperCase().replace(/^ROLE_/, '');
};
