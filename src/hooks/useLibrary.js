import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeText,
  sanitizeNumber,
  sanitizeUrl,
  validateLibraryBackup,
} from '../utils/sanitize';

const LIBRARY_KEY = 'meeplemind_library';

export const GAME_CATEGORIES = [
  { value: 'strategy', label: 'library.categoryStrategy' },
  { value: 'cooperative', label: 'library.categoryCooperative' },
  { value: 'family', label: 'library.categoryFamily' },
  { value: 'party', label: 'library.categoryParty' },
  { value: 'rpg', label: 'library.categoryRPG' },
  { value: 'deck-building', label: 'library.categoryDeckBuilding' },
  { value: 'worker-placement', label: 'library.categoryWorkerPlacement' },
  { value: 'abstract', label: 'library.categoryAbstract' },
  { value: 'euro', label: 'library.categoryEuro' },
  { value: 'other', label: 'library.categoryOther' },
];

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

const sanitizeLibraryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const cleanId = sanitizeText(String(entry.id || ''), 120);
  const cleanName = sanitizeText(String(entry.name || ''));
  if (!cleanId || !cleanName) return null;

  return {
    id: cleanId,
    name: cleanName,
    category: sanitizeText(String(entry.category || ''), 50),
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

        const entry = {
          id: uuidv4(),
          name: cleanName,
          category: sanitizeText(category, 50),
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

  /**
   * Add a game by name only if it is not already in the library.
   * Used when registering a game session to silently grow the library.
   */
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
      const updated = prev.map((g) =>
        g.id !== gameId
          ? g
          : {
              ...g,
              name: updates.name ? sanitizeText(updates.name) : g.name,
              category:
                updates.category !== undefined
                  ? sanitizeText(updates.category, 50)
                  : g.category,
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
            }
      );
      persistLibrary(updated);
      return updated;
    });
  }, []);

  const getGameNames = useCallback(
    () => library.map((g) => g.name),
    [library]
  );

  /** Replace the full library (last-write-wins by updatedAt). */
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
        // Last-write-wins: compare updatedAt, fallback to addedAt
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
