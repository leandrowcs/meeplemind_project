import { BGG_BUNDLED_CATALOG } from '../data/bggBundledCatalog.js';

// Always use the /bggapi relative path — in dev it hits the Vite proxy,
// in production it hits the Vercel rewrite (vercel.json).
// This avoids CORS issues in both environments.
const BGG_PROXY_BASE = '/bggapi';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const normalizeLudopediaBase = (value) => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return '';
  if (typeof window === 'undefined') return normalized;

  const host = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const localDirectBases = new Set([
    'http://localhost:8787/api/ludopedia',
    'http://127.0.0.1:8787/api/ludopedia',
  ]);

  // Keep same-origin requests in local dev to avoid CSP connect-src blocks.
  if (isLocalHost && localDirectBases.has(normalized)) {
    return '/api/ludopedia';
  }

  return normalized;
};

export const LUDOPEDIA_BFF_BASE = (() => {
  const configuredBase = normalizeLudopediaBase(import.meta.env.VITE_LUDOPEDIA_BFF_BASE);
  if (configuredBase) return configuredBase;

  return '/api/ludopedia';
})();

export const GAME_DATA_PROVIDER = Object.freeze({
  AUTO: 'auto',
  BGG: 'bgg',
  LUDOPEDIA: 'ludopedia',
  BOTH: 'both',
});

export const GAME_DATA_PROVIDER_PREFERENCE_KEY = 'meeplemind-game-data-provider';

const SUPPORTED_PROVIDER_MODES = new Set(Object.values(GAME_DATA_PROVIDER));

export const normalizeGameDataProviderMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return GAME_DATA_PROVIDER.BGG;
  return SUPPORTED_PROVIDER_MODES.has(normalized)
    ? normalized
    : GAME_DATA_PROVIDER.BGG;
};

export const OPEN_LIBRARY_CATALOG_KEY = 'meeplemind-open-library-catalog';
export const BGG_OFFLINE_CACHE_KEY = 'meeplemind-bgg-hot-offline';
export const LUDOPEDIA_CATALOG_CACHE_KEY = 'meeplemind-ludopedia-catalog';

export const readBundledBggCatalog = () => ({
  generatedAt: null,
  source: 'bundled',
  provider: GAME_DATA_PROVIDER.BGG,
  total: BGG_BUNDLED_CATALOG.length,
  items: BGG_BUNDLED_CATALOG,
});

// Non-boardgame filter for Ludopedia catalog (RPG books, supplements, etc.)
export const LUDOPEDIA_NON_BOARDGAME_PATTERN = /\blivro\b|\brpg\b|roleplay|roleplaying|\bsuplemento\b|\bsourcebook\b|\bmanual\b|\bguia\b|\bVampiro: A Máscara\b|\bD&D\b|\bPathfinder\b|\bStarfinder\b|\bGURPS\b|\bTales from the Loop\b|\bVampire: The Dark Ages\b|\bCaptive\b|\b3DX\b|\b3D&T|\bMago: A Ascensão\b|\bLobisomem: O Apocalipse\b|\bHitodama - A Jornada das almas\b|\bMódulo Básico\b|\bVampiro - Sozinho na Escuridão\b|\bA Herança de Cthulhu\b/i;

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

const parseJsonSafe = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const toNumericString = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? String(parsed) : '';
};

// Extract display names from Ludopedia detail arrays (mecanicas, categorias, temas).
// Each element may be a plain string or an object with a name field.
const extractLudopediaNames = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      return String(
        item?.nm_mecanica || item?.nm_categoria || item?.nm_tema || item?.nome || item?.name || ''
      ).trim();
    })
    .filter(Boolean);
};

const buildQuery = (query = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
};

