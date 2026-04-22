export const normalizeCoverUrl = (url) => {
  const normalized = String(url || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('http://')) return normalized.replace('http://', 'https://');
  return normalized;
};

export const buildLibraryCoverMap = (libraryEntries = []) => {
  const map = new Map();

  (Array.isArray(libraryEntries) ? libraryEntries : []).forEach((entry) => {
    const name = String(entry?.name || '').trim().toLowerCase();
    if (!name || map.has(name)) return;

    const coverUrl = normalizeCoverUrl(entry?.coverUrl || '');
    if (coverUrl) map.set(name, coverUrl);
  });

  return map;
};

export const getCoverByGameName = (gameName, coverMap) => {
  if (!coverMap || typeof coverMap.get !== 'function') return '';
  const key = String(gameName || '').trim().toLowerCase();
  if (!key) return '';
  return coverMap.get(key) || '';
};
