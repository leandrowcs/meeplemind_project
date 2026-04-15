import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES =
  'https://www.googleapis.com/auth/drive.appdata openid email profile';
const USER_KEY = 'meeplemind_google_user';

/**
 * Manages Google OAuth 2.0 token-based authentication using
 * Google Identity Services (GIS) implicit flow.
 *
 * The app only stores display information (name, email, picture)
 * in localStorage — never the access token itself.
 */
export const useGoogleAuth = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      setIsLoading(false);
      return;
    }

    const init = () => {
      // Restore cached display info (never the token)
      try {
        const saved = localStorage.getItem(USER_KEY);
        if (saved) setUser(JSON.parse(saved));
      } catch {}

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            setError(response.error);
            return;
          }
          setError(null);
          setAccessToken(response.access_token);
          setIsSignedIn(true);
          // Invalidate token 60 s before actual expiry to force re-auth
          const ttl = ((response.expires_in || 3600) - 60) * 1000;
          setTimeout(() => {
            setAccessToken(null);
            setIsSignedIn(false);
          }, ttl);
        },
      });

      setTokenClient(client);
      setIsLoading(false);
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
  }, []);

  // Fetch user display info after receiving an access token
  useEffect(() => {
    if (!accessToken) return;
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const info = {
          name: data.name,
          email: data.email,
          picture: data.picture,
        };
        setUser(info);
        localStorage.setItem(USER_KEY, JSON.stringify(info));
      })
      .catch(() => {});
  }, [accessToken]);

  const signIn = useCallback(() => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: '' });
  }, [tokenClient]);

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google?.accounts.oauth2.revoke(accessToken, () => {});
    }
    setIsSignedIn(false);
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, [accessToken]);

  return {
    isSignedIn,
    user,
    accessToken,
    isLoading,
    error,
    signIn,
    signOut,
    /** True when VITE_GOOGLE_CLIENT_ID is set in the environment */
    isConfigured: Boolean(CLIENT_ID),
  };
};