const fetchLudopediaJson = async (path, query = {}) => {
  const endpoint = `${LUDOPEDIA_BFF_BASE}${path}${buildQuery(query)}`;
  const response = await fetch(endpoint, {
    credentials: 'include',
  });

  const text = await response.text();
  const data = parseJsonSafe(text);

  if (!response.ok) {
    const message = data?.error || `LUDOPEDIA ${response.status}`;
    throw new Error(message);
  }

  return data;
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
  async searchCatalogGames(term) {
    const xmlText = await fetchBggXml(
      `/search?query=${encodeURIComponent(term)}&type=boardgame`
    );
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));
    return items
      .slice(0, 200)
      .map((item, index) => ({
        id: item.getAttribute('id') || '',
        rank: index + 1,
        name:
          item.querySelector('name[type="primary"]')?.getAttribute('value') ||
          item.querySelector('name')?.getAttribute('value') ||
          '',
        thumbnail: '',
        yearPublished: item.querySelector('yearpublished')?.getAttribute('value') || '',
      }))
      .filter((item) => item.name);
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
  enabled: true,
  async searchNames(term, limit = 8) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 100));
    const result = await fetchLudopediaJson('/jogos', {
      search: term,
      tp_jogo: 'b',
      rows: safeLimit,
      page: 1,
    });

    const names = Array.isArray(result?.jogos)
      ? result.jogos
        .map((item) => String(item?.nm_jogo || '').trim())
        .filter(Boolean)
      : [];

    return dedupeStrings(names).slice(0, safeLimit);
  },
  async fetchGameDetailsByName(gameName) {
    const result = await fetchLudopediaJson('/jogos', {
      search: gameName,
      tp_jogo: 'b',
      rows: 8,
      page: 1,
    });

    const candidates = Array.isArray(result?.jogos) ? result.jogos : [];
    if (!candidates.length) return null;

    const normalized = String(gameName || '').trim().toLowerCase();
    const exact = candidates.find((item) => {
      const name = String(item?.nm_jogo || '').trim().toLowerCase();
      const original = String(item?.nm_original || '').trim().toLowerCase();
      return name === normalized || original === normalized;
    });

    const selected = exact || candidates[0];
    const selectedId = Number.parseInt(selected?.id_jogo, 10);
    if (!Number.isFinite(selectedId)) return null;

    const details = await fetchLudopediaJson(`/jogos/${selectedId}`);

    return {
      thumbnail: normalizeExternalImageUrl(details?.thumb || selected?.thumb || ''),
      description: '',
      minPlayers: toNumericString(details?.qt_jogadores_min),
      maxPlayers: toNumericString(details?.qt_jogadores_max),
      playTimeMinutes: toNumericString(details?.vl_tempo_jogo),
      mechanics: extractLudopediaNames(details?.mecanicas),
      categories: extractLudopediaNames(details?.categorias),
      themes: extractLudopediaNames(details?.temas),
      source: GAME_DATA_PROVIDER.LUDOPEDIA,
    };
  },
  async fetchHotGames(language = 'pt-BR') {
    const TOTAL_PAGES = 10;
    const ROWS = 100;
    const PAGE_BATCH = 3;
    const allEntries = [];

    for (let pageStart = 1; pageStart <= TOTAL_PAGES; pageStart += PAGE_BATCH) {
      const pageEnd = Math.min(pageStart + PAGE_BATCH - 1, TOTAL_PAGES);
      const pageNumbers = Array.from(
        { length: pageEnd - pageStart + 1 },
        (_, i) => pageStart + i
      );

      const results = await Promise.allSettled(
        pageNumbers.map((page) =>
          fetchLudopediaJson('/jogos', { tp_jogo: 'b', rows: ROWS, page })
        )
      );

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          const entries = Array.isArray(res.value?.jogos) ? res.value.jogos : [];
          allEntries.push(...entries);
        }
      });
    }

    // Deduplicate by id_jogo across pages.
    const seen = new Set();
    const unique = allEntries.filter((item) => {
      const id = String(item?.id_jogo || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const usePtBr = language === 'pt-BR';

    return unique
      .filter((item) => {
        const name = String(item?.nm_jogo || '').trim();
        return name && !LUDOPEDIA_NON_BOARDGAME_PATTERN.test(name);
      })
      .map((item, index) => {
        const nmJogo = String(item?.nm_jogo || '').trim();
        const nmOriginal = String(item?.nm_original || '').trim();
        const name = (!usePtBr && nmOriginal) ? nmOriginal : nmJogo;
        return {
          id: String(item?.id_jogo || ''),
          rank: index + 1,
          name,
          namePtBr: nmJogo,
          thumbnail: normalizeExternalImageUrl(item?.thumb || ''),
          yearPublished: toNumericString(item?.ano_publicacao),
        };
      });
  },
  async searchCatalogGames(term, language = 'pt-BR', limit = 20) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const result = await fetchLudopediaJson('/jogos', {
      search: term,
      tp_jogo: 'b',
      rows: safeLimit,
      page: 1,
    });
    const entries = Array.isArray(result?.jogos) ? result.jogos : [];
    const usePtBr = language === 'pt-BR';
    return entries
      .filter((item) => {
        const name = String(item?.nm_jogo || '').trim();
        return name && !LUDOPEDIA_NON_BOARDGAME_PATTERN.test(name);
      })
      .map((item, index) => {
        const nmJogo = String(item?.nm_jogo || '').trim();
        const nmOriginal = String(item?.nm_original || '').trim();
        const name = (!usePtBr && nmOriginal) ? nmOriginal : nmJogo;
        return {
          id: String(item?.id_jogo || ''),
          rank: index + 1,
          name,
          namePtBr: nmJogo,
          thumbnail: normalizeExternalImageUrl(item?.thumb || ''),
          yearPublished: toNumericString(item?.ano_publicacao),
        };
      });
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
  const effectiveMode = normalizeGameDataProviderMode(mode);

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

export const enrichBggSearchResults = async (items, onBatchEnriched) => {
  const toEnrich = items.filter((item) => item.id && !item.thumbnail);
  if (!toEnrich.length) return;

  const BATCH_SIZE = 20;
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    const ids = batch.map((item) => item.id).join(',');
    try {
      const xml = await fetchBggXml(`/thing?id=${ids}&type=boardgame`, 2, 1000);
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const thumbnailMap = {};
      doc.querySelectorAll('item').forEach((bggItem) => {
        const id = bggItem.getAttribute('id');
        const thumb = normalizeExternalImageUrl(
          bggItem.querySelector('thumbnail')?.textContent?.trim() || ''
        );
        if (id && thumb) thumbnailMap[id] = thumb;
      });
      onBatchEnriched(thumbnailMap);
    } catch {
      // skip failed batch silently
    }
  }
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
      const items = await provider.fetchHotGames(language);
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

export const searchProviderCatalogGames = async (
  term,
  {
    mode = GAME_DATA_PROVIDER.BGG,
    language = 'en-US',
    limit = 20,
  } = {}
) => {
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return { providerId: null, items: [] };

  const providerOrder = resolveProviderOrder(mode, language);
  let lastError = null;

  for (const provider of providerOrder) {
    try {
      const items = await provider.searchCatalogGames(cleanTerm, language, limit);
      return {
        providerId: provider.id,
        items: Array.isArray(items) ? items : [],
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return { providerId: null, items: [] };
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
