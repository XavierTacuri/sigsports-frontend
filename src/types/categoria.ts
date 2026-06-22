export interface Categoria {
  id_categoria?: number;
  nombre_categoria: string;
  genero: string | null;
  edad_minima: number | null;
  edad_maxima: number | null;
  descripcion: string | null;
  activo: boolean;
}

export type CategoriaPayload = Omit<Categoria, 'id_categoria'>;
