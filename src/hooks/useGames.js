import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText, sanitizePlayerName, sanitizeNumber, validateGameBackup } from '../utils/sanitize';

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

  const addGame = useCallback((gameData) => {
    const newGame = {
      id: uuidv4(),
      game: sanitizeText(gameData.game),
      gameType: gameData.gameType || 'competitive',
      players: (gameData.players || []).map(sanitizePlayerName).filter(Boolean),
      points: (gameData.points || []).map((p) => sanitizeNumber(p, -99999, 999999) ?? 0),
      winner: gameData.winner ? sanitizePlayerName(gameData.winner) : null,
      coopResult: gameData.coopResult || null,
      duration: gameData.duration ? sanitizeNumber(gameData.duration, 1, 2880) : null,
      date: gameData.date ? new Date(gameData.date).toISOString() : new Date().toISOString(),
      rating: 0,
      notes: '',
    };
    setGames((prevGames) => [newGame, ...prevGames]);
    return newGame;
  }, []);

  const deleteGame = useCallback((gameId) => {
    setGames((prevGames) => prevGames.filter((g) => g.id !== gameId));
  }, []);

  const updateGame = useCallback((gameId, updates) => {
    setGames((prevGames) =>
      prevGames.map((g) => (g.id === gameId ? { ...g, ...updates } : g))
    );
  }, []);

  /** Merge games loaded from Google Drive (union by ID, Drive fills missing). */
  const mergeFromDrive = useCallback((driveGames) => {
    if (!validateGameBackup(driveGames)) return;
    setGames((local) => {
      const localIds = new Set(local.map((g) => g.id));
      const merged = [
        ...local,
        ...driveGames.filter((g) => !localIds.has(g.id)),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      return merged;
    });
  }, []);

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
      if (game.winner) {  // Only count wins for competitive games
        wins[game.winner] = (wins[game.winner] || 0) + 1;
      }
      if (game.game) {  // Only count games that have a game name
        gameFreq[game.game] = (gameFreq[game.game] || 0) + 1;
      }
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

  /** Count games played in the last 30 days from today */
  const getGamesLast30Days = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return games.filter((game) => {
      const gameDate = new Date(game.date);
      return gameDate >= thirtyDaysAgo && gameDate <= now;
    }).length;
  };

  const filterGamesByName = (gameName) => {
    if (!gameName) return games;
    return games.filter((g) => g.game.toLowerCase().includes(gameName.toLowerCase()));
  };

  const exportToCSV = (library, language = 'pt-BR') => {
    if (games.length === 0) {
      alert('Nenhuma partida para exportar');
      return;
    }

    try {
      const XLSX = require('xlsx');

      // Localize headers based on language
      const headerLabels = {
        'pt-BR': {
          date: 'Data',
          game: 'Jogo',
          players: 'Jogadores',
          winner: 'Vencedor',
          duration: 'Duração (min)',
          rating: 'Rating',
          notes: 'Notas',
          name: 'Nome',
          category: 'Categoria',
          minPlayers: 'Min Jogadores',
          maxPlayers: 'Max Jogadores',
          owned: 'Dono',
          yes: 'Sim',
          no: 'Não',
          gameHistory: 'Histórico de Jogos',
          library: 'Biblioteca',
        },
        'en-US': {
          date: 'Date',
          game: 'Game',
          players: 'Players',
          winner: 'Winner',
          duration: 'Duration (min)',
          rating: 'Rating',
          notes: 'Notes',
          name: 'Name',
          category: 'Category',
          minPlayers: 'Min Players',
          maxPlayers: 'Max Players',
          owned: 'Owner',
          yes: 'Yes',
          no: 'No',
          gameHistory: 'Game History',
          library: 'Library',
        },
        'fr-CA': {
          date: 'Date',
          game: 'Jeu',
          players: 'Joueurs',
          winner: 'Gagnant',
          duration: 'Durée (min)',
          rating: 'Évaluation',
          notes: 'Notes',
          name: 'Nom',
          category: 'Catégorie',
          minPlayers: 'Min Joueurs',
          maxPlayers: 'Max Joueurs',
          owned: 'Patron',
          yes: 'Oui',
          no: 'Non',
          gameHistory: 'Historique des Parties',
          library: 'Bibliothèque',
        },
      };

      const labels = headerLabels[language] || headerLabels['pt-BR'];

      // Aba 1: Histórico de Jogos
      const gamesHeaders = [labels.date, labels.game, labels.players, labels.winner, labels.duration, labels.rating, labels.notes];
      const gamesRows = games.map((g) => [
        new Date(g.date).toLocaleDateString(
          language === 'pt-BR' ? 'pt-BR' : language === 'fr-CA' ? 'fr-CA' : 'en-US'
        ),
        g.game,
        g.players.join(' | '),
        g.winner,
        g.duration || '-',
        '⭐'.repeat(g.rating),
        g.notes,
      ]);
      const gamesData = [gamesHeaders, ...gamesRows];

      // Aba 2: Biblioteca
      const libraryHeaders = [labels.name, labels.category, labels.minPlayers, labels.maxPlayers, labels.owned];
      const libraryRows = (library || []).map((game) => [
        game.name,
        game.category || '-',
        game.minPlayers || '-',
        game.maxPlayers || '-',
        game.owned ? labels.yes : labels.no,
      ]);
      const libraryData = [libraryHeaders, ...libraryRows];

      // Criar workbook Excel
      const workbook = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(gamesData);
      const ws2 = XLSX.utils.aoa_to_sheet(libraryData);

      // Ajustar largura das colunas
      ws1['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
      ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];

      XLSX.utils.book_append_sheet(workbook, ws1, labels.gameHistory);
      XLSX.utils.book_append_sheet(workbook, ws2, labels.library);

      XLSX.writeFile(workbook, `MeepleMind_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('❌ Erro ao exportar para Excel');
    }
  };

  const exportToJSON = (library) => {
    if (games.length === 0) {
      alert('Nenhuma partida para exportar');
      return;
    }

    const backup = {
      version: '2.0',
      games,
      library: library || [],
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `MeepleMind_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (file, onLibraryImported) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let gamesToImport = data;
        let libraryToImport = [];

        // Suporte para formato v2 (com biblioteca) e v1 (apenas jogos)
        if (data.version === '2.0' && data.games) {
          gamesToImport = data.games;
          libraryToImport = data.library || [];
        } else if (Array.isArray(data)) {
          // Formato v1 - array de jogos
          gamesToImport = data;
        } else {
          alert('❌ Formato de arquivo inválido ou corrompido');
          return;
        }

        if (!validateGameBackup(gamesToImport)) {
          alert('❌ Formato de arquivo inválido ou corrompido');
          return;
        }

        // Importar jogos
        setGames((prevGames) => {
          const existingIds = new Set(prevGames.map((g) => g.id));
          const newEntries = gamesToImport.filter((g) => !existingIds.has(g.id));
          return [...newEntries, ...prevGames];
        });

        // Importar biblioteca se fornecida
        if (libraryToImport.length > 0 && onLibraryImported) {
          onLibraryImported(libraryToImport);
        }

        alert('✅ Dados importados com sucesso!');
      } catch (error) {
        alert('❌ Erro ao importar: arquivo inválido');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = useCallback(() => {
    setGames([]);
    alert('🗑️ Todos os dados foram removidos!');
  }, []);

  const getCompetitiveStats = () => {
    const competitiveGames = games.filter((g) => (g.gameType || 'competitive') === 'competitive');
    
    if (competitiveGames.length === 0) {
      return {
        totalGames: 0,
        wins: {},
        appearances: {},
      };
    }

    const wins = {};
    const appearances = {};

    competitiveGames.forEach((game) => {
      // Count wins
      if (game.winner) {
        wins[game.winner] = (wins[game.winner] || 0) + 1;
      }
      // Count appearances
      game.players.forEach((player) => {
        appearances[player] = (appearances[player] || 0) + 1;
      });
    });

    return {
      totalGames: competitiveGames.length,
      wins,
      appearances,
    };
  };

  const getCooperativeStats = () => {
    const cooperativeGames = games.filter((g) => g.gameType === 'cooperative');
    
    if (cooperativeGames.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        successRate: 0,
      };
    }

    const wins = cooperativeGames.filter((g) => g.coopResult === 'win').length;
    const losses = cooperativeGames.filter((g) => g.coopResult === 'loss').length;
    const successRate = wins > 0 ? Math.round((wins / cooperativeGames.length) * 100) : 0;

    return {
      totalGames: cooperativeGames.length,
      wins,
      losses,
      successRate,
    };
  };

  const getPlayerStats = (playerName) => {
    const playerGames = games.filter((g) => g.players.includes(playerName));
    
    if (playerGames.length === 0) {
      return {
        totalGames: 0,
        competitiveGames: 0,
        competitiveWins: 0,
        competitiveWinRate: 0,
        cooperativeGames: 0,
        cooperativeWins: 0,
        cooperativeWinRate: 0,
      };
    }

    const competitiveGames = playerGames.filter((g) => (g.gameType || 'competitive') === 'competitive');
    const cooperativeGames = playerGames.filter((g) => g.gameType === 'cooperative');

    const competitiveWins = competitiveGames.filter((g) => g.winner === playerName).length;
    const competitiveWinRate = competitiveGames.length > 0 
      ? Math.round((competitiveWins / competitiveGames.length) * 100) 
      : 0;

    const cooperativeWins = cooperativeGames.filter((g) => g.coopResult === 'win').length;
    const cooperativeWinRate = cooperativeGames.length > 0 
      ? Math.round((cooperativeWins / cooperativeGames.length) * 100) 
      : 0;

    return {
      totalGames: playerGames.length,
      competitiveGames: competitiveGames.length,
      competitiveWins,
      competitiveWinRate,
      cooperativeGames: cooperativeGames.length,
      cooperativeWins,
      cooperativeWinRate,
    };
  };

  return {
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
    getGamesLast30Days,
    filterGamesByName,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    clearAllData,
  };
};
