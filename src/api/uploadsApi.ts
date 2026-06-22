import api from './axiosConfig';

export interface UploadResponse {
  url: string;
}

export async function uploadClubLogo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return (
    await api.post<UploadResponse>('/uploads/club-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  ).data;
}

async function uploadFile(path: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return (
    await api.post<UploadResponse>(path, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  ).data;
}

export function uploadJugadorFoto(file: File) {
  return uploadFile('/uploads/jugador-foto', file);
}

export function uploadJugadorDocumento(file: File) {
  return uploadFile('/uploads/jugador-documento', file);
}
