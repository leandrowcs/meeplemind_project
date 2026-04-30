const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_PROXY_BASE = import.meta.env.DEV ? '/bggapi' : BGG_BASE;

export const GAME_DATA_PROVIDER = Object.freeze({
  AUTO: 'auto',
  BGG: 'bgg',
  LUDOPEDIA: 'ludopedia',
  BOTH: 'both',
});

export const OPEN_LIBRARY_CATALOG_KEY = 'meeplemind-open-library-catalog';
export const BGG_OFFLINE_CACHE_KEY = 'meeplemind-bgg-hot-offline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const bggUrl = (path) => `${BGG_PROXY_BASE}${path}`;

export const normalizeExternalImageUrl = (url) => {
  const normalized = String(url || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('http://')) return normalized.replace('http://', 'https://');
  return normalized;
};

const decodeHtmlEntities = (str) => {
  const div = document.createElement('div');
  div.innerHTML = String(str || '');
  return div.textContent || div.innerText || '';
};

const cleanBggDescription = (raw, maxLen = 500) => {
  const decoded = decodeHtmlEntities(raw);
  const clean = decoded.replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.lastIndexOf(' ', maxLen);
  return clean.slice(0, cut > 0 ? cut : maxLen) + '\u2026';
};

const fetchBggXml = async (path, maxRetries = 4, retryBaseMs = 1200) => {
  const endpoint = bggUrl(path);

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const res = await fetch(endpoint, { credentials: 'omit' });

    // BGG/CDN can return transient states while cache warms up.
    if (res.status === 202 || res.status === 401) {
      await sleep(retryBaseMs * (attempt + 1));
      continue;
    }

    if (!res.ok) throw new Error(`BGG ${res.status}`);
    return res.text();
  }

  throw new Error('BGG timeout');
};

const parseBggSearchNames = (xmlText, limit = 8) => {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  const uniqueNames = new Set();
  const names = [];

  for (const item of items) {
    const primaryName = item.querySelector('name[type="primary"]')?.getAttribute('value');
    const fallbackName = item.querySelector('name')?.getAttribute('value');
    const cleanName = String(primaryName || fallbackName || '').trim();
    const key = cleanName.toLowerCase();

    if (!cleanName || uniqueNames.has(key)) continue;
    uniqueNames.add(key);
    names.push(cleanName);

    if (names.length >= limit) break;
  }

  return names;
};

const parseBggHotGames = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));

  return items.map((item) => ({
    id: item.getAttribute('id') || '',
    rank: Number.parseInt(item.getAttribute('rank') || '', 10) || null,
    name: item.querySelector('name')?.getAttribute('value') || '',
    thumbnail: item.querySelector('thumbnail')?.getAttribute('value') || '',
    yearPublished: item.querySelector('yearpublished')?.getAttribute('value') || '',
  })).filter((item) => item.name);
};

const searchBggId = async (gameName) => {
  const term = String(gameName || '').trim();
  if (!term) return null;

  // Try exact match first, then broad search.
  for (const exact of [true, false]) {
    const path =
      `/search?query=${encodeURIComponent(term)}&type=boardgame`
      + (exact ? '&exact=1' : '');
    const xml = await fetchBggXml(path, 4, 1500);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const item = doc.querySelector('item');
    if (item) return item.getAttribute('id');
  }

  return null;
};

const bggProvider = {
  id: GAME_DATA_PROVIDER.BGG,
  label: 'BoardGameGeek',
  enabled: true,
  async searchNames(term, limit = 8) {
    const xmlText = await fetchBggXml(
      `/search?query=${encodeURIComponent(term)}&type=boardgame`
    );
    return parseBggSearchNames(xmlText, limit);
  },
  async fetchGameDetailsByName(gameName) {
    const id = await searchBggId(gameName);
    if (!id) return null;

    const xml = await fetchBggXml(`/thing?id=${id}`, 4, 1500);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const item = doc.querySelector('item');
    if (!item) return null;

    return {
      thumbnail: normalizeExternalImageUrl(item.querySelector('thumbnail')?.textContent || ''),
      description: cleanBggDescription(item.querySelector('description')?.textContent || ''),
      minPlayers: item.querySelector('minplayers')?.getAttribute('value') || '',
      maxPlayers: item.querySelector('maxplayers')?.getAttribute('value') || '',
      source: GAME_DATA_PROVIDER.BGG,
    };
  },
  async fetchHotGames() {
    const xmlText = await fetchBggXml('/hot?type=boardgame');
    return parseBggHotGames(xmlText);
  },
  buildOfflinePayload(items) {
    const safeItems = Array.isArray(items) ? items.filter((item) => item?.name) : [];
    return {
      generatedAt: new Date().toISOString(),
      source: 'bgg-hot-boardgames',
      provider: GAME_DATA_PROVIDER.BGG,
      total: safeItems.length,
      items: safeItems,
    };
  },
};

