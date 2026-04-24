import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeText,
  sanitizeNumber,
  sanitizeUrl,
  validateLibraryBackup,
} from '../utils/sanitize';
import {
  GAME_THEMES,
  GAME_MECHANICS as SESSION_GAME_MECHANICS,
  GAME_CATEGORIES as SESSION_GAME_CATEGORIES,
} from '../utils/classifications';

const LIBRARY_KEY = 'meeplemind_library';

export const GAME_CATEGORIES = [
  { value: 'abstract', label: 'library.categoryAbstract' },
  { value: 'adventure', label: 'library.categoryAdventure' },
  { value: 'war', label: 'library.categoryWar' },
  { value: 'economy', label: 'library.categoryEconomy' },
  { value: 'fantasy', label: 'library.categoryFantasy' },
  { value: 'science-fiction', label: 'library.categoryScienceFiction' },
  { value: 'historical', label: 'library.categoryHistorical' },
  { value: 'negotiation', label: 'library.categoryNegotiation' },
  { value: 'party', label: 'library.categoryParty' },
  { value: 'trivia', label: 'library.categoryTrivia' },
  { value: 'cards', label: 'library.categoryCards' },
];

export const GAME_MECHANICS = [
  { value: 'worker-placement', label: 'library.mechanicWorkerPlacement' },
  { value: 'deck-building', label: 'library.mechanicDeckBuilding' },
  { value: 'area-control', label: 'library.mechanicAreaControl' },
  { value: 'hand-management', label: 'library.mechanicHandManagement' },
  { value: 'dice-rolling', label: 'library.mechanicDiceRolling' },
  { value: 'hidden-roles', label: 'library.mechanicHiddenRoles' },
  { value: 'action-points', label: 'library.mechanicActionPoints' },
  { value: 'drafting', label: 'library.mechanicDrafting' },
  { value: 'set-collection', label: 'library.mechanicSetCollection' },
  { value: 'tile-placement', label: 'library.mechanicTilePlacement' },
];

export const GAME_TYPES = [
  { value: 'ameritrash', label: 'library.typeAmeritrash' },
  { value: 'eurogame', label: 'library.typeEurogame' },
  { value: 'hybrid', label: 'library.typeHybrid' },
  { value: 'gateway', label: 'library.typeGateway' },
  { value: 'filler', label: 'library.typeFiller' },
  { value: 'cooperative', label: 'library.typeCooperative' },
  { value: 'semi-cooperative', label: 'library.typeSemiCooperative' },
];

const LEGACY_CATEGORY_KEYS = [
  'strategy',
  'cooperative',
  'family',
  'rpg',
  'deck-building',
  'worker-placement',
  'euro',
  'other',
];

const categoryWhitelist = new Set([
  ...GAME_CATEGORIES.map((item) => item.value),
  ...LEGACY_CATEGORY_KEYS,
]);
const mechanicWhitelist = new Set(GAME_MECHANICS.map((item) => item.value));
const typeWhitelist = new Set(GAME_TYPES.map((item) => item.value));
const themeWhitelist = new Set(GAME_THEMES);
const sessionMechanicWhitelist = new Set(SESSION_GAME_MECHANICS);
const sessionGameCategoryWhitelist = new Set(SESSION_GAME_CATEGORIES);

const sanitizeLocalizedMap = (value, maxLength = 500) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized = {};
  Object.entries(value).forEach(([lang, text]) => {
    const languageKey = sanitizeText(String(lang || ''), 16);
    const content = sanitizeText(String(text || ''), maxLength);
    if (languageKey && content) normalized[languageKey] = content;
  });

  return normalized;
};

const normalizeIsoDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const sanitizeStringArray = (value, whitelist, maxItems = 10, maxLength = 60) => {
  if (!Array.isArray(value)) return [];

  const output = [];
  const seen = new Set();

  value.forEach((item) => {
    const clean = sanitizeText(String(item || ''), maxLength).toLowerCase();
    if (!clean || seen.has(clean)) return;
    if (whitelist && !whitelist.has(clean)) return;
    seen.add(clean);
    output.push(clean);
  });

  return output.slice(0, maxItems);
};

const normalizeCategories = ({ categories, category }) => {
  const normalizedCategories = sanitizeStringArray(categories, categoryWhitelist, 10, 60);
  if (normalizedCategories.length > 0) return normalizedCategories;

  const normalizedSingle = sanitizeText(String(category || ''), 60).toLowerCase();
  if (normalizedSingle && categoryWhitelist.has(normalizedSingle)) return [normalizedSingle];

  return [];
};

const normalizeMechanics = (mechanics) =>
  sanitizeStringArray(mechanics, mechanicWhitelist, 12, 60);

const normalizeType = (gameType) => {
  const clean = sanitizeText(String(gameType || ''), 60).toLowerCase();
  if (!clean) return '';
  return typeWhitelist.has(clean) ? clean : '';
};

const normalizeThemes = (themes) =>
  sanitizeStringArray(themes, themeWhitelist, 16, 60);

