const MAX_NAME_LENGTH = 100;
const MAX_PLAYER_LENGTH = 50;
const MAX_NOTES_LENGTH = 500;

/**
 * Strip HTML tags and prevent XSS injection in text inputs.
 * React already escapes JSX output, but this adds defense-in-depth
 * before values are persisted to localStorage / sent to Drive.
 */
const stripHtml = (str) => str.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '');

export const sanitizeText = (value, maxLength = MAX_NAME_LENGTH) => {
  if (typeof value !== 'string') return '';
  return stripHtml(value.trim()).slice(0, maxLength);
};

export const sanitizePlayerName = (value) => sanitizeText(value, MAX_PLAYER_LENGTH);

export const sanitizeNotes = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, MAX_NOTES_LENGTH);
};

/**
 * Parse an integer and clamp it within [min, max].
 * Returns null for invalid/empty values.
 */
export const sanitizeNumber = (value, min = 0, max = 9999) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  return Math.min(Math.max(num, min), max);
};

/**
 * Validate the structure of a JSON game backup before importing.
 * Prevents importing malformed or malicious data.
 */
export const validateGameBackup = (data) => {
  if (!Array.isArray(data)) return false;
  if (data.length > 10_000) return false; // sanity upper bound
  return data.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.game === 'string' &&
      Array.isArray(item.players) &&
      item.players.length >= 1 &&
      item.players.every((p) => typeof p === 'string')
  );
};

/**
 * Validate the structure of a JSON library backup before importing.
 */
export const validateLibraryBackup = (data) => {
  if (!Array.isArray(data)) return false;
  if (data.length > 5_000) return false;
  return data.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.name === 'string' &&
      item.name.length > 0
  );
};
