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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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

clearLegacyFirebaseAuthCache();
export const firebaseAuth = getAuth(app);
const ANON_AUTH_DISABLED_KEY = 'meeplemind-firebase-anon-auth-disabled';

const loadAnonymousAuthState = () => {
  try {
    return localStorage.getItem(ANON_AUTH_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistAnonymousAuthState = (isDisabled) => {
  try {
    if (isDisabled) {
      localStorage.setItem(ANON_AUTH_DISABLED_KEY, 'true');
    } else {
      localStorage.removeItem(ANON_AUTH_DISABLED_KEY);
    }
  } catch {
    return;
  }
};

let isAnonymousAuthUnavailable = loadAnonymousAuthState();

const isAnonymousSignInUnsupported = (err) => {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  return (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/admin-restricted-operation' ||
    code === 'auth/app-not-authorized' ||
    code === 'auth/invalid-api-key' ||
    message.includes('operation_not_allowed') ||
    message.includes('configuration_not_found')
  );
};

// One-shot cleanup: evict any non-anonymous (old Google) credential stored in
// IndexedDB by previous versions of this code. Without this, the Firebase SDK
// calls accounts:signInWithIdp on every page load to refresh that credential,
// which returns 400 (Bad Request) because the access token has expired.
const _unsubCleanup = onAuthStateChanged(firebaseAuth, async (user) => {
  _unsubCleanup();
  if (user && !user.isAnonymous) {
    await signOut(firebaseAuth).catch(() => {});
  }
});

/**
 * Ensures Firebase Auth is signed in (anonymously, persisted per browser).
 * Returns the Firebase UID. Safe to call on every Firestore operation.
 */
export const ensureFirebaseUser = async () => {
  if (isAnonymousAuthUnavailable) {
    throw new Error('anonymous-auth-unavailable');
  }

  const current = firebaseAuth.currentUser;
  if (current?.isAnonymous) return current.uid;
  if (current && !current.isAnonymous) {
    // Non-anonymous leftover — sign out before creating anonymous session
    await signOut(firebaseAuth).catch(() => {});
  }

  try {
    const result = await signInAnonymously(firebaseAuth);
    if (isAnonymousAuthUnavailable) {
      isAnonymousAuthUnavailable = false;
      persistAnonymousAuthState(false);
    }
    return result.user.uid;
  } catch (err) {
    if (isAnonymousSignInUnsupported(err)) {
      isAnonymousAuthUnavailable = true;
      persistAnonymousAuthState(true);
    }
    throw err;
  }
};
