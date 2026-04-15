import { useCallback, useRef } from 'react';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const GAMES_FILE = 'meeplemind_games.json';
const LIBRARY_FILE = 'meeplemind_library.json';

/**
 * CRUD helpers for the Google Drive appDataFolder.
 * The appDataFolder is hidden from the user and private to this app.
 *
 * @param {string|null} accessToken  OAuth 2.0 access token from useGoogleAuth
 */
export const useGoogleDrive = (accessToken) => {
  // In-memory cache of Drive file IDs to avoid repeated list calls
  const cachedIds = useRef({});

  const authHeader = useCallback(
    (extra = {}) => ({ Authorization: `Bearer ${accessToken}`, ...extra }),
    [accessToken]
  );

  /** Resolve the Drive file ID for a given filename (reads cache first). */
  const findFileId = useCallback(
    async (name) => {
      if (cachedIds.current[name]) return cachedIds.current[name];
      try {
        const res = await fetch(
          `${DRIVE_API}/files?spaces=appDataFolder&q=name%3D'${encodeURIComponent(name)}'&fields=files(id)`,
          { headers: authHeader() }
        );
        if (!res.ok) return null;
        const { files } = await res.json();
        const id = files?.[0]?.id ?? null;
        if (id) cachedIds.current[name] = id;
        return id;
      } catch {
        return null;
      }
    },
    [authHeader]
  );

  /**
   * Create or overwrite a JSON file in the appDataFolder.
   * Returns true on success.
   */
  const saveFile = useCallback(
    async (name, data) => {
      if (!accessToken) return false;
      const body = JSON.stringify(data);
      try {
        const fileId = await findFileId(name);
        if (fileId) {
          // Patch content only — metadata stays the same
          const res = await fetch(
            `${UPLOAD_API}/files/${fileId}?uploadType=media`,
            {
              method: 'PATCH',
              headers: authHeader({ 'Content-Type': 'application/json' }),
              body,
            }
          );
          return res.ok;
        } else {
          // Multipart upload: metadata + content
          const form = new FormData();
          form.append(
            'metadata',
            new Blob(
              [JSON.stringify({ name, parents: ['appDataFolder'] })],
              { type: 'application/json' }
            )
          );
          form.append('file', new Blob([body], { type: 'application/json' }));
          const res = await fetch(
            `${UPLOAD_API}/files?uploadType=multipart`,
            { method: 'POST', headers: authHeader(), body: form }
          );
          if (res.ok) {
            const created = await res.json();
            cachedIds.current[name] = created.id;
          }
          return res.ok;
        }
      } catch {
        return false;
      }
    },
    [accessToken, findFileId, authHeader]
  );

  /** Load a JSON file from the appDataFolder. Returns null if not found. */
  const loadFile = useCallback(
    async (name) => {
      if (!accessToken) return null;
      try {
        const fileId = await findFileId(name);
        if (!fileId) return null;
        const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
          headers: authHeader(),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    [accessToken, findFileId, authHeader]
  );

  const saveGames = useCallback((g) => saveFile(GAMES_FILE, g), [saveFile]);
  const loadGames = useCallback(() => loadFile(GAMES_FILE), [loadFile]);
  const saveLibrary = useCallback((l) => saveFile(LIBRARY_FILE, l), [saveFile]);
  const loadLibrary = useCallback(() => loadFile(LIBRARY_FILE), [loadFile]);

  return { saveGames, loadGames, saveLibrary, loadLibrary };
};
