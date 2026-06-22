import api from './axiosConfig';

export interface CambiarContrasenaPayload {
  contrasena_actual: string;
  nueva_contrasena: string;
  confirmar_contrasena: string;
}

export const authApi = {
  cambiarContrasena: async (payload: CambiarContrasenaPayload) =>
    (await api.patch('/auth/cambiar-contrasena', payload)).data,
};
