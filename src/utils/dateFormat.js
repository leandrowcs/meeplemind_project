const LOCALE_MAP = {
  'pt-BR': 'pt-BR',
  'fr-CA': 'fr-CA',
  'en-US': 'en-US',
};

/**
 * Format an ISO date string to the locale-appropriate display format.
 * Parses date as local time to avoid UTC offset shifting the day.
 * pt-BR → dd/mm/yyyy, fr-CA → yyyy-mm-dd, en-US → mm/dd/yyyy
 */
export const formatDate = (isoDate, language = 'pt-BR') => {
  if (!isoDate) return '—';
  // Parse as local time to avoid UTC offset showing wrong day
  const dateStr = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(
    LOCALE_MAP[language] || 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).format(date);
};

/**
 * Format a Date object (not ISO string) to the locale-appropriate display format.
 */
export const formatDateObj = (date, language = 'pt-BR') => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(
    LOCALE_MAP[language] || 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).format(date);
};
