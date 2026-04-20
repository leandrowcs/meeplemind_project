import { useState, useEffect, useRef, useCallback } from 'react';
import { Dice5 } from 'lucide-react';
import { useGames } from './hooks/useGames';
import { useLibrary } from './hooks/useLibrary';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { History } from './components/History';
import { Stats } from './components/Stats';
import { Profile } from './components/Profile';
import { Library } from './components/Library';
import { OnboardingModal } from './components/OnboardingModal';
import './App.css';

const PRIMARY_PLAYER_KEY = 'meeplemind-primary-player';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [primaryPlayer, setPrimaryPlayer] = useState(
    () => localStorage.getItem(PRIMARY_PLAYER_KEY) || null
  );
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const syncTimer = useRef(null);

  const {
    games,
    isLoading,
    addGame,
    deleteGame,
    updateGame,
    mergeFromDrive,
    getStats,
    getCompetitiveStats,
    getCooperativeStats,
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

  const stats = getStats();

  // ── Google Drive: load data on sign-in ────────────────────────────────────
  useEffect(() => {
    if (!auth.isSignedIn) return;
    const load = async () => {
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
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isSignedIn]);

  // ── Google Drive: debounced auto-save on data changes ─────────────────────
  const scheduleSyncToDrive = useCallback(() => {
    if (!auth.isSignedIn || isLoading || lib.isLoading) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await Promise.all([
          drive.saveGames(games),
          drive.saveLibrary(lib.library),
        ]);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    }, 5000);
  }, [auth.isSignedIn, drive, games, lib.library, lib.isLoading, isLoading]);

  useEffect(() => {
    scheduleSyncToDrive();
    return () => clearTimeout(syncTimer.current);
  }, [scheduleSyncToDrive]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleAddGame = useCallback(
    (gameData) => {
      const saved = addGame(gameData);
      lib.ensureInLibrary(gameData.game);
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
  }, [clearAllData, lib]);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-icon"><Dice5 size={24} /></span>
        <p>MeepleMind</p>
      </div>
    );
  }

  if (!primaryPlayer) {
    return (
      <OnboardingModal
        onComplete={(name) => {
          localStorage.setItem(PRIMARY_PLAYER_KEY, name);
          setPrimaryPlayer(name);
        }}
      />
    );
  }

  return (
    <div className="app">
      {currentPage === 'home' && (
        <Home
          onNavigate={setCurrentPage}
          exportToCSV={handleExportToCSV}
          exportToJSON={handleExportToJSON}
          importFromJSON={handleImportFromJSON}
          primaryPlayer={primaryPlayer}
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
        />
      )}
      {currentPage === 'newgame' && (
        <NewGame
          onNavigate={setCurrentPage}
          onSave={handleAddGame}
          uniqueGames={getUniqueGames()}
          uniquePlayers={getUniquePlayers()}
          mainPlayer={primaryPlayer}
          libraryGames={lib.getGameNames()}
        />
      )}
      {currentPage === 'history' && (
        <History
          onNavigate={setCurrentPage}
          games={games}
          onDelete={deleteGame}
          onUpdate={updateGame}
          uniqueGames={getUniqueGames()}
        />
      )}
      {currentPage === 'stats' && (
        <Stats
          onNavigate={setCurrentPage}
          games={games}
          stats={stats}
          primaryPlayer={primaryPlayer}
          getCompetitiveStats={getCompetitiveStats}
          getCooperativeStats={getCooperativeStats}
        />
      )}
      {currentPage === 'profile' && (
        <Profile
          onNavigate={setCurrentPage}
          games={games}
          primaryPlayer={primaryPlayer}
          getPlayerStats={getPlayerStats}
          library={lib.library}
        />
      )}
      {currentPage === 'library' && (
        <Library
          onNavigate={setCurrentPage}
          library={lib.library}
          onAdd={lib.addToLibrary}
          onRemove={lib.removeFromLibrary}
          onUpdate={lib.updateInLibrary}
          games={games}
        />
      )}
    </div>
  );
}

export default App;

