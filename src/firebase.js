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
export const firebaseAuth = getAuth(app);

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
  const current = firebaseAuth.currentUser;
  if (current?.isAnonymous) return current.uid;
  if (current && !current.isAnonymous) {
    // Non-anonymous leftover — sign out before creating anonymous session
    await signOut(firebaseAuth).catch(() => {});
  }
  const result = await signInAnonymously(firebaseAuth);
  return result.user.uid;
};
