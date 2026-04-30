import { useMemo, useState } from 'react';
import {
  ArchiveX,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  Dot,
  House,
  Medal,
  Pencil,
  ScrollText,
  Skull,
  Star,
  Timer,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { GameDetailsModal } from './GameDetailsModal';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../utils/dateFormat';
import { buildLibraryCoverMap, getCoverByGameName } from '../utils/gameCover';
import './History.css';

const sortGamesByDateDesc = (gameA, gameB) => new Date(gameB.date) - new Date(gameA.date);

export const History = ({
  onNavigate,
  games,
  library = [],
  onDelete,
  onUpdate,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
  auth,
  syncStatus,
  displayPlayerName,
  googlePhotoUrl,
  sideMenuNotifications = {},
}) => {
  const { language, t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');
  const [modalGame, setModalGame] = useState(null);
  const [expandedGameId, setExpandedGameId] = useState(null);

  const safeGames = useMemo(() => (Array.isArray(games) ? games : []), [games]);
  const coverByGame = useMemo(() => buildLibraryCoverMap(library), [library]);

  const handleTypeFilterChange = (type) => {
    setGameTypeFilter(type);
    setSelectedFilter('');
  };

  const filteredGames = useMemo(() => {
    return safeGames
      .filter((entry) => {
        const matchesName = !selectedFilter || entry.game === selectedFilter;
        const type = entry.gameType || 'competitive';
        const matchesType = gameTypeFilter === 'all' || type === gameTypeFilter;
        return matchesName && matchesType;
      })
      .sort(sortGamesByDateDesc);
  }, [safeGames, selectedFilter, gameTypeFilter]);

  const filteredGameNames = useMemo(() => {
    const names = new Set(
      safeGames
        .filter((entry) => {
          const type = entry.gameType || 'competitive';
          return gameTypeFilter === 'all' || type === gameTypeFilter;
        })
        .map((entry) => entry.game)
        .filter(Boolean)
    );

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [safeGames, gameTypeFilter]);

  const gameStatsByName = useMemo(() => {
    const statsMap = new Map();

    safeGames.forEach((entry) => {
      if (!entry?.game) return;

      if (!statsMap.has(entry.game)) {
        statsMap.set(entry.game, {
          totalGames: 0,
          players: new Set(),
          totalDuration: 0,
          durationCount: 0,
        });
      }

      const aggregate = statsMap.get(entry.game);
      aggregate.totalGames += 1;
      (entry.players || []).forEach((player) => aggregate.players.add(player));

      if (Number.isFinite(entry.duration) && entry.duration > 0) {
        aggregate.totalDuration += entry.duration;
        aggregate.durationCount += 1;
      }
    });

    return statsMap;
  }, [safeGames]);

  const selectedGameStats = selectedFilter ? gameStatsByName.get(selectedFilter) : null;

  const formatDuration = (minutes) => {
    if (!minutes || !Number.isFinite(minutes)) return null;
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    return `${hours}h${remainMinutes > 0 ? ` ${remainMinutes}min` : ''}`;
  };

  const averageDurationLabel = selectedGameStats && selectedGameStats.durationCount > 0
    ? formatDuration(Math.round(selectedGameStats.totalDuration / selectedGameStats.durationCount))
    : null;

  return (
    <>
      <div className="history-container fade-in">
        <header className="history-header-modern">
          <div className="history-title-wrap">
            <span className="history-title-icon"><ScrollText size={18} /></span>
            <h1>{t('history.title')}</h1>
          </div>
          <SideMenu
            onExportCSV={exportToCSV}
            onExportJSON={exportToJSON}
            onImportJSON={importFromJSON}
            onClearData={clearAllData}
            onOpenSettings={() => onNavigate('settings')}
            auth={auth}
            syncStatus={syncStatus}
            compact
            openFrom="right"
            userName={displayPlayerName}
            userPhotoUrl={googlePhotoUrl}
            {...sideMenuNotifications}
          />
        </header>
        <div className="history-content">
          {safeGames.length === 0 ? (
            <div className="history-empty-state">
              <span className="history-empty-icon"><ArchiveX size={22} /></span>
              <p>{t('history.noGames')}</p>
              <Button variant="accent" onClick={() => onNavigate('newgame')}>
                {t('home.newGame')}
              </Button>
            </div>
          ) : (
            <>
              <section className="history-panel">
                <div className="history-filter-block">
                  <span className="history-filter-label">{t('history.filterType')}</span>
                  <div className="history-filter-buttons">
                    {['all', 'competitive', 'cooperative'].map((type) => (
                      <button
                        key={type}
                        className={`history-filter-btn ${gameTypeFilter === type ? 'active' : ''}`}
                        onClick={() => handleTypeFilterChange(type)}
                        type="button"
                      >
                        {t(`history.filter${type.charAt(0).toUpperCase()}${type.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="history-filter-block">
                  <span className="history-filter-label">{t('history.game')}</span>
                  <div className="history-filter-buttons">
                    <button
                      className={`history-filter-btn ${!selectedFilter ? 'active' : ''}`}
                      onClick={() => setSelectedFilter('')}
                      type="button"
                    >
                      {t('history.filterAll')}
                    </button>
                    {filteredGameNames.map((gameName) => (
                      <button
                        key={gameName}
                        className={`history-filter-btn ${selectedFilter === gameName ? 'active' : ''}`}
                        onClick={() => setSelectedFilter(gameName)}
                        type="button"
                      >
                        {gameName}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {selectedFilter && selectedGameStats && (
                <section className="history-panel history-game-stats">
                  <article>
                    <span>{t('stats.timesPlayed')}</span>
                    <strong>{selectedGameStats.totalGames}×</strong>
                  </article>
                  <article>
                    <span>{t('stats.players')}</span>
                    <strong>{selectedGameStats.players.size}</strong>
                  </article>
                  {averageDurationLabel && (
                    <article>
                      <span>{t('history.duration')}</span>
                      <strong>{averageDurationLabel}</strong>
                    </article>
                  )}
                </section>
              )}

              <section className="history-games-list">
                {filteredGames.length === 0 ? (
                  <div className="history-no-results">
                    <p>{selectedFilter ? selectedFilter : '—'}</p>
                  </div>
                ) : (
                  filteredGames.map((game) => {
                    const isCooperative = (game.gameType || 'competitive') === 'cooperative';
                    const isExpanded = expandedGameId === game.id;
                    const coverUrl = getCoverByGameName(game.game, coverByGame);

                    const rankedPlayers = [...(game.players || [])]
                      .map((player, index) => ({
                        player,
                        points: Number.isFinite(game.points?.[index]) ? game.points[index] : 0,
                      }))
                      .sort((entryA, entryB) => entryB.points - entryA.points);

                    return (
                      <article
                        key={game.id}
                        className={`history-game-card ${isExpanded ? 'expanded' : 'collapsed'}${isExpanded && coverUrl ? ' with-cover' : ''}`}
                        style={isExpanded && coverUrl ? { '--history-cover-url': `url("${coverUrl}")` } : undefined}
                      >
                        <header
                          className="history-card-header"
                          onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setExpandedGameId(isExpanded ? null : game.id);
                            }
                          }}
                        >
                          <div className="history-card-title-wrap">
                            <span className="history-expand-icon">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <h3>{game.game}</h3>
                            <span className={`history-type-badge ${isCooperative ? 'coop' : 'competitive'}`}>
                              {isCooperative ? t('history.badgeCooperative') : t('history.badgeCompetitive')}
                            </span>
                            {!isExpanded && (
                              <>
                                <span className="history-mini-badge date">
                                  <CalendarDays size={13} /> {formatDate(game.date, language)}
                                </span>
                                <span className={`history-mini-badge result ${isCooperative ? 'coop' : 'competitive'}`}>
                                  {isCooperative ? (
                                    <>
                                      {game.coopResult === 'win' ? <Trophy size={13} /> : <Skull size={13} />}
                                      {game.coopResult === 'win' ? t('history.coopWin') : t('history.coopLoss')}
                                    </>
                                  ) : (
                                    <>
                                      <Crown size={13} /> {t('history.competitiveWinner')} {game.winner}
                                    </>
                                  )}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="history-card-actions" onClick={(event) => event.stopPropagation()}>
                            <button
                              className="history-action-btn edit"
                              onClick={() => setModalGame(game)}
                              title={t('common.edit')}
                              type="button"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="history-action-btn delete"
                              onClick={() => {
                                if (confirm(t('history.confirmDelete'))) onDelete(game.id);
                              }}
                              title={t('history.delete')}
                              type="button"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </header>

                        {isExpanded && (
                          <>
                            {(game.rating > 0 || game.notes) && (
                              <div className="history-rating-notes">
                                {game.rating > 0 && (
                                  <div className="history-rating-row">
                                    <span>{Array.from({ length: game.rating }).map((_, index) => <Star key={`${game.id}-star-${index}`} size={13} />)}</span>
                                    <small>{game.rating}/5</small>
                                  </div>
                                )}
                                {game.notes && (
                                  <p>{game.notes}</p>
                                )}
                              </div>
                            )}

                            <div className="history-stats-grid">
                              {isCooperative ? (
                                <article className="history-stat-item">
                                  <span className="history-stat-icon">{game.coopResult === 'win' ? <Trophy size={16} /> : <Skull size={16} />}</span>
                                  <div>
                                    <span>{t('history.result')}</span>
                                    <strong>{game.coopResult === 'win' ? t('history.coopWin') : t('history.coopLoss')}</strong>
                                  </div>
                                </article>
                              ) : (
                                <article className="history-stat-item">
                                  <span className="history-stat-icon"><Crown size={16} /></span>
                                  <div>
                                    <span>{t('history.winner')}</span>
                                    <strong>{game.winner}</strong>
                                  </div>
                                </article>
                              )}

                              <article className="history-stat-item">
                                <span className="history-stat-icon"><Users size={16} /></span>
                                <div>
                                  <span>{t('newgame.players')}</span>
                                  <strong>{(game.players || []).length}</strong>
                                </div>
                              </article>

                              {game.duration && (
                                <article className="history-stat-item">
                                  <span className="history-stat-icon"><Timer size={16} /></span>
                                  <div>
                                    <span>{t('history.duration')}</span>
                                    <strong>{formatDuration(game.duration)}</strong>
                                  </div>
                                </article>
                              )}

                              <article className="history-stat-item">
                                <span className="history-stat-icon"><CalendarDays size={16} /></span>
                                <div>
                                  <span>{t('history.date')}</span>
                                  <strong>{formatDate(game.date, language)}</strong>
                                </div>
                              </article>
                            </div>

                            {isCooperative ? (
                              <div className="history-coop-players">
                                {(game.players || []).map((playerName, index) => (
                                  <span key={`${game.id}-coop-${index}`} className="history-player-chip">{playerName}</span>
                                ))}
                              </div>
                            ) : (
                              <div className="history-ranking-list">
                                {rankedPlayers.map(({ player, points }, index) => {
                                  const isWinner = player === game.winner;
                                  return (
                                    <article key={`${game.id}-rank-${player}-${index}`} className={`history-ranking-item${isWinner ? ' winner' : ''}`}>
                                      <span className="history-rank-icon">
                                        {isWinner ? <Trophy size={13} /> : index === 1 ? <Medal size={13} /> : index === 2 ? <Medal size={13} /> : <Dot size={13} />}
                                      </span>
                                      <span className="history-ranking-name">{player}</span>
                                      <strong>{points} pts</strong>
                                    </article>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className="bottom-nav-item" onClick={() => onNavigate('home')}>
            <span><House size={18} /></span>
            <small>Home</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('stats')}>
            <span><BarChart3 size={18} /></span>
            <small>{t('stats.title')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('library')}>
            <span><BookOpen size={18} /></span>
            <small>{t('home.library')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('friends')}>
            <span><Users size={18} /></span>
            <small>{t('home.friends')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{t('home.profile')}</small>
          </button>
        </nav>
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
