import type { FormValue } from '../components/admin/AdminCrudPage';

export function optionalText(value: FormValue | undefined) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function requiredNumber(value: FormValue | undefined) {
  return Number(value);
}

export function optionalNumber(value: FormValue | undefined) {
  return value === '' || value === undefined ? null : Number(value);
}
