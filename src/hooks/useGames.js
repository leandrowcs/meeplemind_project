import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeText,
  sanitizePlayerName,
  sanitizeNumber,
  sanitizeNotes,
  validateGameBackup,
} from '../utils/sanitize';
import { GAME_THEMES, GAME_MECHANICS, GAME_CATEGORIES } from '../utils/classifications';
import { formatDate } from '../utils/dateFormat';

const STORAGE_KEY = 'meeplemind_games';
const GAME_TYPE_COMPETITIVE = 'competitive';
const GAME_TYPE_COOPERATIVE = 'cooperative';

const sanitizeGameType = (value) =>
  value === GAME_TYPE_COOPERATIVE ? GAME_TYPE_COOPERATIVE : GAME_TYPE_COMPETITIVE;

const sanitizeCoopResult = (value) =>
  value === 'win' || value === 'loss' ? value : null;

const normalizeIsoDate = (value, fallback = new Date().toISOString()) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const parseLocalDateInput = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const [y, m, d] = value.split('-');
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const sanitizeGameEntry = (item) => {
  if (!item || typeof item !== 'object') return null;

  const id = sanitizeText(String(item.id || ''), 120);
  const game = sanitizeText(String(item.game || ''));
  const players = (item.players || []).map(sanitizePlayerName).filter(Boolean).slice(0, 20);

  if (!id || !game || players.length === 0) return null;

  return {
    id,
    game,
    gameType: sanitizeGameType(item.gameType),
    players,
    points: Array.isArray(item.points)
      ? item.points.slice(0, 20).map((p) => sanitizeNumber(p, -99999, 999999) ?? 0)
      : [],
    winner: item.winner ? sanitizePlayerName(String(item.winner)) : null,
    coopResult: sanitizeCoopResult(item.coopResult),
    duration: item.duration ? sanitizeNumber(item.duration, 1, 2880) : null,
    date: normalizeIsoDate(item.date),
    rating: sanitizeNumber(item.rating, 0, 5) ?? 0,
    notes: sanitizeNotes(item.notes || ''),
    themes: Array.isArray(item.themes)
      ? item.themes.filter((v) => GAME_THEMES.includes(v)).slice(0, 16)
      : [],
    mechanics: Array.isArray(item.mechanics)
      ? item.mechanics.filter((v) => GAME_MECHANICS.includes(v)).slice(0, 16)
      : [],
    gameCategories: Array.isArray(item.gameCategories)
      ? item.gameCategories.filter((v) => GAME_CATEGORIES.includes(v)).slice(0, 10)
      : [],
    updatedAt: normalizeIsoDate(item.updatedAt || item.date),
  };
};

const serializeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  let normalized = typeof value === 'string' ? value : String(value);

  // Prevent CSV formula injection in spreadsheet tools.
  if (/^[=+\-@]/.test(normalized.trimStart())) {
    normalized = `'${normalized}`;
  }

  const escaped = normalized.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const downloadCsvFile = (filename, rows) => {
  const csv = rows.map((row) => row.map(serializeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();

  URL.revokeObjectURL(url);
};

export const useGames = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load games from localStorage on mount
  useEffect(() => {
    const loadGames = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.map(sanitizeGameEntry).filter(Boolean);
            setGames(sanitized);
          } else {
            setGames([]);
          }
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

  // Immediately persist to localStorage for mobile reliability
  // (effects may not run before the browser kills the page on mobile)
  const persistGames = (gamesArr) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gamesArr)); } catch {}
  };

  const addGame = useCallback((gameData) => {
    const newGame = {
      id: uuidv4(),
      game: sanitizeText(gameData.game),
      gameType: sanitizeGameType(gameData.gameType),
      players: (gameData.players || []).map(sanitizePlayerName).filter(Boolean),
      points: (gameData.points || []).map((p) => sanitizeNumber(p, -99999, 999999) ?? 0),
      winner: gameData.winner ? sanitizePlayerName(gameData.winner) : null,
      coopResult: sanitizeCoopResult(gameData.coopResult),
      duration: gameData.duration ? sanitizeNumber(gameData.duration, 1, 2880) : null,
      // Parse date as local time to avoid UTC offset showing wrong day
      date: gameData.date
        ? parseLocalDateInput(gameData.date)
        : new Date().toISOString(),
      rating: 0,
      notes: '',
      themes: Array.isArray(gameData.themes)
        ? gameData.themes.filter((v) => GAME_THEMES.includes(v)).slice(0, 16)
        : [],
      mechanics: Array.isArray(gameData.mechanics)
        ? gameData.mechanics.filter((v) => GAME_MECHANICS.includes(v)).slice(0, 16)
        : [],
      gameCategories: Array.isArray(gameData.gameCategories)
        ? gameData.gameCategories.filter((v) => GAME_CATEGORIES.includes(v)).slice(0, 10)
        : [],
      updatedAt: new Date().toISOString(),
    };
    setGames((prevGames) => {
      const updated = [newGame, ...prevGames];
      persistGames(updated);
      return updated;
    });
    return newGame;
  }, []);

  const deleteGame = useCallback((gameId) => {
    setGames((prevGames) => {
      const updated = prevGames.filter((g) => g.id !== gameId);
      persistGames(updated);
      return updated;
    });
  }, []);

  const updateGame = useCallback((gameId, updates) => {
    setGames((prevGames) => {
      const updated = prevGames.map((g) =>
        g.id === gameId
          ? {
              ...g,
              game: updates.game !== undefined ? sanitizeText(updates.game) : g.game,
              gameType:
                updates.gameType !== undefined
                  ? sanitizeGameType(updates.gameType)
                  : g.gameType,
              players:
                updates.players !== undefined
                  ? (Array.isArray(updates.players)
                      ? updates.players
                      : [updates.players]
                    )
                      .map(sanitizePlayerName)
                      .filter(Boolean)
                      .slice(0, 20)
                  : g.players,
              points:
                updates.points !== undefined && Array.isArray(updates.points)
                  ? updates.points
                      .slice(0, 20)
                      .map((p) => sanitizeNumber(p, -99999, 999999) ?? 0)
                  : g.points,
              winner:
                updates.winner !== undefined
                  ? updates.winner
                    ? sanitizePlayerName(updates.winner)
                    : null
                  : g.winner,
              coopResult:
                updates.coopResult !== undefined
                  ? sanitizeCoopResult(updates.coopResult)
                  : g.coopResult,
              duration:
                updates.duration !== undefined
                  ? updates.duration
                    ? sanitizeNumber(updates.duration, 1, 2880)
                    : null
                  : g.duration,
              rating:
                updates.rating !== undefined
                  ? sanitizeNumber(updates.rating, 0, 5) ?? 0
                  : g.rating,
              notes:
                updates.notes !== undefined
                  ? sanitizeNotes(updates.notes)
                  : g.notes,
              themes: updates.themes !== undefined
                ? (Array.isArray(updates.themes)
                    ? updates.themes.filter((v) => GAME_THEMES.includes(v)).slice(0, 16)
                    : [])
                : (g.themes || []),
              mechanics: updates.mechanics !== undefined
                ? (Array.isArray(updates.mechanics)
                    ? updates.mechanics.filter((v) => GAME_MECHANICS.includes(v)).slice(0, 16)
                    : [])
                : (g.mechanics || []),
              gameCategories: updates.gameCategories !== undefined
                ? (Array.isArray(updates.gameCategories)
                    ? updates.gameCategories.filter((v) => GAME_CATEGORIES.includes(v)).slice(0, 10)
                    : [])
                : (g.gameCategories || []),
              updatedAt: new Date().toISOString(),
            }
          : g
      );
      persistGames(updated);
      return updated;
    });
  }, []);

  /** Merge games loaded from Google Drive (last-write-wins by updatedAt). */
  const mergeFromDrive = useCallback((driveGames) => {
    if (!validateGameBackup(driveGames)) return;
    setGames((local) => {
      const sanitizedDriveGames = driveGames.map(sanitizeGameEntry).filter(Boolean);
      if (sanitizedDriveGames.length === 0) return local;

      const localMap = new Map(local.map((g) => [g.id, g]));
      const driveMap = new Map(sanitizedDriveGames.map((g) => [g.id, g]));
      const allIds = new Set([...localMap.keys(), ...driveMap.keys()]);
      const merged = Array.from(allIds).map((id) => {
        const loc = localMap.get(id);
        const drv = driveMap.get(id);
        if (!loc) return drv;
        if (!drv) return loc;
        // Last-write-wins: compare updatedAt, fallback to date
        const locTime = new Date(loc.updatedAt || loc.date).getTime();
        const drvTime = new Date(drv.updatedAt || drv.date).getTime();
        return drvTime > locTime ? drv : loc;
      });
      const sorted = merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      persistGames(sorted);
      return sorted;
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

  /** Get the last game played with all details (sorted by date) */
  const getLastGame = () => {
    if (games.length === 0) return null;
    const sorted = [...games].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    let winner = null;
    if (last.gameType === 'cooperative') {
      winner = last.coopResult || 'N/A';
    } else {
      winner = last.winner || 'N/A';
    }
    // Parse date as local to avoid timezone showing wrong day
    const dateOnly = last.date.split('T')[0];
    const [y, m, d] = dateOnly.split('-');
    return {
      game: last.game,
      winner,
      numPlayers: last.players.length,
      date: new Date(Number(y), Number(m) - 1, Number(d)),
      gameType: last.gameType,
    };
  };

  /** Get current win streak for a specific player (competitive games only) */
  const getWinStreak = (playerName) => {
    let streak = 0;
    const competitiveByDate = games
      .filter((g) => (g.gameType || 'competitive') === 'competitive')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    for (let i = 0; i < competitiveByDate.length; i++) {
      const game = competitiveByDate[i];
      if (game.winner === playerName) {
        streak++;
      } else if (game.players.includes(playerName)) {
        break;
      }
    }
    return streak;
  };

  /** Get highlights: top player, most played game, and current win streak */
  const getHighlights = () => {
    const stats = getStats();
    
    const topPlayer = stats.topWinner;
    const topPlayerWins = stats.topWinnerWins;
    const mostPlayedGame = stats.mostPlayedGame;
    const mostPlayedCount = stats.mostPlayedGameCount;
    const winStreak = topPlayer ? getWinStreak(topPlayer) : 0;

    return {
      topPlayer,
      topPlayerWins,
      mostPlayedGame,
      mostPlayedCount,
      winStreak,
    };
  };

  const filterGamesByName = (gameName) => {
    if (!gameName) return games;
    return games.filter((g) => g.game.toLowerCase().includes(gameName.toLowerCase()));
  };

  const exportToCSV = (library, language = 'pt-BR') => {
    try {
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
          gameHistoryFileSuffix: 'historico-jogos',
          libraryFileSuffix: 'biblioteca',
          emptyExport: 'Nenhuma partida para exportar',
          exportError: 'Erro ao exportar CSV',
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
          gameHistoryFileSuffix: 'game-history',
          libraryFileSuffix: 'library',
          emptyExport: 'No matches to export',
          exportError: 'Unable to export CSV',
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
          gameHistoryFileSuffix: 'historique-parties',
          libraryFileSuffix: 'bibliotheque',
          emptyExport: 'Aucune partie a exporter',
          exportError: 'Impossible d\'exporter le CSV',
        },
      };

      const labels = headerLabels[language] || headerLabels['pt-BR'];
      if (games.length === 0) {
        alert(labels.emptyExport);
        return;
      }

      const gamesHeaders = [labels.date, labels.game, labels.players, labels.winner, labels.duration, labels.rating, labels.notes];
      const gamesRows = games.map((g) => [
        formatDate(g.date, language),
        g.game,
        g.players.join(' | '),
        g.winner,
        g.duration || '-',
        g.rating ? `${g.rating}/5` : '-',
        g.notes,
      ]);

      const libraryHeaders = [labels.name, labels.category, labels.minPlayers, labels.maxPlayers, labels.owned];
      const libraryRows = (library || []).map((game) => [
        game.name,
        game.category || '-',
        game.minPlayers || '-',
        game.maxPlayers || '-',
        game.owned ? labels.yes : labels.no,
      ]);

      const stamp = new Date().toISOString().split('T')[0];
      downloadCsvFile(
        `MeepleMind_${stamp}_${labels.gameHistoryFileSuffix}.csv`,
        [gamesHeaders, ...gamesRows]
      );
      downloadCsvFile(
        `MeepleMind_${stamp}_${labels.libraryFileSuffix}.csv`,
        [libraryHeaders, ...libraryRows]
      );
    } catch (error) {
      console.error('Erro ao exportar:', error);
      const headerLabels = {
        'pt-BR': { exportError: 'Erro ao exportar CSV' },
        'en-US': { exportError: 'Unable to export CSV' },
        'fr-CA': { exportError: 'Impossible d\'exporter le CSV' },
      };
      const labels = headerLabels[language] || headerLabels['pt-BR'];
      alert(labels.exportError);
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
          alert('Formato de arquivo inválido ou corrompido');
          return;
        }

        if (!validateGameBackup(gamesToImport)) {
          alert('Formato de arquivo inválido ou corrompido');
          return;
        }

        const sanitizedImportGames = gamesToImport
          .map(sanitizeGameEntry)
          .filter(Boolean);

        if (sanitizedImportGames.length === 0) {
          alert('Formato de arquivo inválido ou corrompido');
          return;
        }

        // Importar jogos
        setGames((prevGames) => {
          const existingIds = new Set(prevGames.map((g) => g.id));
          const newEntries = sanitizedImportGames.filter((g) => !existingIds.has(g.id));
          const updated = [...newEntries, ...prevGames];
          persistGames(updated);
          return updated;
        });

        // Importar biblioteca se fornecida
        if (libraryToImport.length > 0 && onLibraryImported) {
          onLibraryImported(libraryToImport);
        }

        alert('Dados importados com sucesso!');
      } catch (error) {
        alert('Erro ao importar: arquivo inválido');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = useCallback(() => {
    setGames([]);
    persistGames([]);
    alert('Todos os dados foram removidos!');
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

    // Best game: the game where the player won the most times
    const winsByGame = {};
    competitiveGames.forEach((g) => {
      if (g.winner === playerName && g.game) {
        winsByGame[g.game] = (winsByGame[g.game] || 0) + 1;
      }
    });
    const bestGameEntry = Object.entries(winsByGame).sort(([, a], [, b]) => b - a)[0];
    const bestGame = bestGameEntry?.[0] || null;
    const bestGameWins = bestGameEntry?.[1] || 0;

    const cooperativeWins = cooperativeGames.filter((g) => g.coopResult === 'win').length;
    const cooperativeWinRate = cooperativeGames.length > 0 
      ? Math.round((cooperativeWins / cooperativeGames.length) * 100) 
      : 0;

    // Favorite coop team: top 4 players who appeared most in cooperative games
    const coopPartnerCount = {};
    cooperativeGames.forEach((g) => {
      (g.players || []).forEach((p) => {
        if (p !== playerName) {
          coopPartnerCount[p] = (coopPartnerCount[p] || 0) + 1;
        }
      });
    });
    const favoriteCoopTeam = Object.entries(coopPartnerCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name]) => name);

    return {
      totalGames: playerGames.length,
      competitiveGames: competitiveGames.length,
      competitiveWins,
      competitiveWinRate,
      bestGame,
      bestGameWins,
      cooperativeGames: cooperativeGames.length,
      cooperativeWins,
      cooperativeWinRate,
      favoriteCoopTeam,
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
    getLastGame,
    getHighlights,
    filterGamesByName,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    clearAllData,
  };
};