const normalizeSessionMechanics = (mechanics) =>
  sanitizeStringArray(mechanics, sessionMechanicWhitelist, 16, 60);

const normalizeSessionGameCategories = (categories) =>
  sanitizeStringArray(categories, sessionGameCategoryWhitelist, 10, 60);

const sanitizeLibraryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const cleanId = sanitizeText(String(entry.id || ''), 120);
  const cleanName = sanitizeText(String(entry.name || ''));
  if (!cleanId || !cleanName) return null;

  const categories = normalizeCategories({
    categories: entry.categories,
    category: entry.category,
  });

  return {
    id: cleanId,
    name: cleanName,
    category: categories[0] || '',
    categories,
    mechanics: normalizeMechanics(entry.mechanics),
    gameType: normalizeType(entry.gameType),
    themes: normalizeThemes(entry.themes),
    sessionMechanics: normalizeSessionMechanics(entry.sessionMechanics),
    sessionGameCategories: normalizeSessionGameCategories(entry.sessionGameCategories),
    minPlayers: sanitizeNumber(entry.minPlayers, 1, 20),
    maxPlayers: sanitizeNumber(entry.maxPlayers, 1, 20),
    description: sanitizeText(String(entry.description || ''), 500),
    coverUrl: sanitizeUrl(String(entry.coverUrl || ''), 1000),
    owned: Boolean(entry.owned),
    nameLocal: sanitizeLocalizedMap(entry.nameLocal, 120),
    descriptionLocal: sanitizeLocalizedMap(entry.descriptionLocal, 500),
    addedAt: normalizeIsoDate(entry.addedAt || entry.updatedAt),
    updatedAt: normalizeIsoDate(entry.updatedAt || entry.addedAt),
  };
};

const getGameCategories = (game) => {
  if (Array.isArray(game?.categories) && game.categories.length > 0) {
    return normalizeCategories({ categories: game.categories, category: '' });
  }

  if (game?.category) {
    return normalizeCategories({ categories: [], category: game.category });
  }

  return [];
};

