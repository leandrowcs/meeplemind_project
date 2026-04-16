import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText, sanitizeNumber, validateLibraryBackup } from '../utils/sanitize';

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

export const useLibrary = () => {
  const [library, setLibrary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIBRARY_KEY);
      setLibrary(stored ? JSON.parse(stored) : []);
    } catch {
      setLibrary([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      } catch (err) {
        console.error('Error saving library:', err);
      }
    }
  }, [library, isLoading]);

  const addToLibrary = useCallback(
    ({ name, category = '', minPlayers = null, maxPlayers = null } = {}) => {
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
          owned: false,
          addedAt: new Date().toISOString(),
        };
        added = entry;
        return [...prev, entry].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
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
        addedAt: new Date().toISOString(),
      };
      return [...prev, entry].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const removeFromLibrary = useCallback((gameId) => {
    setLibrary((prev) => prev.filter((g) => g.id !== gameId));
  }, []);

  const updateInLibrary = useCallback((gameId, updates) => {
    setLibrary((prev) =>
      prev.map((g) =>
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
              owned: updates.owned !== undefined ? updates.owned : g.owned,
            }
      )
    );
  }, []);

  const getGameNames = useCallback(
    () => library.map((g) => g.name),
    [library]
  );

  /** Replace the full library (used when loading from Google Drive). */
  const mergeFromDrive = useCallback((driveData) => {
    if (!validateLibraryBackup(driveData)) return;
    setLibrary((local) => {
      const localIds = new Set(local.map((g) => g.id));
      const merged = [
        ...local,
        ...driveData.filter((g) => !localIds.has(g.id)),
      ].sort((a, b) => a.name.localeCompare(b.name));
      return merged;
    });
  }, []);

  const clearLibrary = useCallback(() => setLibrary([]), []);

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
