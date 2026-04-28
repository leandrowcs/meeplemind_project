import { useState, useCallback, useEffect } from 'react';
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
import {
  sanitizeText,
  sanitizePlayerName,
  sanitizeNumber,
} from '../utils/sanitize';
import {
  GAME_CATEGORIES,
  GAME_MECHANICS,
  GAME_THEMES,
} from '../utils/classifications';

const FRIENDS_KEY = 'meeplemind-friends';
const PUBLIC_KEY = 'meeplemind-profile-public';
const CACHE_KEY = 'meeplemind-friend-cache';
const NOTIFICATIONS_KEY = 'meeplemind-notifications';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NETWORK_TIMEOUT_MS = 12000;
const NOTIFICATION_POLL_MS = 45000;
const MAX_NOTIFICATIONS = 60;

const NOTIFICATION_TYPE_FRIEND_REQUEST = 'friend-request';
const NOTIFICATION_TYPE_GAME_INVITE = 'game-invite';
const NOTIFICATION_STATUS_PENDING = 'pending';
const NOTIFICATION_STATUS_ACCEPTED = 'accepted';
const NOTIFICATION_STATUS_DISMISSED = 'dismissed';

const createNotificationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeIsoDate = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const withTimeout = (promise, timeoutMs = NETWORK_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });

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

const loadNotificationsFromStorage = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveNotificationsToStorage = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch {}
};

const sanitizeStringArray = (list, maxItems, allowedValues = null) => {
  if (!Array.isArray(list)) return [];
  const next = list
    .map((item) => sanitizeText(String(item || ''), 64))
    .filter(Boolean);
  const filtered =
    allowedValues && allowedValues.size
      ? next.filter((item) => allowedValues.has(item))
      : next;
  return [...new Set(filtered)].slice(0, maxItems);
};

const sanitizeGameInvitePayload = (rawGame) => {
  if (!rawGame || typeof rawGame !== 'object') return null;

  const players = Array.isArray(rawGame.players)
    ? rawGame.players.map(sanitizePlayerName).filter(Boolean).slice(0, 20)
    : [];

  if (!players.length) return null;

  const gameType = rawGame.gameType === 'cooperative' ? 'cooperative' : 'competitive';
  const points = Array.isArray(rawGame.points)
    ? rawGame.points
        .slice(0, players.length)
        .map((value) => sanitizeNumber(value, -99999, 999999) ?? 0)
    : [];

  while (points.length < players.length) {
    points.push(0);
  }

  const winner = rawGame.winner ? sanitizePlayerName(String(rawGame.winner)) : null;
  const coopResult =
    rawGame.coopResult === 'win' || rawGame.coopResult === 'loss'
      ? rawGame.coopResult
      : null;

  return {
    gameId: sanitizeText(String(rawGame.gameId || ''), 120),
    game: sanitizeText(String(rawGame.game || ''), 100),
    gameType,
    players,
    points,
    winner,
    coopResult,
    duration: sanitizeNumber(rawGame.duration, 1, 2880),
    date: normalizeIsoDate(rawGame.date) || new Date().toISOString(),
    ownGame: Boolean(rawGame.ownGame),
    targetName: sanitizePlayerName(rawGame.targetName || ''),
    themes: sanitizeStringArray(rawGame.themes, 16, new Set(GAME_THEMES)),
    mechanics: sanitizeStringArray(rawGame.mechanics, 16, new Set(GAME_MECHANICS)),
    gameCategories: sanitizeStringArray(rawGame.gameCategories, 10, new Set(GAME_CATEGORIES)),
  };
};

const normalizeNotificationStatus = (value) => {
  if (value === NOTIFICATION_STATUS_ACCEPTED) return NOTIFICATION_STATUS_ACCEPTED;
  if (value === NOTIFICATION_STATUS_DISMISSED) return NOTIFICATION_STATUS_DISMISSED;
  return NOTIFICATION_STATUS_PENDING;
};

