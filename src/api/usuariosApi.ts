import api from './axiosConfig';
import type {
  Rol,
  Usuario,
  UsuarioCreatePayload,
  UsuarioUpdatePayload,
} from '../types';

export const usuariosApi = {
  listar: async () => (await api.get<Usuario[]>('/usuarios')).data,
  listarRoles: async () => (await api.get<Rol[]>('/roles')).data,
  crear: async (payload: UsuarioCreatePayload) =>
    (await api.post<Usuario>('/usuarios', payload)).data,
  actualizar: async (id: number, payload: UsuarioUpdatePayload) =>
    (await api.patch<Usuario>(`/usuarios/${id}`, payload)).data,
};
