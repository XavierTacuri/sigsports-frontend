const apiUrl = import.meta.env.VITE_API_URL ?? '';

export function getAssetUrl(path: string | null | undefined) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
