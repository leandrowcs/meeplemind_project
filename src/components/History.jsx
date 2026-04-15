import { useState, useEffect } from 'react';
import { Button, IconButton } from './Button';
import { GameDetailsModal } from './GameDetailsModal';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import './History.css';

export const History = ({ onNavigate, games, onDelete, onUpdate, uniqueGames }) => {
  const { language, changeLanguage, t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('all'); // 'all' | 'competitive' | 'cooperative'
  const [modalGame, setModalGame] = useState(null);
  const [expandedGameId, setExpandedGameId] = useState(null);

  // Reset game filter when game type changes
  useEffect(() => {
    setSelectedFilter('');
  }, [gameTypeFilter]);

  const filteredGames = games.filter((g) => {
    const matchesName = !selectedFilter || g.game === selectedFilter;
    const type = g.gameType || 'competitive';
    const matchesType = gameTypeFilter === 'all' || type === gameTypeFilter;
    return matchesName && matchesType;
  });

  const formatDate = (isoDate) => {
    if (!isoDate) return '—';
    const dateStr = isoDate.includes('T') ? isoDate : isoDate + 'T00:00:00';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(
      language === 'pt-BR' ? 'pt-BR' : language === 'fr-CA' ? 'fr-CA' : 'en-US',
      { day: '2-digit', month: '2-digit', year: 'numeric' }
    ).format(date);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  const getPlayerStats = (gameName) => {
    const gameRecords = games.filter((g) => g.game === gameName);
    if (gameRecords.length === 0) return null;
    const stats = { totalGames: gameRecords.length, players: new Set(), averageDuration: null };
    let totalDuration = 0, durationCount = 0;
    gameRecords.forEach((record) => {
      record.players.forEach((p) => stats.players.add(p));
      if (record.duration) { totalDuration += record.duration; durationCount++; }
    });
    if (durationCount > 0) stats.averageDuration = Math.round(totalDuration / durationCount);
    return stats;
  };

  // Get unique games filtered by selected game type
  const getFilteredGamesList = () => {
    const filtered = games.filter((g) => {
      const type = g.gameType || 'competitive';
      return gameTypeFilter === 'all' || type === gameTypeFilter;
    });
    const gameNames = new Set(filtered.map((g) => g.game));
    return Array.from(gameNames).sort();
  };

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <div className="history-container fade-in">
        <header className="history-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('history.title')}</h1>
        </header>

        <div className="content">
          {games.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>{t('history.noGames')}</p>
              <Button variant="accent" onClick={() => onNavigate('newgame')}>
                {t('home.newGame')}
              </Button>
            </div>
          ) : (
            <>
              {/* Game-type filter */}
              <div className="filter-section">
                <div className="filter-label">{t('history.filterType')}</div>
                <div className="filter-buttons">
                  {['all', 'competitive', 'cooperative'].map((type) => (
                    <button
                      key={type}
                      className={`filter-btn ${gameTypeFilter === type ? 'active' : ''}`}
                      onClick={() => setGameTypeFilter(type)}
                    >
                      {t(`history.filter${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game-name filter */}
              <div className="filter-section">
                <div className="filter-label">{t('history.game')}:</div>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${!selectedFilter ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('')}
                  >
                    {t('history.filterAll')}
                  </button>
                  {getFilteredGamesList().map((game) => (
                    <button
                      key={game}
                      className={`filter-btn ${selectedFilter === game ? 'active' : ''}`}
                      onClick={() => setSelectedFilter(game)}
                    >
                      {game}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats for selected game */}
              {selectedFilter && getPlayerStats(selectedFilter) && (
                <div className="game-stats">
                  <div className="stat-row">
                    <span>{t('stats.timesPlayed')}:</span>
                    <strong>{getPlayerStats(selectedFilter).totalGames}×</strong>
                  </div>
                  <div className="stat-row">
                    <span>{t('stats.players')}:</span>
                    <strong>{getPlayerStats(selectedFilter).players.size}</strong>
                  </div>
                  {getPlayerStats(selectedFilter).averageDuration && (
                    <div className="stat-row">
                      <span>{t('history.duration')}:</span>
                      <strong>{formatDuration(getPlayerStats(selectedFilter).averageDuration)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Games list */}
              <div className="games-list">
                {filteredGames.length === 0 ? (
                  <div className="no-filter-results">
                    <p>{selectedFilter ? `"${selectedFilter}"` : '—'}</p>
                  </div>
                ) : (
                  filteredGames.map((game) => {
                    const isCoop = (game.gameType || 'competitive') === 'cooperative';
                    const isExpanded = expandedGameId === game.id;
                    return (
                      <div 
                        key={game.id} 
                        className={`game-card ${isExpanded ? 'expanded' : 'collapsed'}`}
                      >
                        {/* Collapsed Header - Always visible */}
                        <div 
                          className="card-header collapsed-header"
                          onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="card-header-title">
                            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            <h3>{game.game}</h3>
                            <span className={`game-type-badge ${isCoop ? 'coop' : 'competitive'}`}>
                              {isCoop ? t('history.badgeCooperative') : t('history.badgeCompetitive')}
                            </span>
                          </div>
                          <div className="header-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-edit"
                              onClick={() => setModalGame(game)}
                              title={t('common.edit')}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => {
                                if (confirm(t('history.confirmDelete'))) onDelete(game.id);
                              }}
                              title={t('history.delete')}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content - Only visible when expanded */}
                        {isExpanded && (
                          <>
                            {/* Rating & Notes */}
                            {(game.rating > 0 || game.notes) && (
                              <div className="card-details">
                                {game.rating > 0 && (
                                  <div className="rating-display">
                                    <span>{'⭐'.repeat(game.rating)}</span>
                                    <span className="rating-text">{game.rating}/5</span>
                                  </div>
                                )}
                                {game.notes && (
                                  <div className="notes-display">
                                    <span className="notes-text">{game.notes}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="card-content">
                              {isCoop ? (
                                <div className="card-stat">
                                  <span className="icon">{game.coopResult === 'win' ? '🏆' : '💀'}</span>
                                  <div>
                                    <span className="label">{t('history.result')}</span>
                                    <span className={`value coop-result ${game.coopResult === 'win' ? 'win' : 'loss'}`}>
                                      {game.coopResult === 'win' ? t('history.coopWin') : t('history.coopLoss')}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="card-stat">
                                  <span className="icon">👑</span>
                                  <div>
                                    <span className="label">{t('history.winner')}</span>
                                    <span className="value">{game.winner}</span>
                                  </div>
                                </div>
                              )}

                              <div className="card-stat">
                                <span className="icon">👥</span>
                                <div>
                                  <span className="label">{t('newgame.players')}</span>
                                  <span className="value">{game.players.length}</span>
                                </div>
                              </div>

                              {game.duration && (
                                <div className="card-stat">
                                  <span className="icon">⏱️</span>
                                  <div>
                                    <span className="label">{t('history.duration')}</span>
                                    <span className="value">{formatDuration(game.duration)}</span>
                                  </div>
                                </div>
                              )}

                              <div className="card-stat">
                                <span className="icon">📅</span>
                                <div>
                                  <span className="label">{t('history.date')}</span>
                                  <span className="value">{formatDate(game.date)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Players section */}
                            {isCoop ? (
                              <div className="players-coop">
                                {game.players.map((player, i) => (
                                  <span key={i} className="coop-player-chip">{player}</span>
                                ))}
                              </div>
                            ) : (
                              <div className="players-ranking">
                                {[...game.players]
                                  .map((player, index) => ({ player, points: game.points[index] }))
                                  .sort((a, b) => b.points - a.points)
                                  .map(({ player, points }, index) => {
                                    const isWinner = player === game.winner;
                                    return (
                                      <div key={index} className={`ranking-item ${isWinner ? 'winner' : ''}`}>
                                        <span className="rank-icon">
                                          {isWinner ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•'}
                                        </span>
                                        <span className="player-name">{player}</span>
                                        <span className="points">{points} pts</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {modalGame && (
        <GameDetailsModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          onSave={(updates) => {
            onUpdate(modalGame.id, updates);
            setModalGame(null);
          }}
        />
      )}
    </>
  );
};
