import { useState } from 'react';
import { useGames } from './hooks/useGames';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { History } from './components/History';
import { Stats } from './components/Stats';
import { OnboardingModal } from './components/OnboardingModal';
import './App.css';

const PRIMARY_PLAYER_KEY = 'meeplemind-primary-player';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [primaryPlayer, setPrimaryPlayer] = useState(
    () => localStorage.getItem(PRIMARY_PLAYER_KEY) || null
  );
  const { 
    games, 
    isLoading, 
    addGame, 
    deleteGame, 
    updateGame,
    getStats, 
    getUniqueGames, 
    getUniquePlayers,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    clearAllData,
  } = useGames();
  const stats = getStats();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-icon">🎲</span>
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
          exportToCSV={exportToCSV}
          exportToJSON={exportToJSON}
          importFromJSON={importFromJSON}
          primaryPlayer={primaryPlayer}
          onChangePrimaryPlayer={(name) => {
            localStorage.setItem(PRIMARY_PLAYER_KEY, name);
            setPrimaryPlayer(name);
          }}
          stats={stats}
          clearAllData={clearAllData}
        />
      )}
      {currentPage === 'newgame' && (
        <NewGame
          onNavigate={setCurrentPage}
          onSave={addGame}
          uniqueGames={getUniqueGames()}
          uniquePlayers={getUniquePlayers()}
          mainPlayer={primaryPlayer}
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
      {currentPage === 'stats' && <Stats onNavigate={setCurrentPage} games={games} stats={stats} />}
    </div>
  );
}

export default App;