const sanitizeNotification = (rawNotification) => {
  if (!rawNotification || typeof rawNotification !== 'object') return null;

  const type =
    rawNotification.type === NOTIFICATION_TYPE_GAME_INVITE
      ? NOTIFICATION_TYPE_GAME_INVITE
      : rawNotification.type === NOTIFICATION_TYPE_FRIEND_REQUEST
        ? NOTIFICATION_TYPE_FRIEND_REQUEST
        : null;

  if (!type) return null;

  const createdAt =
    normalizeIsoDate(rawNotification.createdAt) || new Date().toISOString();
  const id = sanitizeText(String(rawNotification.id || ''), 120) || createNotificationId();

  const base = {
    id,
    type,
    status: normalizeNotificationStatus(rawNotification.status),
    createdAt,
    updatedAt: normalizeIsoDate(rawNotification.updatedAt),
    fromUid: sanitizeText(String(rawNotification.fromUid || ''), 180),
    fromDisplayName: sanitizeText(rawNotification.fromDisplayName || '', 100),
    fromEmail: sanitizeText(rawNotification.fromEmail || '', 180).toLowerCase(),
    fromPhotoUrl: sanitizeText(rawNotification.fromPhotoUrl || '', 1000),
  };

  if (type === NOTIFICATION_TYPE_FRIEND_REQUEST) {
    const friendUid = sanitizeText(
      String(rawNotification.friend?.uid || rawNotification.fromUid || ''),
      180
    );
    if (!friendUid) return null;

    return {
      ...base,
      friend: {
        uid: friendUid,
        displayName: sanitizeText(
          rawNotification.friend?.displayName || rawNotification.fromDisplayName || '',
          100
        ),
        email: sanitizeText(
          rawNotification.friend?.email || rawNotification.fromEmail || '',
          180
        ).toLowerCase(),
        photoUrl: sanitizeText(
          rawNotification.friend?.photoUrl || rawNotification.fromPhotoUrl || '',
          1000
        ),
      },
    };
  }

  const game = sanitizeGameInvitePayload(rawNotification.game);
  if (!game) return null;

  return {
    ...base,
    game,
  };
};

