import { useState, useEffect, useRef, useCallback } from 'react';
import { Dices } from 'lucide-react';
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
import './App.css';

const VALID_PAGES = new Set(['home', 'newgame', 'history', 'stats', 'profile', 'library', 'settings', 'friends']);

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  return VALID_PAGES.has(hash) ? hash : 'home';
}

const PRIMARY_PLAYER_KEY = 'meeplemind-primary-player';

function App() {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [primaryPlayer, setPrimaryPlayer] = useState(
    () => localStorage.getItem(PRIMARY_PLAYER_KEY) || null
  );
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

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
      if (gameData.ownGame) {
        lib.ensureInLibrary(gameData.game);
      }
      return saved;
    },
    [addGame, lib]
  );

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

  // ── Render guards ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-icon"><Dices size={24} /></span>
        <p>MeepleMind</p>
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

  return (
    <div className="app">
      {needsReloginPrompt && !isAuthLoading && (
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
        />
      )}
      {currentPage === 'newgame' && (
        <NewGame
          onNavigate={navigateTo}
          onSave={handleAddGame}
          uniqueGames={getUniqueGames()}
          uniquePlayers={getUniquePlayers()}
          mainPlayer={primaryPlayer}
          libraryGames={lib.getGameNames()}
          libraryEntries={lib.library}
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
          isPublic={friends.isPublic}
          publicShareError={friends.publicShareError}
          setProfilePublic={friends.setProfilePublic}
        />
      )}
    </div>
  );
}

export default App;

