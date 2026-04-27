const MAX_NAME_LENGTH = 100;
const MAX_PLAYER_LENGTH = 50;
const MAX_NOTES_LENGTH = 500;
const MAX_URL_LENGTH = 1000;
const MAX_IMAGE_SRC_LENGTH = 4 * 1024 * 1024;
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);
const SAFE_DATA_IMAGE_PREFIX = /^data:image\/(png|jpe?g|webp|gif|bmp);base64,/i;

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
 * Accept only absolute http/https URLs (or protocol-relative URLs).
 * Blocks javascript:, data:, file:, and other unsafe schemes.
 */
export const sanitizeUrl = (value, maxLength = MAX_URL_LENGTH) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed) return '';

  const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalized);
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

/**
 * Accepts either:
 * - absolute http/https image URLs
 * - base64 data URLs for a safe raster image subset
 */
export const sanitizeImageSource = (value, maxLength = MAX_IMAGE_SRC_LENGTH) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed) return '';

  if (trimmed.startsWith('data:')) {
    if (!SAFE_DATA_IMAGE_PREFIX.test(trimmed)) return '';
    const base64 = trimmed.split(',')[1] || '';
    if (!base64 || /[^A-Za-z0-9+/=]/.test(base64)) return '';
    return trimmed;
  }

  return sanitizeUrl(trimmed, maxLength);
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
      item.id.length <= 120 &&
      typeof item.game === 'string' &&
      item.game.length > 0 &&
      item.game.length <= MAX_NAME_LENGTH &&
      Array.isArray(item.players) &&
      item.players.length >= 1 &&
      item.players.length <= 20 &&
      item.players.every(
        (p) =>
          typeof p === 'string' &&
          p.length > 0 &&
          p.length <= MAX_PLAYER_LENGTH
      )
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
      item.id.length <= 120 &&
      typeof item.name === 'string' &&
      item.name.length > 0 &&
      item.name.length <= MAX_NAME_LENGTH
  );
};
