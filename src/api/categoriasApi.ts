import api from './axiosConfig';
import type { Categoria, CategoriaPayload } from '../types';

export const categoriasApi = {
  listar: async () => (await api.get<Categoria[]>('/categorias')).data,
  crear: async (payload: CategoriaPayload) =>
    (await api.post<Categoria>('/categorias', payload)).data,
  actualizar: async (id: number, payload: Partial<CategoriaPayload>) =>
    (await api.patch<Categoria>(`/categorias/${id}`, payload)).data,
};
