import axios from 'axios';

interface ValidationIssue {
  msg?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error al procesar la solicitud.',
) {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  if (error.response?.status === 403) {
    return 'No tienes permisos.';
  }

  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((issue: ValidationIssue) => issue.msg)
      .filter(Boolean)
      .join(' ');
  }

  if (typeof detail === 'string') {
    return detail;
  }

  return fallback;
}
