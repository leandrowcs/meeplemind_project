import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChessKnight,
  Dices,
  Gamepad2,
  Joystick,
  Swords,
} from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useLibrary } from './hooks/useLibrary';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { useFriends } from './hooks/useFriends';
import { useLanguage } from './hooks/useLanguage';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { History } from './components/History';
import { Stats } from './components/Stats';
import { Profile } from './components/Profile';
import { Library } from './components/Library';
import { AppSettings } from './components/AppSettings';
import { Friends } from './components/Friends';
import { OnboardingModal } from './components/OnboardingModal';
import {
  GAME_DATA_PROVIDER,
  GAME_DATA_PROVIDER_PREFERENCE_KEY,
  normalizeGameDataProviderMode,
} from './utils/gameDataProviders';
import './App.css';

const VALID_PAGES = new Set(['home', 'newgame', 'history', 'stats', 'profile', 'library', 'settings', 'friends']);

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  return VALID_PAGES.has(hash) ? hash : 'home';
}

const PRIMARY_PLAYER_KEY = 'meeplemind-primary-player';
const STARTUP_LOADING_MAX_MS = 4000;
const STARTUP_LOADING_STEP_MS = 480;
const STARTUP_LOADING_ICONS = [Dices, Gamepad2, Joystick, Swords, ChessKnight];

const getInitialGameDataProviderMode = () => {
  try {
    const storedMode = localStorage.getItem(GAME_DATA_PROVIDER_PREFERENCE_KEY);
    return normalizeGameDataProviderMode(storedMode);
  } catch {
    return GAME_DATA_PROVIDER.BGG;
  }
};

const toLocalDateInput = (value) => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dedupePlayers = (players) => {
  const seen = new Set();
  return (Array.isArray(players) ? players : [])
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
};

