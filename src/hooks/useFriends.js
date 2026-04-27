import { useState, useCallback } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, ensureFirebaseUser } from '../firebase';
import { sanitizeText } from '../utils/sanitize';

const FRIENDS_KEY = 'meeplemind-friends';
const PUBLIC_KEY = 'meeplemind-profile-public';
const CACHE_KEY = 'meeplemind-friend-cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const loadFriendsFromStorage = () => {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveFriendsToStorage = (list) => {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
  } catch {}
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

const saveCache = (cacheObj) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
  } catch {}
};

/**
 * Computes the public stats snapshot to publish in Firestore.
 * Only minimal / aggregate data — no raw game entries.
 */
const buildSnapshot = (user, games, library) => {
  const playerGames = games.filter((g) =>
    Array.isArray(g.players) && g.players.includes(user.name)
  );

  const competitiveGames = playerGames.filter(
    (g) => (g.gameType || 'competitive') === 'competitive'
  );
  const coopGames = playerGames.filter((g) => g.gameType === 'cooperative');

  const totalGames = playerGames.length;
  const totalWins =
    competitiveGames.filter((g) => g.winner === user.name).length +
    coopGames.filter((g) => g.coopResult === 'win').length;
  const competitiveWinRate =
    competitiveGames.length > 0
      ? Math.round(
          (competitiveGames.filter((g) => g.winner === user.name).length /
            competitiveGames.length) *
            100
        )
      : 0;
  const coopSuccessRate =
    coopGames.length > 0
      ? Math.round(
          (coopGames.filter((g) => g.coopResult === 'win').length /
            coopGames.length) *
            100
        )
      : 0;

  const uniquePlayedGames = new Set(
    playerGames.map((g) => g.game).filter(Boolean)
  ).size;

  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const gamesLast30Days = playerGames.filter(
    (g) => g.date && new Date(g.date).getTime() >= cutoff
  ).length;

  const sortedGames = [...playerGames]
    .filter((g) => g.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastGame = sortedGames[0] || null;

  // Podium counts
  let podiumGold = 0, podiumSilver = 0, podiumBronze = 0;
  competitiveGames.forEach((g) => {
    const players = Array.isArray(g.players) ? g.players : [];
    if (!players.includes(user.name)) return;
    if (g.winner === user.name) {
      podiumGold += 1;
      return;
    }
    if (Array.isArray(g.points) && g.points.length >= players.length) {
      const ranked = players
        .map((p, i) => ({ p, pts: Number(g.points[i]) || 0 }))
        .sort((a, b) => b.pts - a.pts);
      const pos = ranked.findIndex((e) => e.p === user.name) + 1;
      if (pos === 2) podiumSilver += 1;
      if (pos === 3) podiumBronze += 1;
    }
  });

  // Longest win streak
  const ordered = competitiveGames
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let longestStreak = 0, currentStreak = 0;
  ordered.forEach((g) => {
    if (g.winner === user.name) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // Top game by plays
  const playsByGame = {};
  playerGames.forEach((g) => {
    if (!g.game) return;
    playsByGame[g.game] = (playsByGame[g.game] || 0) + 1;
  });
  const topGame =
    Object.entries(playsByGame).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // XP / level
  const libCount = Array.isArray(library) ? library.length : 0;
  const score =
    libCount * 25 +
    totalGames * 20 +
    totalWins * 35 +
    uniquePlayedGames * 18 +
    longestStreak * 45;
  const level = Math.max(1, Math.floor(score / 500) + 1);

  return {
    displayName: user.name || '',
    email: user.email || '',
    photoUrl: user.picture || '',
    isPublic: true,
    totalGames,
    gamesLast30Days,
    uniquePlayedGames,
    totalWins,
    competitiveWinRate,
    coopTotal: coopGames.length,
    coopSuccessRate,
    podiumGold,
    podiumSilver,
    podiumBronze,
    longestStreak,
    topGame,
    lastGame: lastGame?.game || null,
    lastGameDate: lastGame?.date || null,
    totalLibrary: libCount,
    level,
    xp: score,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * useFriends — manages the social/friends layer via Firestore.
 *
 * Requires auth.user + auth.accessToken from useGoogleAuth.
 * games and library are passed in from App.
 */
export const useFriends = (auth, games, library) => {
  const [friends, setFriends] = useState(loadFriendsFromStorage);
  const [isPublic, setIsPublicState] = useState(
    () => localStorage.getItem(PUBLIC_KEY) === 'true'
  );
  const [searchResult, setSearchResult] = useState(null); // null | 'not-found' | { uid, ...snap }
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  /**
   * Ensures Firebase Auth is signed in (anonymously, stable per browser).
   * Returns the Firebase UID.
   */
  const ensureFirebaseAuth = useCallback(async () => {
    if (!auth.isSignedIn) throw new Error('not-signed-in');
    return ensureFirebaseUser();
  }, [auth.isSignedIn]);

  /**
   * Publishes the current user's stats snapshot to Firestore.
   * Called automatically after Drive sync when isPublic === true.
   */
  const publishProfile = useCallback(async () => {
    if (!auth.isSignedIn || !auth.user) return;
    try {
      const uid = await ensureFirebaseAuth();
      const snapshot = buildSnapshot(auth.user, games, library);
      await setDoc(doc(db, 'users', uid), snapshot, { merge: true });
    } catch {
      // Non-blocking — sync failure does not surface to user
    }
  }, [auth.isSignedIn, auth.user, ensureFirebaseAuth, games, library]);

  /**
   * Toggles the public sharing flag and updates Firestore accordingly.
   */
  const setProfilePublic = useCallback(
    async (value) => {
      setIsPublicState(value);
      try {
        localStorage.setItem(PUBLIC_KEY, String(value));
      } catch {}
      if (!auth.isSignedIn || !auth.user) return;
      try {
        const uid = await ensureFirebaseAuth();
        if (value) {
          const snapshot = buildSnapshot(auth.user, games, library);
          await setDoc(doc(db, 'users', uid), snapshot, { merge: true });
        } else {
          await setDoc(
            doc(db, 'users', uid),
            { isPublic: false },
            { merge: true }
          );
        }
      } catch {
        // Non-blocking
      }
    },
    [auth.isSignedIn, auth.user, ensureFirebaseAuth, games, library]
  );

  /**
   * Searches for a public profile by email address.
   * Sets searchResult to the found profile object, 'not-found', or null on error.
   */
  const searchByEmail = useCallback(
    async (rawEmail) => {
      const email = sanitizeText(rawEmail).trim().toLowerCase();
      if (!email) return;
      setIsSearching(true);
      setSearchError(null);
      setSearchResult(null);
      try {
        await ensureFirebaseAuth();
        const q = query(
          collection(db, 'users'),
          where('isPublic', '==', true),
          where('email', '==', email)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setSearchResult('not-found');
        } else {
          const docSnap = snap.docs[0];
          setSearchResult({ uid: docSnap.id, ...docSnap.data() });
        }
      } catch {
        setSearchError('search-failed');
      } finally {
        setIsSearching(false);
      }
    },
    [ensureFirebaseAuth]
  );

  /**
   * Adds a friend to the local list (by uid).
   * friendData is the Firestore snapshot object with uid.
   */
  const addFriend = useCallback(
    (friendData) => {
      setFriends((prev) => {
        if (prev.some((f) => f.uid === friendData.uid)) return prev;
        const next = [
          ...prev,
          {
            uid: friendData.uid,
            displayName: friendData.displayName || '',
            email: friendData.email || '',
            photoUrl: friendData.photoUrl || '',
            addedAt: new Date().toISOString(),
          },
        ];
        saveFriendsToStorage(next);
        return next;
      });
      setSearchResult(null);
    },
    []
  );

  /**
   * Removes a friend from the local list by uid.
   */
  const removeFriend = useCallback((uid) => {
    setFriends((prev) => {
      const next = prev.filter((f) => f.uid !== uid);
      saveFriendsToStorage(next);
      return next;
    });
  }, []);

  /**
   * Fetches a friend's latest Firestore stats.
   * Uses a 5-minute local cache to reduce Firestore reads.
   */
  const getFriendStats = useCallback(
    async (uid) => {
      const cache = loadCache();
      const cached = cache[uid];
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.data;
      }
      try {
        await ensureFirebaseAuth();
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return null;
        const data = snap.data();
        const next = { ...cache, [uid]: { data, cachedAt: Date.now() } };
        saveCache(next);
        return data;
      } catch {
        return null;
      }
    },
    [ensureFirebaseAuth]
  );

  return {
    friends,
    isPublic,
    searchResult,
    isSearching,
    searchError,
    publishProfile,
    setProfilePublic,
    searchByEmail,
    addFriend,
    removeFriend,
    getFriendStats,
    setSearchResult,
  };
};