export const useLibrary = () => {
  const [library, setLibrary] = useState(() => {
    try {
      const stored = localStorage.getItem(LIBRARY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      } catch (err) {
        console.error('Error saving library:', err);
      }
    }
  }, [library, isLoading]);

  const persistLibrary = (libraryArr) => {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(libraryArr)); } catch {
      // Intentionally ignore storage write failures (quota or browser policy).
    }
  };

  const addToLibrary = useCallback(
    ({
      name,
      category = '',
      categories = [],
      mechanics = [],
      gameType = '',
      themes = [],
      sessionMechanics = [],
      sessionGameCategories = [],
      minPlayers = null,
      maxPlayers = null,
      description = '',
      coverUrl = '',
      owned = false,
    } = {}) => {
      const cleanName = sanitizeText(name);
      if (!cleanName) return null;

      let added = null;
      setLibrary((prev) => {
        const exists = prev.some(
          (g) => g.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (exists) return prev;

        const normalizedCategories = normalizeCategories({ categories, category });
        const normalizedMechanics = normalizeMechanics(mechanics);
        const normalizedType = normalizeType(gameType);
        const normalizedThemes = normalizeThemes(themes);
        const normalizedSessionMechanics = normalizeSessionMechanics(sessionMechanics);
        const normalizedSessionGameCategories = normalizeSessionGameCategories(sessionGameCategories);

        const entry = {
          id: uuidv4(),
          name: cleanName,
          category: normalizedCategories[0] || '',
          categories: normalizedCategories,
          mechanics: normalizedMechanics,
          gameType: normalizedType,
          themes: normalizedThemes,
          sessionMechanics: normalizedSessionMechanics,
          sessionGameCategories: normalizedSessionGameCategories,
          minPlayers: sanitizeNumber(minPlayers, 1, 20),
          maxPlayers: sanitizeNumber(maxPlayers, 1, 20),
          description: sanitizeText(description, 500),
          coverUrl: sanitizeUrl(coverUrl, 1000),
          owned: Boolean(owned),
          nameLocal: {},
          descriptionLocal: {},
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        added = entry;
        const updated = [...prev, entry].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        persistLibrary(updated);
        return updated;
      });
      return added;
    },
    []
  );

  const ensureInLibrary = useCallback((gameName) => {
    const cleanName = sanitizeText(gameName);
    if (!cleanName) return;
    setLibrary((prev) => {
      const exists = prev.some(
        (g) => g.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) return prev;
      const entry = {
        id: uuidv4(),
        name: cleanName,
        category: '',
        categories: [],
        mechanics: [],
        gameType: '',
        themes: [],
        sessionMechanics: [],
        sessionGameCategories: [],
        minPlayers: null,
        maxPlayers: null,
        nameLocal: {},
        descriptionLocal: {},
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [...prev, entry].sort((a, b) => a.name.localeCompare(b.name));
      persistLibrary(updated);
      return updated;
    });
  }, []);

  const removeFromLibrary = useCallback((gameRef) => {
    const normalizedRef = typeof gameRef === 'string' ? gameRef.trim().toLowerCase() : '';
    setLibrary((prev) => {
      const updated = prev.filter((g) => {
        if (g.id && g.id === gameRef) return false;
        if (normalizedRef && g.name?.toLowerCase() === normalizedRef) return false;
        return true;
      });
      persistLibrary(updated);
      return updated;
    });
  }, []);

  const updateInLibrary = useCallback((gameId, updates) => {
    setLibrary((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== gameId) return g;

        const hasCategoriesUpdate = updates.categories !== undefined || updates.category !== undefined;
        const nextCategories = hasCategoriesUpdate
          ? normalizeCategories({ categories: updates.categories, category: updates.category })
          : getGameCategories(g);

        const hasMechanicsUpdate = updates.mechanics !== undefined;
        const nextMechanics = hasMechanicsUpdate
          ? normalizeMechanics(updates.mechanics)
          : normalizeMechanics(g.mechanics || []);

        const hasTypeUpdate = updates.gameType !== undefined;
        const nextType = hasTypeUpdate
          ? normalizeType(updates.gameType)
          : normalizeType(g.gameType);

        const hasThemesUpdate = updates.themes !== undefined;
        const nextThemes = hasThemesUpdate
          ? normalizeThemes(updates.themes)
          : normalizeThemes(g.themes || []);

        const hasSessionMechanicsUpdate = updates.sessionMechanics !== undefined;
        const nextSessionMechanics = hasSessionMechanicsUpdate
          ? normalizeSessionMechanics(updates.sessionMechanics)
          : normalizeSessionMechanics(g.sessionMechanics || []);

        const hasSessionGameCategoriesUpdate = updates.sessionGameCategories !== undefined;
        const nextSessionGameCategories = hasSessionGameCategoriesUpdate
          ? normalizeSessionGameCategories(updates.sessionGameCategories)
          : normalizeSessionGameCategories(g.sessionGameCategories || []);

        const sanitizedName = updates.name !== undefined ? sanitizeText(updates.name) : '';

        return {
          ...g,
          name: sanitizedName || g.name,
          category: nextCategories[0] || '',
          categories: nextCategories,
          mechanics: nextMechanics,
          gameType: nextType,
          themes: nextThemes,
          sessionMechanics: nextSessionMechanics,
          sessionGameCategories: nextSessionGameCategories,
          minPlayers:
            updates.minPlayers !== undefined
              ? sanitizeNumber(updates.minPlayers, 1, 20)
              : g.minPlayers,
          maxPlayers:
            updates.maxPlayers !== undefined
              ? sanitizeNumber(updates.maxPlayers, 1, 20)
              : g.maxPlayers,
          description:
            updates.description !== undefined
              ? sanitizeText(updates.description, 500)
              : g.description ?? '',
          coverUrl:
            updates.coverUrl !== undefined
              ? sanitizeUrl(updates.coverUrl, 1000)
              : g.coverUrl ?? '',
          owned: updates.owned !== undefined ? updates.owned : g.owned,
          nameLocal:
            updates.nameLocal !== undefined
              ? updates.nameLocal
              : g.nameLocal ?? {},
          descriptionLocal:
            updates.descriptionLocal !== undefined
              ? updates.descriptionLocal
              : g.descriptionLocal ?? {},
          updatedAt: new Date().toISOString(),
        };
      });

      persistLibrary(updated);
      return updated;
    });
  }, []);

  const getGameNames = useCallback(
    () => library.map((g) => g.name),
    [library]
  );

  const mergeFromDrive = useCallback((driveData) => {
    if (!validateLibraryBackup(driveData)) return;
    setLibrary((local) => {
      const sanitizedDriveData = driveData
        .map(sanitizeLibraryEntry)
        .filter(Boolean);

      if (sanitizedDriveData.length === 0) return local;

      const localMap = new Map(local.map((g) => [g.id, g]));
      const driveMap = new Map(sanitizedDriveData.map((g) => [g.id, g]));
      const allIds = new Set([...localMap.keys(), ...driveMap.keys()]);
      const merged = Array.from(allIds).map((id) => {
        const loc = localMap.get(id);
        const drv = driveMap.get(id);
        if (!loc) return drv;
        if (!drv) return loc;
        const locTime = new Date(loc.updatedAt || loc.addedAt).getTime();
        const drvTime = new Date(drv.updatedAt || drv.addedAt).getTime();
        return drvTime > locTime ? drv : loc;
      });

      const sorted = merged.sort((a, b) => a.name.localeCompare(b.name));
      persistLibrary(sorted);
      return sorted;
    });
  }, []);

  const clearLibrary = useCallback(() => {
    setLibrary([]);
    persistLibrary([]);
  }, []);

  return {
    library,
    isLoading,
    addToLibrary,
    ensureInLibrary,
    removeFromLibrary,
    updateInLibrary,
    getGameNames,
    mergeFromDrive,
    clearLibrary,
  };
};