function App() {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [primaryPlayer, setPrimaryPlayer] = useState(
    () => localStorage.getItem(PRIMARY_PLAYER_KEY) || null
  );
  const [gameDataProviderMode, setGameDataProviderMode] = useState(getInitialGameDataProviderMode);
  const [showStartupLoading, setShowStartupLoading] = useState(true);
  const [startupIconIndex, setStartupIconIndex] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [hasLoadedDriveData, setHasLoadedDriveData] = useState(false);
  const syncTimer = useRef(null);

  const {
    games,
    isLoading,
    addGame,
    deleteGame,
    updateGame,
    mergeFromDrive,
    getStats,
    getPlayerStats,
    getUniqueGames,
    getUniquePlayers,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    clearAllData,
  } = useGames();

  const lib = useLibrary();
  const auth = useGoogleAuth();
  const drive = useGoogleDrive(auth.accessToken);
  const friends = useFriends(auth, games, lib.library);
  const displayPlayerName = auth.isSignedIn && auth.user?.name ? auth.user.name : primaryPlayer;
  const {
    isLoading: isAuthLoading,
    needsReloginPrompt,
    acknowledgeReloginPrompt,
    signIn: signInGoogle,
  } = auth;

  const navigateTo = useCallback((page) => {
    const target = VALID_PAGES.has(page) ? page : 'home';
    window.location.hash = target;
    setCurrentPage(target);
  }, []);

  const handleChangeGameDataProviderMode = useCallback((nextMode) => {
    const normalizedMode = normalizeGameDataProviderMode(nextMode);
    setGameDataProviderMode(normalizedMode);

    try {
      localStorage.setItem(GAME_DATA_PROVIDER_PREFERENCE_KEY, normalizedMode);
    } catch {
      // Ignore persistence failures; in-memory state is still applied.
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const iconSwapTimer = setInterval(() => {
      setStartupIconIndex((current) => (current + 1) % STARTUP_LOADING_ICONS.length);
    }, STARTUP_LOADING_STEP_MS);

    const hideTimer = setTimeout(() => {
      setShowStartupLoading(false);
    }, STARTUP_LOADING_MAX_MS);

    return () => {
      clearInterval(iconSwapTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (primaryPlayer) return;
    if (!auth.isSignedIn) return;

    const googleName = auth.user?.name?.trim();
    if (!googleName) return;

    localStorage.setItem(PRIMARY_PLAYER_KEY, googleName);
    setPrimaryPlayer(googleName);
  }, [auth.isSignedIn, auth.user?.name, primaryPlayer]);

  const stats = getStats();

  useEffect(() => {
    if (!auth.isSignedIn) {
      setHasLoadedDriveData(false);
      setSyncStatus('idle');
    }
  }, [auth.isSignedIn]);

  // ── Google Drive: load data on sign-in ────────────────────────────────────
  useEffect(() => {
    if (!auth.isSignedIn) return;
    const load = async () => {
      setHasLoadedDriveData(false);
      setSyncStatus('syncing');
      try {
        const [driveGames, driveLibrary] = await Promise.all([
          drive.loadGames(),
          drive.loadLibrary(),
        ]);
        if (driveGames) mergeFromDrive(driveGames);
        if (driveLibrary) lib.mergeFromDrive(driveLibrary);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      } finally {
        setHasLoadedDriveData(true);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isSignedIn]);

  // ── Google Drive: debounced auto-save on data changes ─────────────────────
  const scheduleSyncToDrive = useCallback(() => {
    if (!auth.isSignedIn || !hasLoadedDriveData || isLoading || lib.isLoading) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const [gamesSaved, librarySaved] = await Promise.all([
          drive.saveGames(games),
          drive.saveLibrary(lib.library),
        ]);

        if (!gamesSaved || !librarySaved) {
          throw new Error('Failed to persist data to Google Drive');
        }

        setSyncStatus('synced');
        if (friends.isPublic) friends.publishProfile();
      } catch {
        setSyncStatus('error');

        // Retry automatically after transient network/service failures.
        if (auth.isSignedIn) {
          clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            scheduleSyncToDrive();
          }, 15000);
        }
      }
    }, 5000);
  }, [auth.isSignedIn, hasLoadedDriveData, drive, games, lib.library, lib.isLoading, isLoading, friends]);

  useEffect(() => {
    scheduleSyncToDrive();
    return () => clearTimeout(syncTimer.current);
  }, [scheduleSyncToDrive]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleAddGame = useCallback(
    (gameData) => {
      const saved = addGame(gameData);

      const invitedFriendUids = Array.isArray(gameData.invitedFriendUids)
        ? [...new Set(gameData.invitedFriendUids.map((uid) => String(uid || '').trim()).filter(Boolean))]
        : [];

      if (invitedFriendUids.length > 0) {
        friends.notifyFriendsOfGame(saved, invitedFriendUids);
      }

      if (gameData.ownGame) {
        lib.ensureInLibrary(gameData.game);
      }

      return saved;
    },
    [addGame, friends, lib]
  );

  const handleAcceptFriendNotification = useCallback(
    async (notificationId) => {
      if (!friends.acceptFriendNotification) return false;
      return friends.acceptFriendNotification(notificationId);
    },
    [friends]
  );

  const handleAcceptGameInviteNotification = useCallback(
    async (notificationId) => {
      if (!friends.acceptGameInviteNotification) return false;

      const invitePayload = await friends.acceptGameInviteNotification(notificationId);
      if (!invitePayload) return false;

      const targetName = String(invitePayload.targetName || '').trim();
      let players = dedupePlayers(invitePayload.players);

      if (primaryPlayer) {
        if (!players.some((name) => name === primaryPlayer) && targetName) {
          const index = players.findIndex((name) => name === targetName);
          if (index >= 0) {
            players[index] = primaryPlayer;
          }
        }

        if (!players.some((name) => name === primaryPlayer)) {
          players = dedupePlayers([...players, primaryPlayer]);
        }
      }

      if (players.length < 2) return false;

      const points = Array.isArray(invitePayload.points)
        ? invitePayload.points.slice(0, players.length).map((value) => Number(value) || 0)
        : [];
      while (points.length < players.length) {
        points.push(0);
      }

      let winner = invitePayload.winner || null;
      if (winner && targetName && winner === targetName && primaryPlayer) {
        winner = primaryPlayer;
      }

      const parsedDuration = Number(invitePayload.duration);

      const saved = addGame({
        game: invitePayload.game,
        gameType: invitePayload.gameType,
        players,
        points,
        winner,
        coopResult: invitePayload.coopResult,
        duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
        date: toLocalDateInput(invitePayload.date),
        ownGame: Boolean(invitePayload.ownGame),
        themes: Array.isArray(invitePayload.themes) ? invitePayload.themes : [],
        mechanics: Array.isArray(invitePayload.mechanics) ? invitePayload.mechanics : [],
        gameCategories: Array.isArray(invitePayload.gameCategories)
          ? invitePayload.gameCategories
          : [],
      });

      if (invitePayload.ownGame) {
        lib.ensureInLibrary(invitePayload.game);
      }

      return Boolean(saved);
    },
    [addGame, friends, lib, primaryPlayer]
  );

  const handleDismissNotification = useCallback(
    async (notificationId) => {
      if (!friends.dismissNotification) return;
      await friends.dismissNotification(notificationId);
    },
    [friends]
  );

  const sideMenuNotifications = {
    notifications: friends.pendingNotifications,
    pendingNotificationsCount: friends.pendingNotificationsCount,
    hasLoadedNotifications: friends.hasLoadedNotifications,
    isLoadingNotifications: friends.isLoadingNotifications,
    notificationsError: friends.notificationsError,
    onRefreshNotifications: friends.refreshNotifications,
    onAcceptFriendNotification: handleAcceptFriendNotification,
    onAcceptGameInviteNotification: handleAcceptGameInviteNotification,
    onDismissNotification: handleDismissNotification,
  };

  const handleExportToCSV = useCallback((language = 'pt-BR') => {
    exportToCSV(lib.library, language);
  }, [exportToCSV, lib.library]);

  const handleExportToJSON = useCallback(() => {
    exportToJSON(lib.library);
  }, [exportToJSON, lib.library]);

  const handleImportFromJSON = useCallback(
    (file) => {
      importFromJSON(file, (libraryData) => {
        // Merge library data into existing library
        lib.mergeFromDrive(libraryData);
      });
    },
    [importFromJSON, lib]
  );

  const handleClearAllData = useCallback(() => {
    clearAllData();
    lib.clearLibrary();
    localStorage.removeItem(PRIMARY_PLAYER_KEY);
    setPrimaryPlayer(null);
    window.location.hash = 'home';
  }, [clearAllData, lib]);

  const ActiveStartupIcon = STARTUP_LOADING_ICONS[startupIconIndex] || Dices;

  // ── Render guards ─────────────────────────────────────────────────────────
  if (showStartupLoading) {
    return (
      <div className="loading-screen loading-screen--startup" role="status" aria-live="polite">
        <span className="loading-icon loading-icon--startup" aria-hidden="true">
          <ActiveStartupIcon size={42} />
        </span>

        <div className="loading-icon-track" aria-hidden="true">
          {STARTUP_LOADING_ICONS.map((Icon, index) => (
            <span
              key={`startup-icon-${index}`}
              className={`loading-icon-chip ${index === startupIconIndex ? 'active' : ''}`}
            >
              <Icon size={16} />
            </span>
          ))}
        </div>

        <p className="loading-brand">MeepleMind</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <span className="loading-icon"><Dices size={24} /></span>
        <p className="loading-brand">MeepleMind</p>
      </div>
    );
  }

  if (!primaryPlayer) {
    return (
      <OnboardingModal
        auth={auth}
        syncStatus={syncStatus}
        onComplete={(name) => {
          localStorage.setItem(PRIMARY_PLAYER_KEY, name);
          setPrimaryPlayer(name);
        }}
      />
    );
  }

  const showReloginBanner = needsReloginPrompt && !isAuthLoading;

  return (
    <div className={`app ${showReloginBanner ? 'app--with-relogin-banner' : ''}`}>
      {showReloginBanner && (
        <div className="relogin-banner" role="alert">
          <p className="relogin-banner-message">{t('auth.reloginPrompt')}</p>
          <div className="relogin-banner-actions">
            <button
              type="button"
              className="relogin-banner-btn relogin-banner-btn--primary"
              onClick={() => {
                signInGoogle(true);
                acknowledgeReloginPrompt();
              }}
            >
              {t('auth.reloginBannerButton')}
            </button>
            <button
              type="button"
              className="relogin-banner-btn relogin-banner-btn--dismiss"
              onClick={acknowledgeReloginPrompt}
            >
              {t('auth.reloginBannerDismiss')}
            </button>
          </div>
        </div>
      )}
      {currentPage === 'home' && (
        <Home
          onNavigate={navigateTo}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          primaryPlayer={primaryPlayer}
          displayPlayerName={displayPlayerName}
          onChangePrimaryPlayer={(name) => {
            localStorage.setItem(PRIMARY_PLAYER_KEY, name);
            setPrimaryPlayer(name);
          }}
          stats={stats}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          games={games}
          library={lib.library}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'newgame' && (
        <NewGame
          onNavigate={navigateTo}
          onSave={handleAddGame}
          uniqueGames={getUniqueGames()}
          uniquePlayers={getUniquePlayers()}
          mainPlayer={primaryPlayer}
          friendsList={friends.friends}
          libraryGames={lib.getGameNames()}
          libraryEntries={lib.library}
          gameDataProviderMode={gameDataProviderMode}
        />
      )}
      {currentPage === 'history' && (
        <History
          onNavigate={navigateTo}
          games={games}
          library={lib.library}
          onDelete={deleteGame}
          onUpdate={updateGame}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'stats' && (
        <Stats
          onNavigate={navigateTo}
          games={games}
          library={lib.library}
          friends={friends}
          stats={stats}
          primaryPlayer={primaryPlayer}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'profile' && (
        <Profile
          onNavigate={navigateTo}
          games={games}
          primaryPlayer={primaryPlayer}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          getPlayerStats={getPlayerStats}
          library={lib.library}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          friends={friends}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'friends' && (
        <Friends
          onNavigate={navigateTo}
          auth={auth}
          friends={friends}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          syncStatus={syncStatus}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'library' && (
        <Library
          onNavigate={navigateTo}
          library={lib.library}
          onAdd={lib.addToLibrary}
          onRemove={lib.removeFromLibrary}
          onUpdate={lib.updateInLibrary}
          games={games}
          primaryPlayer={primaryPlayer}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          gameDataProviderMode={gameDataProviderMode}
          sideMenuNotifications={sideMenuNotifications}
        />
      )}
      {currentPage === 'settings' && (
        <AppSettings
          onNavigate={navigateTo}
          displayPlayerName={displayPlayerName}
          googlePhotoUrl={auth.isSignedIn ? auth.user?.picture : ''}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          clearAllData={handleClearAllData}
          auth={auth}
          syncStatus={syncStatus}
          gameDataProviderMode={gameDataProviderMode}
          onChangeGameDataProviderMode={handleChangeGameDataProviderMode}
          isPublic={friends.isPublic}
          publicShareError={friends.publicShareError}
          setProfilePublic={friends.setProfilePublic}
        />
      )}
    </div>
  );
}

export default App;

