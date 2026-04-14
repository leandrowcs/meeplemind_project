import { useState, useEffect } from 'react';
import { useGames } from './hooks/useGames';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { History } from './components/History';
import { Stats } from './components/Stats';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
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
  } = useGames();
  const stats = getStats();

  // Update home page stats
  useEffect(() => {
    if (currentPage === 'home') {
      const totalGamesEl = document.getElementById('stat-games');
      const topWinnerEl = document.getElementById('stat-winner');
      const topGameEl = document.getElementById('stat-game');

      if (totalGamesEl) totalGamesEl.textContent = stats.totalGames;
      if (topWinnerEl) topWinnerEl.textContent = stats.topWinner || '—';
      if (topGameEl) topGameEl.textContent = stats.mostPlayedGame || '—';
    }
  }, [currentPage, stats]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-icon">🎲</span>
        <p>MeepleMind</p>
      </div>
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
        />
      )}
      {currentPage === 'newgame' && (
        <NewGame
          onNavigate={setCurrentPage}
          onSave={addGame}
          uniqueGames={getUniqueGames()}
          uniquePlayers={getUniquePlayers()}
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
