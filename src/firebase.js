import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_FIREBASE_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

const isValidFirebaseValue = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (!normalized) return false;

  // Ignore common placeholder values from templates/.env.example.
  return !/^(changeme|your[_-]?|replace[_-]?)/i.test(normalized);
};

const hasValidFirebaseConfig = REQUIRED_FIREBASE_KEYS.every((key) =>
  isValidFirebaseValue(firebaseConfig[key])
);

let db = null;
let firebaseAuth = null;
let firebaseInitError = null;

const clearLegacyFirebaseAuthCache = () => {
  try {
    const prefix = `firebase:authUser:${firebaseConfig.apiKey}:`;
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && !parsed.isAnonymous) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
};

if (hasValidFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    clearLegacyFirebaseAuthCache();
    firebaseAuth = getAuth(app);
  } catch (err) {
    firebaseInitError = err;
    console.warn('Firebase disabled due to invalid runtime configuration.', err);
  }
} else {
  console.warn('Firebase disabled: missing or placeholder environment variables.');
}

export { db, firebaseAuth };

const ANON_AUTH_STATE_KEY = 'meeplemind-firebase-anon-auth-state';
const ANON_AUTH_LEGACY_DISABLED_KEY = 'meeplemind-firebase-anon-auth-disabled';
const ANON_AUTH_RETRY_COOLDOWN_MS = 2 * 60 * 1000;

const loadAnonymousAuthBlockedUntil = () => {
  try {
    // Legacy migration: older versions persisted a permanent disable flag.
    // Remove it to avoid blocking new manual retries forever.
    if (localStorage.getItem(ANON_AUTH_LEGACY_DISABLED_KEY) === 'true') {
      localStorage.removeItem(ANON_AUTH_LEGACY_DISABLED_KEY);
    }

    const raw = localStorage.getItem(ANON_AUTH_STATE_KEY);
    if (!raw) return 0;

    const parsed = JSON.parse(raw);
    const blockedUntil = Number(parsed?.blockedUntil || 0);

    if (!Number.isFinite(blockedUntil) || blockedUntil <= Date.now()) {
      localStorage.removeItem(ANON_AUTH_STATE_KEY);
      return 0;
    }

    return blockedUntil;
  } catch {
    return 0;
  }
};

const persistAnonymousAuthBlockedUntil = (blockedUntil) => {
  try {
    if (blockedUntil > Date.now()) {
      localStorage.setItem(
        ANON_AUTH_STATE_KEY,
        JSON.stringify({ blockedUntil })
      );
    } else {
      localStorage.removeItem(ANON_AUTH_STATE_KEY);
    }
  } catch {
    return;
  }
};

let anonymousAuthBlockedUntil = loadAnonymousAuthBlockedUntil();

const isAnonymousAuthTemporarilyBlocked = () =>
  anonymousAuthBlockedUntil > Date.now();

const createAnonymousAuthUnavailableError = (cause) => {
  const error = new Error('anonymous-auth-unavailable');
  if (cause) {
    try {
      error.cause = cause;
    } catch {
      // No-op: keep compatibility on runtimes without writable Error.cause.
    }
  }
  return error;
};

const isAnonymousSignInUnsupported = (err) => {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  return (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/admin-restricted-operation' ||
    code === 'auth/app-not-authorized' ||
    code === 'auth/invalid-api-key' ||
    message.includes('admin_restricted_operation') ||
    message.includes('admin-restricted-operation') ||
    message.includes('operation_not_allowed') ||
    message.includes('configuration_not_found')
  );
};

// One-shot cleanup: evict any non-anonymous (old Google) credential stored in
// IndexedDB by previous versions of this code. Without this, the Firebase SDK
// calls accounts:signInWithIdp on every page load to refresh that credential,
// which returns 400 (Bad Request) because the access token has expired.
if (firebaseAuth) {
  const _unsubCleanup = onAuthStateChanged(firebaseAuth, async (user) => {
    _unsubCleanup();
    if (user && !user.isAnonymous) {
      await signOut(firebaseAuth).catch(() => {});
    }
  });
}

/**
 * Ensures Firebase Auth is signed in (anonymously, persisted per browser).
 * Returns the Firebase UID. Safe to call on every Firestore operation.
 */
export const ensureFirebaseUser = async ({ forceRetry = false } = {}) => {
  if (!firebaseAuth) {
    throw createAnonymousAuthUnavailableError(firebaseInitError);
  }

  if (!forceRetry && isAnonymousAuthTemporarilyBlocked()) {
    throw createAnonymousAuthUnavailableError();
  }

  if (forceRetry && anonymousAuthBlockedUntil > 0) {
    anonymousAuthBlockedUntil = 0;
    persistAnonymousAuthBlockedUntil(0);
  }

  const current = firebaseAuth.currentUser;
  if (current?.isAnonymous) return current.uid;
  if (current && !current.isAnonymous) {
    // Non-anonymous leftover — sign out before creating anonymous session
    await signOut(firebaseAuth).catch(() => {});
  }

  try {
    const result = await signInAnonymously(firebaseAuth);
    if (anonymousAuthBlockedUntil > 0) {
      anonymousAuthBlockedUntil = 0;
      persistAnonymousAuthBlockedUntil(0);
    }
    return result.user.uid;
  } catch (err) {
    if (isAnonymousSignInUnsupported(err)) {
      anonymousAuthBlockedUntil = Date.now() + ANON_AUTH_RETRY_COOLDOWN_MS;
      persistAnonymousAuthBlockedUntil(anonymousAuthBlockedUntil);
      throw createAnonymousAuthUnavailableError(err);
    }
    throw err;
  }
};
