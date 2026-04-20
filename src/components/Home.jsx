import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleStar,
  Dices,
  Flame,
  Hand,
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
}) => {
  const { t, isInitialized, language } = useLanguage();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedInsight, setSelectedInsight] = useState(null);

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
        title: language === 'pt-BR' ? `Você está invicto há ${competitiveStreak} partida${competitiveStreak === 1 ? '' : 's'}` : `You are unbeaten for ${competitiveStreak} game${competitiveStreak === 1 ? '' : 's'}`,
        detail:
          language === 'pt-BR'
            ? `A sequência foi calculada olhando as partidas competitivas mais recentes em ordem cronológica. Ela para na primeira partida em que você participou e não venceu.`
            : `The streak was computed from your most recent competitive games in chronological order and stops at the first one where you played but did not win.`,
      },
      {
        id: 'most-played',
        icon: Target,
        title:
          mostPlayedGameData
            ? language === 'pt-BR'
              ? `${mostPlayedGameData[0]} é seu jogo mais jogado`
              : `${mostPlayedGameData[0]} is your most played game`
            : language === 'pt-BR'
              ? 'Registre mais partidas para descobrir seu jogo favorito'
              : 'Register more matches to discover your favorite game',
        detail:
          mostPlayedGameData
            ? language === 'pt-BR'
              ? `Esse jogo apareceu em ${mostPlayedGameData[1]} partida${mostPlayedGameData[1] === 1 ? '' : 's'}, o maior volume do seu histórico até agora.`
              : `This game appears in ${mostPlayedGameData[1]} match${mostPlayedGameData[1] === 1 ? '' : 'es'}, currently the highest volume in your history.`
            : language === 'pt-BR'
              ? 'Ainda não há dados suficientes para comparar frequência entre jogos.'
              : 'There is not enough data yet to compare game frequency.',
      },
      {
        id: 'coop-rate',
        icon: Handshake,
        title:
          language === 'pt-BR'
            ? `${coopSuccessRate}% de sucesso em cooperativos`
            : `${coopSuccessRate}% co-op success rate`,
        detail:
          language === 'pt-BR'
            ? `Taxa obtida com ${cooperativeGames.length} partida${cooperativeGames.length === 1 ? '' : 's'} cooperativa${cooperativeGames.length === 1 ? '' : 's'} registradas.`
            : `Rate calculated from ${cooperativeGames.length} cooperative match${cooperativeGames.length === 1 ? '' : 'es'} in your records.`,
      },
      {
        id: 'wins-total',
        icon: Trophy,
        title:
          language === 'pt-BR'
            ? `${userCompetitiveWins + userCoopWins} vitórias totais no histórico`
            : `${userCompetitiveWins + userCoopWins} total wins recorded`,
        detail:
          language === 'pt-BR'
            ? `Somamos vitórias competitivas suas (${userCompetitiveWins}) e vitórias cooperativas das partidas em que você participou (${userCoopWins}).`
            : `This combines your competitive wins (${userCompetitiveWins}) and cooperative wins in games where you participated (${userCoopWins}).`,
      },
      {
        id: 'activity',
        icon: CalendarDays,
        title:
          language === 'pt-BR'
            ? `${gamesLast30Days} partidas nos últimos 30 dias`
            : `${gamesLast30Days} games in the last 30 days`,
        detail:
          language === 'pt-BR'
            ? 'Esse recorte mostra seu ritmo recente de partidas e ajuda a comparar atividade ao longo dos meses.'
            : 'This slice shows your recent playing pace and helps compare activity month over month.',
      },
      {
        id: 'opponent',
        icon: Swords,
        title:
          topOpponentData
            ? language === 'pt-BR'
              ? `${topOpponentData[0]} é seu rival mais frequente`
              : `${topOpponentData[0]} is your most frequent rival`
            : language === 'pt-BR'
              ? 'Sem rivalidades definidas ainda'
              : 'No rivalry pattern yet',
        detail:
          topOpponentData
            ? language === 'pt-BR'
              ? `Vocês se enfrentaram em ${topOpponentData[1]} partida${topOpponentData[1] === 1 ? '' : 's'} competitiva${topOpponentData[1] === 1 ? '' : 's'}.`
              : `You faced each other in ${topOpponentData[1]} competitive match${topOpponentData[1] === 1 ? '' : 'es'}.`
            : language === 'pt-BR'
              ? 'Registre partidas com mais jogadores para destravar esse insight.'
              : 'Register matches with more players to unlock this insight.',
      },
      {
        id: 'avg-players',
        icon: Users,
        title:
          language === 'pt-BR'
            ? `Média de ${totalPlayersAvg} jogadores por partida`
            : `Average of ${totalPlayersAvg} players per game`,
        detail:
          language === 'pt-BR'
            ? 'Esse indicador mostra o tamanho médio da sua mesa e ajuda a escolher jogos para seu perfil de grupo.'
            : 'This metric reflects your average table size and helps choose games for your usual group profile.',
      },
      {
        id: 'comp-winrate',
        icon: BarChart3,
        title:
          language === 'pt-BR'
            ? `${userCompetitiveWinRate}% de aproveitamento competitivo`
            : `${userCompetitiveWinRate}% competitive win rate`,
        detail:
          language === 'pt-BR'
            ? 'Aproveitamento considera apenas partidas competitivas em que você participou e quantas delas você venceu.'
            : 'Win rate considers only competitive games you played and how many of those you won.',
      },
    ];

    return pool;
  }, [
    competitiveStreak,
    cooperativeGames.length,
    coopSuccessRate,
    gamesLast30Days,
    language,
    mostPlayedGameData,
    topOpponentData,
    totalPlayersAvg,
    userCompetitiveWinRate,
    userCompetitiveWins,
    userCoopWins,
  ]);

  const highlights = useMemo(() => {
    return insightPool.slice(0, 3);
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

  const getGameResultLabel = (game) => {
    const isCoop = game.gameType === 'cooperative';
    if (isCoop) {
      if (game.coopResult === 'win') {
        return language === 'pt-BR' ? 'Vitória da equipe' : 'Team victory';
      }
      return language === 'pt-BR' ? 'Derrota da equipe' : 'Team defeat';
    }
    const winner = game.winner || '—';
    return language === 'pt-BR' ? `${winner} venceu` : `${winner} won`;
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
                <Hand size={18} className="waving-hand" />
              </h2>
              <p className="header-subtitle"><Flame size={16} /> {gamesLast30Days} {t('home.gamesLast30Days')}</p>
            </div>
            <SideMenu
              onExportCSV={exportToCSV}
              onExportJSON={exportToJSON}
              onImportJSON={importFromJSON}
              onClearData={clearAllData}
              auth={auth}
              syncStatus={syncStatus}
              compact
              openFrom="right"
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
              <div className="empty-block">{language === 'pt-BR' ? 'Registre sua primeira partida para ver o carrossel.' : 'Register your first game to see the carousel.'}</div>
            ) : (
              <div className="last-game-carousel-card">
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
                <span className="summary-icon"><Trophy size={18} /></span>
                <strong>{userCompetitiveWins + userCoopWins}</strong>
                <small>{language === 'pt-BR' ? 'Vitórias totais' : 'Total wins'}</small>
              </article>
              <article className="summary-tile purple">
                <span className="summary-icon"><Target size={18} /></span>
                <strong>{mostPlayedGameData?.[0] || '—'}</strong>
                <small>{language === 'pt-BR' ? `${mostPlayedGameData?.[1] || 0} partidas` : `${mostPlayedGameData?.[1] || 0} games`}</small>
              </article>
              <article className="summary-tile orange">
                <span className="summary-icon"><Flame size={18} /></span>
                <strong>{competitiveStreak}</strong>
                <small>{language === 'pt-BR' ? 'Vitórias seguidas' : 'Consecutive wins'}</small>
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
                            ? language === 'pt-BR' ? 'Vitória do grupo' : 'Group victory'
                            : language === 'pt-BR' ? 'Derrota do grupo' : 'Group defeat'
                          : `${game.winner || '—'}`}
                      </p>
                    </div>
                  </div>
                );
              })}

              {recentGames.length === 0 && (
                <div className="empty-block">{language === 'pt-BR' ? 'Sem partidas no histórico ainda.' : 'No games in history yet.'}</div>
              )}

              <button className="go-history-btn" onClick={() => onNavigate('history')}>
                {language === 'pt-BR' ? 'Ver histórico completo' : 'View full history'}
              </button>
            </div>
          </section>
        </main>

        <button
          className="fab-new-game"
          onClick={() => onNavigate('newgame')}
          aria-label={t('home.newGame')}
        >
          +
        </button>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className="bottom-nav-item active" onClick={() => onNavigate('home')}>
            <span><House size={18} /></span>
            <small>Home</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('stats')}>
            <span><BarChart3 size={18} /></span>
            <small>{language === 'pt-BR' ? 'Estatísticas' : 'Stats'}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('library')}>
            <span><BookOpen size={18} /></span>
            <small>{language === 'pt-BR' ? 'Biblioteca' : 'Library'}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{language === 'pt-BR' ? 'Perfil' : 'Profile'}</small>
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