const sanitizeNotificationsList = (rawNotifications) => {
  const seenIds = new Set();

  const sanitized = (Array.isArray(rawNotifications) ? rawNotifications : [])
    .map(sanitizeNotification)
    .filter((notification) => {
      if (!notification) return false;
      if (seenIds.has(notification.id)) return false;
      seenIds.add(notification.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    })
    .slice(0, MAX_NOTIFICATIONS);

  return sanitized;
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
  const competitiveWins = competitiveGames.filter((g) => g.winner === user.name).length;

  const totalGames = playerGames.length;
  const totalWins =
    competitiveWins +
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
    competitiveGames: competitiveGames.length,
    competitiveWins,
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
  const [publicShareError, setPublicShareError] = useState(null);
  const [friendSnapshots, setFriendSnapshots] = useState({});
  const [isRefreshingFriends, setIsRefreshingFriends] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // null | 'not-found' | { uid, ...snap }
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [notifications, setNotifications] = useState(() =>
    sanitizeNotificationsList(loadNotificationsFromStorage())
  );
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);

  /**
   * Ensures Firebase Auth is signed in (anonymously, stable per browser).
   * Returns the Firebase UID.
   */
  const ensureFirebaseAuth = useCallback(async (options = {}) => {
    if (!auth.isSignedIn) throw new Error('not-signed-in');
    return ensureFirebaseUser(options);
  }, [auth.isSignedIn]);

  const persistNotifications = useCallback((nextNotifications) => {
    const sanitized = sanitizeNotificationsList(nextNotifications);
    setNotifications(sanitized);
    saveNotificationsToStorage(sanitized);
    return sanitized;
  }, []);

  const writeNotificationsToCurrentUser = useCallback(
    async (nextNotifications) => {
      if (!auth.isSignedIn) return;
      try {
        const uid = await withTimeout(ensureFirebaseAuth());
        await withTimeout(
          setDoc(
            doc(db, 'users', uid),
            { notifications: sanitizeNotificationsList(nextNotifications) },
            { merge: true }
          )
        );
      } catch {
        // Non-blocking: local state remains source of truth while offline.
      }
    },
    [auth.isSignedIn, ensureFirebaseAuth]
  );

  const pushNotificationToUser = useCallback(async (targetUid, buildNotification) => {
    const cleanTargetUid = sanitizeText(String(targetUid || ''), 180);
    if (!cleanTargetUid || typeof buildNotification !== 'function') return false;

    try {
      const targetRef = doc(db, 'users', cleanTargetUid);
      const targetSnap = await withTimeout(getDoc(targetRef));
      if (!targetSnap.exists()) return false;

      const currentNotifications = sanitizeNotificationsList(
        targetSnap.data()?.notifications
      );
      const nextNotification = sanitizeNotification(
        buildNotification(currentNotifications)
      );

      if (!nextNotification) return false;

      const nextNotifications = sanitizeNotificationsList([
        nextNotification,
        ...currentNotifications,
      ]);

      await withTimeout(
        setDoc(
          targetRef,
          { notifications: nextNotifications },
          { merge: true }
        )
      );

      return true;
    } catch {
      return false;
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!auth.isSignedIn) {
      setNotificationsError(null);
      setIsLoadingNotifications(false);
      return persistNotifications([]);
    }

    setIsLoadingNotifications(true);
    setNotificationsError(null);

    try {
      const uid = await withTimeout(ensureFirebaseAuth());
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)));
      const next = sanitizeNotificationsList(snap.data()?.notifications);
      return persistNotifications(next);
    } catch {
      setNotificationsError('load-failed');
      return notifications;
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [auth.isSignedIn, ensureFirebaseAuth, notifications, persistNotifications]);

  useEffect(() => {
    if (!auth.isSignedIn) {
      persistNotifications([]);
      setNotificationsError(null);
      return undefined;
    }

    let isCancelled = false;

    const load = async () => {
      if (isCancelled) return;
      await refreshNotifications();
    };

    load();

    const poll = window.setInterval(() => {
      load();
    }, NOTIFICATION_POLL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(poll);
    };
  }, [auth.isSignedIn, persistNotifications, refreshNotifications]);

  const updateNotificationStatus = useCallback(
    async (notificationId, nextStatus) => {
      const cleanId = sanitizeText(String(notificationId || ''), 120);
      if (!cleanId) return null;

      const target = notifications.find((item) => item.id === cleanId);
      if (!target) return null;

      const normalizedStatus = normalizeNotificationStatus(nextStatus);
      const updated = notifications.map((item) => {
        if (item.id !== cleanId) return item;
        return {
          ...item,
          status: normalizedStatus,
          updatedAt: new Date().toISOString(),
        };
      });

      const persisted = persistNotifications(updated);
      await writeNotificationsToCurrentUser(persisted);
      return persisted.find((item) => item.id === cleanId) || null;
    },
    [notifications, persistNotifications, writeNotificationsToCurrentUser]
  );

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
    } catch (err) {
      console.error('Failed to publish public profile snapshot:', err);
      // Non-blocking — sync failure does not surface to user
    }
  }, [auth.isSignedIn, auth.user, ensureFirebaseAuth, games, library]);

  /**
   * Toggles the public sharing flag and updates Firestore accordingly.
   */
  const setProfilePublic = useCallback(
    async (value) => {
      setPublicShareError(null);
      setIsPublicState(value);
      try {
        localStorage.setItem(PUBLIC_KEY, String(value));
      } catch {}

      if (!auth.isSignedIn || !auth.user) {
        if (value) {
          setIsPublicState(false);
          try {
            localStorage.setItem(PUBLIC_KEY, 'false');
          } catch {}
          setPublicShareError('publish-failed');
          return false;
        }
        return true;
      }

      try {
        const uid = await withTimeout(ensureFirebaseAuth());
        if (value) {
          const snapshot = buildSnapshot(auth.user, games, library);
          await withTimeout(setDoc(doc(db, 'users', uid), snapshot, { merge: true }));
        } else {
          await withTimeout(
            setDoc(
              doc(db, 'users', uid),
              { isPublic: false },
              { merge: true }
            )
          );
        }
        return true;
      } catch (err) {
        if (err?.message !== 'anonymous-auth-unavailable') {
          console.error('Failed to update public profile sharing state:', err);
        }
        if (value) {
          setIsPublicState(false);
          try {
            localStorage.setItem(PUBLIC_KEY, 'false');
          } catch {}
        } else {
          setIsPublicState(true);
          try {
            localStorage.setItem(PUBLIC_KEY, 'true');
          } catch {}
        }
        setPublicShareError('publish-failed');
        return false;
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

  const sendFriendRequestNotification = useCallback(
    async (friendData) => {
      if (!auth.isSignedIn || !auth.user) return;

      const targetUid = sanitizeText(String(friendData?.uid || ''), 180);
      if (!targetUid) return;

      try {
        const senderUid = await withTimeout(ensureFirebaseAuth());
        if (!senderUid || senderUid === targetUid) return;

        const fromDisplayName = sanitizeText(auth.user.name || '', 100);
        const fromEmail = sanitizeText(auth.user.email || '', 180).toLowerCase();
        const fromPhotoUrl = sanitizeText(auth.user.picture || '', 1000);

        await pushNotificationToUser(targetUid, (existingNotifications) => {
          const hasPendingRequest = existingNotifications.some(
            (notification) =>
              notification.type === NOTIFICATION_TYPE_FRIEND_REQUEST &&
              notification.status === NOTIFICATION_STATUS_PENDING &&
              notification.fromUid === senderUid
          );

          if (hasPendingRequest) return null;

          return {
            id: createNotificationId(),
            type: NOTIFICATION_TYPE_FRIEND_REQUEST,
            status: NOTIFICATION_STATUS_PENDING,
            createdAt: new Date().toISOString(),
            fromUid: senderUid,
            fromDisplayName,
            fromEmail,
            fromPhotoUrl,
            friend: {
              uid: senderUid,
              displayName: fromDisplayName,
              email: fromEmail,
              photoUrl: fromPhotoUrl,
            },
          };
        });
      } catch {
        // Non-blocking: friend add should still succeed locally.
      }
    },
    [auth.isSignedIn, auth.user, ensureFirebaseAuth, pushNotificationToUser]
  );

  /**
   * Adds a friend to the local list (by uid).
   * friendData is the Firestore snapshot object with uid.
   */
  const addFriend = useCallback(
    (friendData, options = {}) => {
      const normalizedFriend = {
        uid: sanitizeText(String(friendData?.uid || ''), 180),
        displayName: sanitizeText(friendData?.displayName || '', 100),
        email: sanitizeText(friendData?.email || '', 180).toLowerCase(),
        photoUrl: sanitizeText(friendData?.photoUrl || '', 1000),
        lastUpdatedAt:
          normalizeIsoDate(friendData?.updatedAt || friendData?.lastUpdatedAt) || null,
      };

      if (!normalizedFriend.uid) return false;

      setFriends((prev) => {
        if (prev.some((f) => f.uid === normalizedFriend.uid)) return prev;

        const next = [
          ...prev,
          {
            ...normalizedFriend,
            addedAt: new Date().toISOString(),
          },
        ];

        saveFriendsToStorage(next);
        return next;
      });

      if (options.clearSearch !== false) {
        setSearchResult(null);
      }

      if (options.notifyBack !== false) {
        void sendFriendRequestNotification(normalizedFriend);
      }

      return true;
    },
    [sendFriendRequestNotification]
  );

  const notifyFriendsOfGame = useCallback(
    async (gameData, targetFriendUids = []) => {
      if (!auth.isSignedIn || !auth.user) return false;

      const uniqueTargetUids = [
        ...new Set(
          (Array.isArray(targetFriendUids) ? targetFriendUids : [])
            .map((uid) => sanitizeText(String(uid || ''), 180))
            .filter(Boolean)
        ),
      ];

      if (!uniqueTargetUids.length) return false;

      const gamePayload = sanitizeGameInvitePayload({
        gameId: gameData?.id,
        game: gameData?.game,
        gameType: gameData?.gameType,
        players: gameData?.players,
        points: gameData?.points,
        winner: gameData?.winner,
        coopResult: gameData?.coopResult,
        duration: gameData?.duration,
        date: gameData?.date,
        ownGame: gameData?.ownGame,
        themes: gameData?.themes,
        mechanics: gameData?.mechanics,
        gameCategories: gameData?.gameCategories,
      });

      if (!gamePayload || !gamePayload.game) return false;

      try {
        const senderUid = await withTimeout(ensureFirebaseAuth());
        if (!senderUid) return false;

        const fromDisplayName = sanitizeText(auth.user.name || '', 100);
        const fromEmail = sanitizeText(auth.user.email || '', 180).toLowerCase();
        const fromPhotoUrl = sanitizeText(auth.user.picture || '', 1000);
        const friendMap = new Map(friends.map((friend) => [friend.uid, friend]));

        const sends = uniqueTargetUids.map(async (targetUid) => {
          if (!targetUid || targetUid === senderUid) return false;

          const friendEntry = friendMap.get(targetUid);
          const targetName = sanitizePlayerName(friendEntry?.displayName || '');

          return pushNotificationToUser(targetUid, (existingNotifications) => {
            const hasPendingInvite = existingNotifications.some((notification) => {
              if (
                notification.type !== NOTIFICATION_TYPE_GAME_INVITE ||
                notification.status !== NOTIFICATION_STATUS_PENDING ||
                notification.fromUid !== senderUid
              ) {
                return false;
              }

              if (gamePayload.gameId && notification.game?.gameId) {
                return notification.game.gameId === gamePayload.gameId;
              }

              return (
                notification.game?.game === gamePayload.game &&
                notification.game?.date === gamePayload.date
              );
            });

            if (hasPendingInvite) return null;

            return {
              id: createNotificationId(),
              type: NOTIFICATION_TYPE_GAME_INVITE,
              status: NOTIFICATION_STATUS_PENDING,
              createdAt: new Date().toISOString(),
              fromUid: senderUid,
              fromDisplayName,
              fromEmail,
              fromPhotoUrl,
              game: {
                ...gamePayload,
                targetName,
              },
            };
          });
        });

        await Promise.all(sends);
        return true;
      } catch {
        return false;
      }
    },
    [
      auth.isSignedIn,
      auth.user,
      ensureFirebaseAuth,
      friends,
      pushNotificationToUser,
    ]
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

  const refreshFriendsData = useCallback(async () => {
    if (!friends.length) {
      setFriendSnapshots({});
      return {};
    }

    setIsRefreshingFriends(true);
    try {
      const entries = await Promise.all(
        friends.map(async (friend) => {
          const data = await getFriendStats(friend.uid);
          return [friend.uid, data];
        })
      );

      const nextSnapshots = {};
      entries.forEach(([uid, data]) => {
        if (data) nextSnapshots[uid] = data;
      });

      setFriendSnapshots(nextSnapshots);

      setFriends((prev) => {
        const next = prev.map((friend) => {
          const data = nextSnapshots[friend.uid];
          if (!data) return friend;
          return {
            ...friend,
            displayName: data.displayName || friend.displayName,
            photoUrl: data.photoUrl || friend.photoUrl,
            lastUpdatedAt: data.updatedAt || friend.lastUpdatedAt || null,
          };
        });
        saveFriendsToStorage(next);
        return next;
      });

      return nextSnapshots;
    } finally {
      setIsRefreshingFriends(false);
    }
  }, [friends, getFriendStats]);

  const pendingNotifications = notifications.filter(
    (notification) => notification.status === NOTIFICATION_STATUS_PENDING
  );

  const dismissNotification = useCallback(
    async (notificationId) => {
      await updateNotificationStatus(
        notificationId,
        NOTIFICATION_STATUS_DISMISSED
      );
    },
    [updateNotificationStatus]
  );

  const acceptFriendNotification = useCallback(
    async (notificationId) => {
      const cleanId = sanitizeText(String(notificationId || ''), 120);
      if (!cleanId) return false;

      const notification = notifications.find(
        (item) =>
          item.id === cleanId &&
          item.type === NOTIFICATION_TYPE_FRIEND_REQUEST &&
          item.status === NOTIFICATION_STATUS_PENDING
      );

      if (!notification?.friend?.uid) return false;

      addFriend(notification.friend, {
        notifyBack: false,
        clearSearch: false,
      });

      await updateNotificationStatus(cleanId, NOTIFICATION_STATUS_ACCEPTED);
      return true;
    },
    [addFriend, notifications, updateNotificationStatus]
  );

  const acceptGameInviteNotification = useCallback(
    async (notificationId) => {
      const cleanId = sanitizeText(String(notificationId || ''), 120);
      if (!cleanId) return null;

      const notification = notifications.find(
        (item) =>
          item.id === cleanId &&
          item.type === NOTIFICATION_TYPE_GAME_INVITE &&
          item.status === NOTIFICATION_STATUS_PENDING
      );

      if (!notification?.game) return null;

      const gamePayload = sanitizeGameInvitePayload(notification.game);
      if (!gamePayload) return null;

      await updateNotificationStatus(cleanId, NOTIFICATION_STATUS_ACCEPTED);

      return {
        ...gamePayload,
        fromUid: notification.fromUid,
        fromDisplayName: notification.fromDisplayName,
      };
    },
    [notifications, updateNotificationStatus]
  );

  return {
    friends,
    isPublic,
    publicShareError,
    friendSnapshots,
    isRefreshingFriends,
    searchResult,
    isSearching,
    searchError,
    notifications,
    pendingNotifications,
    pendingNotificationsCount: pendingNotifications.length,
    isLoadingNotifications,
    notificationsError,
    publishProfile,
    setProfilePublic,
    searchByEmail,
    addFriend,
    notifyFriendsOfGame,
    removeFriend,
    getFriendStats,
    refreshFriendsData,
    refreshNotifications,
    acceptFriendNotification,
    acceptGameInviteNotification,
    dismissNotification,
    setSearchResult,
  };
};
