import { useState } from 'react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { PlayerStatsModal } from './PlayerStatsModal';
import './Stats.css';

export const Stats = ({ onNavigate, games, stats }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const getPlayerWins = () => {
    const wins = {};
    games.forEach((game) => {
      if (game.winner) {
        wins[game.winner] = (wins[game.winner] || 0) + 1;
      }
    });
    return Object.entries(wins)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getGameFrequency = () => {
    const freq = {};
    games.forEach((game) => {
      freq[game.game] = (freq[game.game] || 0) + 1;
    });
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getPlayerAppearances = () => {
    const appearances = {};
    games.forEach((game) => {
      game.players.forEach((player) => {
        appearances[player] = (appearances[player] || 0) + 1;
      });
    });
    return Object.entries(appearances)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const playerWins = getPlayerWins();
  const gameFreq = getGameFrequency();
  const playerApps = getPlayerAppearances();

  return (
    <>
      <ThemeToggle />
      <div className="stats-container fade-in">
        <header className="stats-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            ← Voltar
          </button>
          <h1>🏆 Estatísticas</h1>
        </header>

        {games.length === 0 ? (
          <div className="empty-stats">
            <span className="empty-icon">📊</span>
            <p>Não há dados para exibir</p>
            <Button variant="accent" onClick={() => onNavigate('newgame')}>
              Registrar primeira partida
            </Button>
          </div>
        ) : (
          <div className="stats-grid">
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-icon">🎮</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.totalGames}</span>
                  <span className="summary-label">Total de Partidas</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon">🎯</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.uniqueGames}</span>
                  <span className="summary-label">Jogos Diferentes</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon">👥</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.totalPlayers}</span>
                  <span className="summary-label">Jogadores Únicos</span>
                </div>
              </div>
            </div>

            {/* Top Winners */}
            <div className="stats-section">
              <h2>🥇 Top Vencedores</h2>
              <p className="stats-section-hint">Clique num jogador para ver detalhes</p>
              {playerWins.length > 0 ? (
                <div className="leaderboard">
                  {playerWins.map(([player, wins], rank) => (
                    <button
                      key={player}
                      className="leaderboard-item clickable"
                      onClick={() => setSelectedPlayer(player)}
                      title={`Ver estatísticas de ${player}`}
                    >
                      <span className="rank-badge">{rank + 1}</span>
                      <div className="leaderboard-info">
                        <span className="player-name">{player}</span>
                        <span className="player-stat">
                          {wins} vitória{wins !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(wins / playerWins[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="leaderboard-chevron">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-section">Sem dados</p>
              )}
            </div>

            {/* Most Played Games */}
            <div className="stats-section">
              <h2>🎲 Jogos Mais Jogados</h2>
              {gameFreq.length > 0 ? (
                <div className="leaderboard">
                  {gameFreq.map(([game, count], rank) => (
                    <div key={game} className="leaderboard-item">
                      <span className="rank-badge">{rank + 1}</span>
                      <div className="leaderboard-info">
                        <span className="player-name">{game}</span>
                        <span className="player-stat">
                          {count} partida{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(count / gameFreq[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-section">Sem dados</p>
              )}
            </div>

            {/* Participation */}
            <div className="stats-section">
              <h2>👤 Participação</h2>
              <p className="stats-section-hint">Clique num jogador para ver detalhes</p>
              {playerApps.length > 0 ? (
                <div className="leaderboard">
                  {playerApps.map(([player, appearances], rank) => {
                    const winCount = games.filter((g) => g.winner === player).length;
                    const competitiveCount = games.filter(
                      (g) =>
                        g.players.includes(player) &&
                        (!g.gameType || g.gameType === 'competitive')
                    ).length;
                    const winRate =
                      competitiveCount > 0
                        ? ((winCount / competitiveCount) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <button
                        key={player}
                        className="leaderboard-item clickable"
                        onClick={() => setSelectedPlayer(player)}
                        title={`Ver estatísticas de ${player}`}
                      >
                        <span className="rank-badge">{rank + 1}</span>
                        <div className="leaderboard-info">
                          <span className="player-name">{player}</span>
                          <span className="player-stat">
                            {appearances} participação{appearances !== 1 ? 's' : ''} • {winRate}% vitórias
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(appearances / playerApps[0][1]) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="leaderboard-chevron">›</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-section">Sem dados</p>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          games={games}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
};
