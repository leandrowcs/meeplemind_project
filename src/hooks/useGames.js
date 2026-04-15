import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'meeplemind_games';

export const useGames = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load games from localStorage on mount
  useEffect(() => {
    const loadGames = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setGames(JSON.parse(stored));
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error('Error loading games from localStorage:', error);
        setGames([]);
      }
      setIsLoading(false);
    };

    loadGames();
  }, []);

  // Save games to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
      } catch (error) {
        console.error('Error saving games to localStorage:', error);
      }
    }
  }, [games, isLoading]);

  const addGame = (gameData) => {
    const newGame = {
      id: uuidv4(),
      ...gameData,
      date: gameData.date ? new Date(gameData.date).toISOString() : new Date().toISOString(),
      rating: 0, // 0-5 stars
      notes: '', // User notes
    };
    setGames((prevGames) => [newGame, ...prevGames]);
    return newGame;
  };

  const deleteGame = (gameId) => {
    setGames((prevGames) => prevGames.filter((g) => g.id !== gameId));
  };

  const updateGame = (gameId, updates) => {
    setGames((prevGames) =>
      prevGames.map((g) => (g.id === gameId ? { ...g, ...updates } : g))
    );
  };

  const getStats = () => {
    if (games.length === 0) {
      return {
        totalGames: 0,
        uniqueGames: 0,
        totalPlayers: 0,
        topWinner: null,
        topWinnerWins: 0,
        mostPlayedGame: null,
        mostPlayedGameCount: 0,
      };
    }

    const wins = {};
    const gameFreq = {};

    games.forEach((game) => {
      wins[game.winner] = (wins[game.winner] || 0) + 1;
      gameFreq[game.game] = (gameFreq[game.game] || 0) + 1;
    });

    const topWinner = Object.entries(wins).sort(([, a], [, b]) => b - a)[0];
    const mostPlayed = Object.entries(gameFreq).sort(([, a], [, b]) => b - a)[0];

    const uniqueGames = Object.keys(gameFreq).length;
    const allPlayers = new Set();
    games.forEach((game) => {
      game.players.forEach((p) => allPlayers.add(p));
    });

    return {
      totalGames: games.length,
      uniqueGames,
      totalPlayers: allPlayers.size,
      topWinner: topWinner?.[0] || null,
      topWinnerWins: topWinner?.[1] || 0,
      mostPlayedGame: mostPlayed?.[0] || null,
      mostPlayedGameCount: mostPlayed?.[1] || 0,
    };
  };

  const getUniqueGames = () => {
    const gameSet = new Set(games.map((g) => g.game));
    return Array.from(gameSet).sort();
  };

  const getUniquePlayers = () => {
    const playerSet = new Set();
    games.forEach((game) => {
      game.players.forEach((p) => playerSet.add(p));
    });
    return Array.from(playerSet).sort();
  };

  const filterGamesByName = (gameName) => {
    if (!gameName) return games;
    return games.filter((g) => g.game.toLowerCase().includes(gameName.toLowerCase()));
  };

  const exportToCSV = () => {
    if (games.length === 0) {
      alert('Nenhuma partida para exportar');
      return;
    }

    const headers = ['Data', 'Jogo', 'Jogadores', 'Vencedor', 'Duração (min)', 'Rating', 'Notas'];
    const rows = games.map((g) => [
      new Date(g.date).toLocaleDateString('pt-BR'),
      g.game,
      g.players.join(' | '),
      g.winner,
      g.duration || '-',
      '⭐'.repeat(g.rating),
      g.notes.replace(/"/g, '""'), // Escape quotes
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add UTF-8 BOM to fix encoding issues with special characters in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `meepl mind_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };
  };

  const exportToJSON = () => {
    if (games.length === 0) {
      alert('Nenhuma partida para exportar');
      return;
    }

    const json = JSON.stringify(games, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `MeepleMind_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          setGames((prevGames) => [...imported, ...prevGames]);
          alert('✅ Dados importados com sucesso!');
        } else {
          alert('❌ Formato de arquivo inválido');
        }
      } catch (error) {
        alert('❌ Erro ao importar: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    setGames([]);
    alert('🗑️ Todos os dados foram removidos!');
  };

  return {
    games,
    isLoading,
    addGame,
    deleteGame,
    updateGame,
    getStats,
    getUniqueGames,
    getUniquePlayers,
    filterGamesByName,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    clearAllData,
  };
};
