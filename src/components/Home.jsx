import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleStar,
  Dices,
  Flame,
  Handshake,
  History,
  House,
  Swords,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { SideMenu } from './SideMenu';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../utils/dateFormat';
import './Home.css';

const SWIPE_MIN_DISTANCE = 42;
const SWIPE_MAX_VERTICAL_DRIFT = 56;
const SWIPE_MAX_TIME_MS = 700;

const pickRandomItems = (items, limit = 3) => {
  const randomized = Array.isArray(items) ? [...items] : [];

  for (let i = randomized.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
  }

  return randomized.slice(0, limit);
};

export const Home = ({
  onNavigate,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  primaryPlayer,
  displayPlayerName,
  clearAllData,
  auth,
  syncStatus,
  games = [],
  library = [],
  googlePhotoUrl,
  sideMenuNotifications = {},
}) => {
  const { t, isInitialized, language } = useLanguage();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const carouselTouchStartRef = useRef({ x: 0, y: 0, at: 0 });

  const formatTemplate = useCallback((key, replacements = {}) => {
    let text = t(key);
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replaceAll(`{${placeholder}}`, String(value));
    });
    return text;
  }, [t]);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [games]
  );

  const recentGames = sortedGames.slice(0, 3);

  const coverMap = useMemo(() => {
    const map = new Map();
    library.forEach((entry) => {
      if (entry?.name) {
        map.set(entry.name.toLowerCase(), entry.coverUrl || '');
      }
    });
    return map;
  }, [library]);

  const gamesLast30Days = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return sortedGames.filter((game) => {
      const date = new Date(game.date);
      return date >= thirtyDaysAgo && date <= now;
    }).length;
  }, [sortedGames]);

  const totalPlayersAvg = useMemo(() => {
    if (games.length === 0) return 0;
    const sum = games.reduce((acc, game) => acc + (game.players?.length || 0), 0);
    return Math.round((sum / games.length) * 10) / 10;
  }, [games]);

  const mostPlayedGameData = useMemo(() => {
    const count = {};
    sortedGames.forEach((game) => {
      count[game.game] = (count[game.game] || 0) + 1;
    });
    return Object.entries(count).sort(([, a], [, b]) => b - a)[0] || null;
  }, [sortedGames]);

  const competitiveGames = useMemo(
    () => sortedGames.filter((g) => (g.gameType || 'competitive') === 'competitive'),
    [sortedGames]
  );

  const cooperativeGames = useMemo(
    () => sortedGames.filter((g) => g.gameType === 'cooperative'),
    [sortedGames]
  );

  const competitiveStreak = useMemo(() => {
    let streak = 0;
    for (const game of competitiveGames) {
      if (game.winner === primaryPlayer) {
        streak += 1;
      } else if ((game.players || []).includes(primaryPlayer)) {
        break;
      }
    }
    return streak;
  }, [competitiveGames, primaryPlayer]);

  const userCompetitiveWins = useMemo(
    () => competitiveGames.filter((g) => g.winner === primaryPlayer).length,
    [competitiveGames, primaryPlayer]
  );

  const userCoopWins = useMemo(
    () => cooperativeGames.filter((g) => g.coopResult === 'win' && (g.players || []).includes(primaryPlayer)).length,
    [cooperativeGames, primaryPlayer]
  );

  const coopSuccessRate = useMemo(() => {
    if (cooperativeGames.length === 0) return 0;
    const wins = cooperativeGames.filter((g) => g.coopResult === 'win').length;
    return Math.round((wins / cooperativeGames.length) * 100);
  }, [cooperativeGames]);

  const topOpponentData = useMemo(() => {
    const count = {};
    competitiveGames.forEach((game) => {
      (game.players || []).forEach((player) => {
        if (player !== primaryPlayer) {
          count[player] = (count[player] || 0) + 1;
        }
      });
    });
    return Object.entries(count).sort(([, a], [, b]) => b - a)[0] || null;
  }, [competitiveGames, primaryPlayer]);

  const userCompetitiveWinRate = useMemo(() => {
    const userCompetitiveGames = competitiveGames.filter((g) => (g.players || []).includes(primaryPlayer));
    if (userCompetitiveGames.length === 0) return 0;
    return Math.round((userCompetitiveWins / userCompetitiveGames.length) * 100);
  }, [competitiveGames, primaryPlayer, userCompetitiveWins]);

  const insightPool = useMemo(() => {
    const pool = [
      {
        id: 'streak',
        icon: Flame,
        title: formatTemplate('home.insight.streak.title', {
          count: competitiveStreak,
          gamesLabel: t(competitiveStreak === 1 ? 'home.game' : 'home.games'),
        }),
        detail: t('home.insight.streak.detail'),
      },
      {
        id: 'most-played',
        icon: Target,
        title:
          mostPlayedGameData
            ? formatTemplate('home.insight.mostPlayed.titleWithGame', { game: mostPlayedGameData[0] })
            : t('home.insight.mostPlayed.titleEmpty'),
        detail:
          mostPlayedGameData
            ? formatTemplate('home.insight.mostPlayed.detailWithCount', {
              count: mostPlayedGameData[1],
              matchesLabel: t(mostPlayedGameData[1] === 1 ? 'home.game' : 'home.games'),
            })
            : t('home.insight.mostPlayed.detailEmpty'),
      },
      {
        id: 'coop-rate',
        icon: Handshake,
        title: formatTemplate('home.insight.coopRate.title', { rate: coopSuccessRate }),
        detail:
          cooperativeGames.length === 1
            ? formatTemplate('home.insight.coopRate.detailSingular', { count: cooperativeGames.length })
            : formatTemplate('home.insight.coopRate.detailPlural', { count: cooperativeGames.length }),
      },
      {
        id: 'wins-total',
        icon: Trophy,
        title: formatTemplate('home.insight.winsTotal.title', { count: userCompetitiveWins + userCoopWins }),
        detail: formatTemplate('home.insight.winsTotal.detail', {
          competitiveWins: userCompetitiveWins,
          coopWins: userCoopWins,
        }),
      },
      {
        id: 'activity',
        icon: CalendarDays,
        title: formatTemplate('home.insight.activity.title', {
          count: gamesLast30Days,
          gamesLabel: t(gamesLast30Days === 1 ? 'home.game' : 'home.games'),
        }),
        detail: t('home.insight.activity.detail'),
      },
      {
        id: 'opponent',
        icon: Swords,
        title:
          topOpponentData
            ? formatTemplate('home.insight.opponent.titleWithName', { name: topOpponentData[0] })
            : t('home.insight.opponent.titleEmpty'),
        detail:
          topOpponentData
            ? topOpponentData[1] === 1
              ? formatTemplate('home.insight.opponent.detailSingular', { count: topOpponentData[1] })
              : formatTemplate('home.insight.opponent.detailPlural', { count: topOpponentData[1] })
            : t('home.insight.opponent.detailEmpty'),
      },
      {
        id: 'avg-players',
        icon: Users,
        title: formatTemplate('home.insight.avgPlayers.title', { value: totalPlayersAvg }),
        detail: t('home.insight.avgPlayers.detail'),
      },
      {
        id: 'comp-winrate',
        icon: BarChart3,
        title: formatTemplate('home.insight.compWinrate.title', { rate: userCompetitiveWinRate }),
        detail: t('home.insight.compWinrate.detail'),
      },
    ];

    return pool;
  }, [
    competitiveStreak,
    cooperativeGames.length,
    coopSuccessRate,
    formatTemplate,
    gamesLast30Days,
    mostPlayedGameData,
    t,
    topOpponentData,
    totalPlayersAvg,
    userCompetitiveWinRate,
    userCompetitiveWins,
    userCoopWins,
  ]);

  const highlights = useMemo(() => {
    return pickRandomItems(insightPool, 3);
  }, [insightPool]);

  const currentCarouselIndex = recentGames.length === 0 ? 0 : Math.min(carouselIndex, recentGames.length - 1);
  const currentGame = recentGames[currentCarouselIndex] || null;

  const nextSlide = () => {
    if (recentGames.length <= 1) return;
    setCarouselIndex((prev) => (prev + 1) % recentGames.length);
  };

  const prevSlide = () => {
    if (recentGames.length <= 1) return;
    setCarouselIndex((prev) => (prev - 1 + recentGames.length) % recentGames.length);
  };

  const onCarouselTouchStart = useCallback((event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    carouselTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
    };
  }, []);

  const onCarouselTouchEnd = (event) => {
    if (recentGames.length <= 1 || event.changedTouches.length !== 1) return;

    const start = carouselTouchStartRef.current;
    const endTouch = event.changedTouches[0];
    const deltaX = endTouch.clientX - start.x;
    const deltaY = endTouch.clientY - start.y;
    const duration = Date.now() - start.at;

    if (duration > SWIPE_MAX_TIME_MS) return;
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT || Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      nextSlide();
      return;
    }

    prevSlide();
  };

  useEffect(() => {
    if (recentGames.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % recentGames.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [recentGames.length]);

  const getGameResultLabel = (game) => {
    const isCoop = game.gameType === 'cooperative';
    if (isCoop) {
      if (game.coopResult === 'win') {
        return t('home.teamVictory');
      }
      return t('home.teamDefeat');
    }
    const winner = game.winner || '—';
    return formatTemplate('home.winnerWon', { winner });
  };

  const getGameCover = (gameName) => coverMap.get((gameName || '').toLowerCase()) || '/meeplemind_background_no_logo_small_icons_faded.png';

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <div className="home-container fade-in">
        <header className="home-header">
          <div className="header-main-row">
            <div>
              <h2 className="welcome-message">
                {t('home.welcome')}, <span className="username">{displayPlayerName || primaryPlayer}</span>
              </h2>
              <p className="header-subtitle"><Flame size={16} /> {gamesLast30Days} {t('home.gamesLast30Days')}</p>
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
              userName={displayPlayerName || primaryPlayer}
              userPhotoUrl={googlePhotoUrl}
              {...sideMenuNotifications}
            />
          </div>
        </header>

        <main className="home-content">
          <section className="home-card">
            <div className="card-headline">
              <h3 className="card-title"><Dices size={18} /> {t('home.lastGame')}</h3>
              {recentGames.length > 1 && (
                <div className="carousel-actions" role="group" aria-label="carousel actions">
                  <button className="carousel-btn" onClick={prevSlide} aria-label="Previous game">‹</button>
                  <button className="carousel-btn" onClick={nextSlide} aria-label="Next game">›</button>
                </div>
              )}
            </div>

            {!currentGame ? (
              <div className="empty-block">{t('home.carousel.empty')}</div>
            ) : (
              <div
                className="last-game-carousel-card"
                onTouchStart={onCarouselTouchStart}
                onTouchEnd={onCarouselTouchEnd}
              >
                <div className="last-game-cover-wrap">
                  <img
                    src={getGameCover(currentGame.game)}
                    alt={currentGame.game}
                    className="last-game-cover"
                    loading="lazy"
                  />
                  <div className="last-game-overlay">
                    <h4>{currentGame.game}</h4>
                    <p>{getGameResultLabel(currentGame)}</p>
                  </div>
                </div>
                <div className="last-game-meta">
                  <span><Users size={14} /> {currentGame.players?.length || 0}</span>
                  <span><CalendarDays size={14} /> {formatDate(currentGame.date, language)}</span>
                </div>
              </div>
            )}

            {recentGames.length > 1 && (
              <div className="carousel-dots">
                {recentGames.map((game, index) => (
                  <button
                    key={game.id}
                    className={`dot ${currentCarouselIndex === index ? 'active' : ''}`}
                    onClick={() => setCarouselIndex(index)}
                    aria-label={`Go to game ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="home-card">
            <div className="card-headline">
              <h3 className="card-title"><CircleStar size={18} /> {t('home.highlights')}</h3>
            </div>
            <div className="highlights-list">
              {highlights.map((item) => (
                <button
                  key={item.id}
                  className="highlight-row"
                  onClick={() => setSelectedInsight(item)}
                  type="button"
                >
                  <span className="highlight-icon"><item.icon size={18} /></span>
                  <span className="highlight-title">{item.title}</span>
                  <span className="highlight-chevron">›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="home-card">
            <div className="card-headline">
              <h3 className="card-title"><History size={18} /> {t('home.history')}</h3>
            </div>

            <div className="history-summary-grid">
              <article className="summary-tile blue">
                <span className="summary-icon"><Trophy size={18} /> <small> {t('home.allGames')}</small></span>
                <strong>{userCompetitiveWins + userCoopWins}</strong>
                <small>{t('home.totalWins')}</small>
              </article>
              <article className="summary-tile purple">
                <span className="summary-icon"><Target size={18} /> <small> {t('home.mostPlayed')}</small></span>
                <strong>{mostPlayedGameData?.[0] || '—'}</strong>
                <small>
                  {formatTemplate('home.gamesCount', {
                    count: mostPlayedGameData?.[1] || 0,
                    gamesLabel: t((mostPlayedGameData?.[1] || 0) === 1 ? 'home.game' : 'home.games'),
                  })}
                </small>
              </article>
              <article className="summary-tile orange">
                <span className="summary-icon"><Flame size={18} /> <small> {t('home.competitiveGames')}</small></span>
                <strong>{competitiveStreak}</strong>
                <small>
                  {t((competitiveStreak || 0) === 1 ? 'home.consecutiveWin' : 'home.consecutiveWins')}
                </small>
              </article>
            </div>

            <div className="timeline">
              {recentGames.map((game) => {
                const isCoop = game.gameType === 'cooperative';
                return (
                  <div className="timeline-item" key={`timeline-${game.id}`}>
                    <span className="timeline-dot" />
                    <div className="timeline-body">
                      <p className="timeline-date">{formatDate(game.date, language)}</p>
                      <p className="timeline-game">{game.game}</p>
                      <p className="timeline-result">
                        {isCoop
                          ? game.coopResult === 'win'
                            ? t('home.groupVictory')
                            : t('home.groupDefeat')
                          : `${game.winner || '—'}`}
                      </p>
                    </div>
                  </div>
                );
              })}

              {recentGames.length === 0 && (
                <div className="empty-block">{t('home.history.empty')}</div>
              )}
            </div>
            <button className="go-history-btn" onClick={() => onNavigate('history')}>
              {t('home.history.viewAll')}
            </button>
          </section>
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className="bottom-nav-item active" onClick={() => onNavigate('home')}>
            <span><House size={18} /></span>
            <small>Home</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('stats')}>
            <span><BarChart3 size={18} /></span>
            <small>{t('home.stats')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('library')}>
            <span><BookOpen size={18} /></span>
            <small>{t('home.library')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('friends')}>
            <span><Users size={18} /></span>
            <small>{t('home.friends')}</small>
          </button>
          <button className="bottom-nav-item bottom-nav-item--profile" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{t('home.profile')}</small>
          </button>
          <button
            className="fab-new-game"
            onClick={() => onNavigate('newgame')}
            aria-label={t('home.newGame')}
          >
            +
          </button>
        </nav>

        {selectedInsight && (
          <div className="insight-modal-overlay" onClick={() => setSelectedInsight(null)}>
            <div className="insight-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="insight-modal-close"
                onClick={() => setSelectedInsight(null)}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <p className="insight-modal-title">
                <selectedInsight.icon size={18} /> {selectedInsight.title}
              </p>
              <p className="insight-modal-detail">{selectedInsight.detail}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
