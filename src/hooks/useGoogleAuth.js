import { useState, useEffect, useCallback, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES =
  'https://www.googleapis.com/auth/drive.appdata openid email profile';
const USER_KEY = 'meeplemind_google_user';
const TOKEN_KEY = 'meeplemind_google_token';

const clearSavedToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore localStorage write failures.
  }
};

/**
 * Manages Google OAuth 2.0 token-based authentication using
 * Google Identity Services (GIS) implicit flow.
 *
 * Uses 'drive.appdata' scope to store backups in the app's hidden
 * data folder on Google Drive, enabling cross-device sync.
 *
 * Persists the access token in localStorage (with expiry) so login
 * survives page refreshes. Display info (name, email, picture) is also cached.
 */
export const useGoogleAuth = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);
  const [error, setError] = useState(null);
  const [needsReloginPrompt, setNeedsReloginPrompt] = useState(false);
  const expirationTimerRef = useRef(null);

  const clearTokenSession = useCallback((preserveUser = false) => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
    setAccessToken(null);
    setIsSignedIn(false);
    clearSavedToken();
    if (!preserveUser) {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const applyTokenSession = useCallback((token, expiresInSeconds = 3600) => {
    const ttl = Math.max(60, (expiresInSeconds || 3600) - 60) * 1000;
    const expiresAt = Date.now() + ttl;

    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }

    setAccessToken(token);
    setIsSignedIn(true);
    setNeedsReloginPrompt(false);

    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
    } catch {
      // Ignore localStorage write failures.
    }

    expirationTimerRef.current = setTimeout(() => {
      clearTokenSession(true);
      setNeedsReloginPrompt(true);
    }, ttl);
  }, [clearTokenSession]);

  useEffect(() => {
    if (!CLIENT_ID) {
      setIsLoading(false);
      return;
    }

    const init = () => {
      let hasCachedUser = false;

      // Restore cached display info
      try {
        const saved = localStorage.getItem(USER_KEY);
        if (saved) {
          setUser(JSON.parse(saved));
          hasCachedUser = true;
        }
      } catch {
        // Ignore malformed cached user data.
      }

      // Restore access token if still valid
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          const { token, expiresAt } = JSON.parse(savedToken);
          const remaining = expiresAt - Date.now();
          if (remaining > 60_000) {
            applyTokenSession(token, Math.floor(remaining / 1000));
          } else {
            clearSavedToken();
            if (localStorage.getItem(USER_KEY)) {
              setNeedsReloginPrompt(true);
            }
          }
        } else if (hasCachedUser) {
          // User was previously connected, but OAuth token is no longer present.
          setNeedsReloginPrompt(true);
        }
      } catch {
        clearSavedToken();
        if (localStorage.getItem(USER_KEY)) {
          setNeedsReloginPrompt(true);
        }
      }

      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              setError(response.error);
              return;
            }
            setError(null);
            applyTokenSession(response.access_token, response.expires_in || 3600);
          },
        });
        setTokenClient(client);
      } catch {
        setError('google-init-failed');
      } finally {
        setIsLoading(false);
      }
    };

    if (window.google?.accounts) {
      init();
    } else {
      // Script loaded via index.html — wait for it to be ready
      const existing = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existing) {
        existing.addEventListener('load', init);
        existing.addEventListener('error', () => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
    return () => {
      if (expirationTimerRef.current) {
        clearTimeout(expirationTimerRef.current);
      }
    };
  }, [applyTokenSession]);

  // Fetch user display info after receiving an access token
  useEffect(() => {
    if (!accessToken) return;
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          throw new Error('token-expired');
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const info = {
          name: data.name,
          email: data.email,
          picture: data.picture,
        };
        setUser(info);
        localStorage.setItem(USER_KEY, JSON.stringify(info));
      })
      .catch((err) => {
        if (String(err?.message || '').includes('token-expired')) {
          clearTokenSession(true);
          setNeedsReloginPrompt(true);
        }
      });
  }, [accessToken, clearTokenSession]);

  const signIn = useCallback((forcePrompt = false) => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  }, [tokenClient]);

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google?.accounts.oauth2.revoke(accessToken, () => {});
    }
    setNeedsReloginPrompt(false);
    clearTokenSession(false);
  }, [accessToken, clearTokenSession]);

  const acknowledgeReloginPrompt = useCallback(() => {
    setNeedsReloginPrompt(false);
  }, []);

  return {
    isSignedIn,
    user,
    accessToken,
    isLoading,
    error,
    needsReloginPrompt,
    signIn,
    signOut,
    acknowledgeReloginPrompt,
    /** True when VITE_GOOGLE_CLIENT_ID is set in the environment */
    isConfigured: Boolean(CLIENT_ID),
  };
};