const ludopediaProvider = {
  id: GAME_DATA_PROVIDER.LUDOPEDIA,
  label: 'Ludopedia',
  enabled: false,
  async searchNames() {
    return [];
  },
  async fetchGameDetailsByName() {
    return null;
  },
  async fetchHotGames() {
    return [];
  },
  buildOfflinePayload(items) {
    const safeItems = Array.isArray(items) ? items.filter((item) => item?.name) : [];
    return {
      generatedAt: new Date().toISOString(),
      source: 'ludopedia-catalog',
      provider: GAME_DATA_PROVIDER.LUDOPEDIA,
      total: safeItems.length,
      items: safeItems,
    };
  },
};

const PROVIDERS = {
  [GAME_DATA_PROVIDER.BGG]: bggProvider,
  [GAME_DATA_PROVIDER.LUDOPEDIA]: ludopediaProvider,
};

const fallbackProvider = PROVIDERS[GAME_DATA_PROVIDER.BGG];

const getProvider = (providerId) => PROVIDERS[providerId] || fallbackProvider;

const dedupeStrings = (values) => {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const safeValue = String(value || '').trim();
    if (!safeValue) return;
    const key = safeValue.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(safeValue);
  });

  return result;
};

const resolveProviderOrder = (mode, language) => {
  const effectiveMode = mode || GAME_DATA_PROVIDER.BGG;

  if (effectiveMode === GAME_DATA_PROVIDER.BOTH) {
    return [GAME_DATA_PROVIDER.BGG, GAME_DATA_PROVIDER.LUDOPEDIA]
      .map(getProvider)
      .filter((provider) => provider.enabled !== false);
  }

  if (effectiveMode === GAME_DATA_PROVIDER.AUTO) {
    const preferredOrder = language === 'pt-BR'
      ? [GAME_DATA_PROVIDER.LUDOPEDIA, GAME_DATA_PROVIDER.BGG]
      : [GAME_DATA_PROVIDER.BGG, GAME_DATA_PROVIDER.LUDOPEDIA];

    return preferredOrder
      .map(getProvider)
      .filter((provider) => provider.enabled !== false);
  }

  const selected = getProvider(effectiveMode);
  if (selected.enabled === false) {
    return [fallbackProvider];
  }

  return [selected];
};

export const listGameDataProviders = () => Object.values(PROVIDERS).map((provider) => ({
  id: provider.id,
  label: provider.label,
  enabled: provider.enabled !== false,
}));

export const searchProviderGameNames = async (
  term,
  {
    mode = GAME_DATA_PROVIDER.BGG,
    language = 'en-US',
    limit = 8,
  } = {}
) => {
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return [];

  const providerOrder = resolveProviderOrder(mode, language);
  const merged = [];
  let lastError = null;

  for (const provider of providerOrder) {
    try {
      const names = await provider.searchNames(cleanTerm, limit);
      merged.push(...names);
      if (mode !== GAME_DATA_PROVIDER.BOTH && mode !== GAME_DATA_PROVIDER.AUTO && merged.length >= limit) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  const deduped = dedupeStrings(merged).slice(0, limit);

  if (!deduped.length && lastError) {
    throw lastError;
  }

  return deduped;
};

export const fetchProviderGameDetailsByName = async (
  gameName,
  {
    mode = GAME_DATA_PROVIDER.BGG,
    language = 'en-US',
  } = {}
) => {
  const cleanName = String(gameName || '').trim();
  if (!cleanName) return null;

  const providerOrder = resolveProviderOrder(mode, language);
  let lastError = null;

  for (const provider of providerOrder) {
    try {
      const data = await provider.fetchGameDetailsByName(cleanName);
      if (data) return data;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
};

export const fetchProviderHotCatalogGames = async (
  {
    mode = GAME_DATA_PROVIDER.BGG,
    language = 'en-US',
  } = {}
) => {
  const providerOrder = resolveProviderOrder(mode, language);
  let lastError = null;

  for (const provider of providerOrder) {
    try {
      const items = await provider.fetchHotGames();
      return {
        providerId: provider.id,
        items: Array.isArray(items) ? items : [],
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;

  return {
    providerId: fallbackProvider.id,
    items: [],
  };
};

export const buildCatalogOfflinePayload = ({
  providerId = GAME_DATA_PROVIDER.BGG,
  items = [],
} = {}) => {
  const provider = getProvider(providerId);
  return provider.buildOfflinePayload(items);
};

export const readCatalogOfflinePayload = (rawValue) => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed?.items)) return null;

    return {
      generatedAt: parsed.generatedAt || null,
      source: parsed.source || '',
      provider: parsed.provider || GAME_DATA_PROVIDER.BGG,
      total: Number.isFinite(parsed.total) ? parsed.total : parsed.items.length,
      items: parsed.items,
    };
  } catch {
    return null;
  }
};
