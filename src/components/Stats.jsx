import { useState } from 'react';
import { Button } from './Button';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import { PlayerStatsModal } from './PlayerStatsModal';
import './Stats.css';

export const Stats = ({ onNavigate, games, stats }) => {
  const { language, changeLanguage, t } = useLanguage();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('competitive'); // 'competitive' | 'cooperative'

  const getCompetitiveStats = () => {
    const competitiveGames = games.filter((g) => (g.gameType || 'competitive') === 'competitive');
    const wins = {};
    const appearances = {};

    competitiveGames.forEach((game) => {
      if (game.winner) {
        wins[game.winner] = (wins[game.winner] || 0) + 1;
      }
      game.players.forEach((player) => {
        appearances[player] = (appearances[player] || 0) + 1;
      });
    });

    return { wins, appearances };
  };

  const getCooperativeStats = () => {
    const cooperativeGames = games.filter((g) => g.gameType === 'cooperative');
    const wins = cooperativeGames.filter((g) => g.coopResult === 'win').length;
    const losses = cooperativeGames.filter((g) => g.coopResult === 'loss').length;
    const successRate = cooperativeGames.length > 0 
      ? Math.round((wins / cooperativeGames.length) * 100) 
      : 0;

    return { wins, losses, successRate, total: cooperativeGames.length };
  };

  const getGameFrequencyByType = (gameType) => {
    const freq = {};
    games
      .filter((g) => (gameType === 'competitive' ? (g.gameType || 'competitive') === 'competitive' : g.gameType === 'cooperative'))
      .forEach((game) => {
        freq[game.game] = (freq[game.game] || 0) + 1;
      });
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const competitiveStats = getCompetitiveStats();
  const cooperativeStats = getCooperativeStats();
  const competitiveGameFreq = getGameFrequencyByType('competitive');
  const cooperativeGameFreq = getGameFrequencyByType('cooperative');

  // Top Winners/Competitive Players
  const competitiveWins = Object.entries(competitiveStats.wins)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Competitive Players by appearances with win rate
  const competitivePlayerStats = Object.entries(competitiveStats.appearances)
    .map(([player, appearances]) => ({
      player,
      appearances,
      wins: competitiveStats.wins[player] || 0,
      winRate: Math.round(((competitiveStats.wins[player] || 0) / appearances) * 100),
    }))
    .sort(([, a], [, b]) => b.winRate - a.winRate)
    .slice(0, 10);

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <div className="stats-container fade-in">
        <header className="stats-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('stats.title')}</h1>
        </header>

        {games.length === 0 ? (
          <div className="empty-stats">
            <span className="empty-icon">📊</span>
            <p>Não há dados para exibir</p>
            <Button variant="accent" onClick={() => onNavigate('newgame')}>
              {t('home.newGame')}
            </Button>
          </div>
        ) : (
          <div className="stats-content">
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-icon">🎮</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.totalGames}</span>
                  <span className="summary-label">{t('stats.totalGames')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon">🎯</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.uniqueGames}</span>
                  <span className="summary-label">{t('stats.gameStats')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon">👥</span>
                <div className="summary-content">
                  <span className="summary-value">{stats.totalPlayers}</span>
                  <span className="summary-label">{t('stats.playerStats')}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="stats-tabs">
              <button
                className={`tab-btn ${activeTab === 'competitive' ? 'active' : ''}`}
                onClick={() => setActiveTab('competitive')}
              >
                ⚔️ {t('stats.competitive')}
              </button>
              <button
                className={`tab-btn ${activeTab === 'cooperative' ? 'active' : ''}`}
                onClick={() => setActiveTab('cooperative')}
              >
                🤝 {t('stats.cooperative')}
              </button>
            </div>

            {/* Competitive Stats */}
            {activeTab === 'competitive' && (
              <div className="stats-grid">
                {/* Top Winners */}
                <div className="stats-section">
                  <h2>🥇 {t('stats.topWinnersLabel')}</h2>
                  <p className="stats-section-hint">{t('history.filterCompetitive')}</p>
                  {competitiveWins.length > 0 ? (
                    <div className="leaderboard">
                      {competitiveWins.map(([player, wins], rank) => (
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
                              style={{ width: `${(wins / competitiveWins[0][1]) * 100}%` }}
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

                {/* Win Rates */}
                <div className="stats-section">
                  <h2>📊 {t('stats.winRateLabel')}</h2>
                  <p className="stats-section-hint">Por jogador</p>
                  {competitivePlayerStats.length > 0 ? (
                    <div className="leaderboard">
                      {competitivePlayerStats.map(({ player, winRate, wins, appearances }, rank) => (
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
                              {wins}/{appearances} • {winRate}%
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${winRate}%` }}
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

                {/* Most Played Games (Competitive) */}
                <div className="stats-section">
                  <h2>🎲 {t('stats.mostPlayedLabel')}</h2>
                  {competitiveGameFreq.length > 0 ? (
                    <div className="leaderboard">
                      {competitiveGameFreq.map(([game, count], rank) => (
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
                              style={{ width: `${(count / competitiveGameFreq[0][1]) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-section">Sem dados</p>
                  )}
                </div>
              </div>
            )}

            {/* Cooperative Stats */}
            {activeTab === 'cooperative' && (
              <div className="stats-grid">
                {/* Success Rate */}
                <div className="stats-section full-width">
                  <h2>🎯 {t('stats.successRateLabel')}</h2>
                  {cooperativeStats.total > 0 ? (
                    <div className="success-rate-card">
                      <div className="success-rate-content">
                        <div className="rate-display">
                          <span className="rate-value">{cooperativeStats.successRate}%</span>
                          <span className="rate-label">{t('stats.successRateLabel')}</span>
                        </div>
                        <div className="rate-stats">
                          <div className="rate-item">
                            <span className="rate-icon">🏆</span>
                            <span className="rate-number">{cooperativeStats.wins}</span>
                            <span className="rate-text">Vitória{cooperativeStats.wins !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="rate-divider">|</div>
                          <div className="rate-item">
                            <span className="rate-icon">💀</span>
                            <span className="rate-number">{cooperativeStats.losses}</span>
                            <span className="rate-text">Derrota{cooperativeStats.losses !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="progress-bar-large">
                        <div
                          className="progress-fill"
                          style={{ width: `${cooperativeStats.successRate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="empty-section">Nenhum jogo cooperativo registrado</p>
                  )}
                </div>

                {/* Most Played Games (Cooperative) */}
                {cooperativeGameFreq.length > 0 && (
                  <div className="stats-section">
                    <h2>🎲 {t('stats.mostPlayedLabel')}</h2>
                    <div className="leaderboard">
                      {cooperativeGameFreq.map(([game, count], rank) => (
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
                              style={{ width: `${(count / cooperativeGameFreq[0][1]) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
