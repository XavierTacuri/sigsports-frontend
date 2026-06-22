export const formatTimeHHMM = (value?: string | null) => {
  if (!value) return '-';

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5);
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes(' ')) {
    const timePart = value.split(' ')[1];
    return timePart ? timePart.slice(0, 5) : '-';
  }

  if (value.includes('T')) {
    const timePart = value.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '-';
  }

  return value.slice(0, 5);
};

export const formatDateTimeNoSeconds = (
  dateValue?: string | null,
  timeValue?: string | null,
) => {
  if (!dateValue && !timeValue) return '-';

  const date = dateValue?.split('T')[0]?.split(' ')[0] ?? '';
  const time = formatTimeHHMM(timeValue ?? dateValue);

  if (date && time && time !== '-') {
    return `${date} ${time}`;
  }

  return date || time || '-';
};
