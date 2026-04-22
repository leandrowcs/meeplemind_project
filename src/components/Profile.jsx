import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Brain,
  BookOpen,
  ChevronRight,
  Dices,
  Flame,
  Gamepad2,
  HandFist,
  Handshake,
  House,
  ShelvingUnit,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { useLanguage } from '../hooks/useLanguage';
import './Profile.css';

const CATEGORY_LABELS = {
  strategy: 'Estratégia',
  cooperative: 'Cooperativo',
  family: 'Família',
  party: 'Party',
  rpg: 'RPG',
  'deck-building': 'Deck Building',
  'worker-placement': 'Worker Placement',
  abstract: 'Abstrato',
  euro: 'Euro',
};

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const pickRandomItems = (items, limit = 3) => {
  const randomized = Array.isArray(items) ? [...items] : [];

  for (let i = randomized.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
  }

  return randomized.slice(0, limit);
};

export const Profile = ({
  onNavigate,
  games,
  primaryPlayer,
  displayPlayerName,
  googlePhotoUrl,
  getPlayerStats,
  library = [],
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
  auth,
  syncStatus,
}) => {
  const { language, t } = useLanguage();
  const tr = useCallback((pt, en, fr) => {
    if (language === 'fr-CA') return fr;
    if (language === 'en-US') return en;
    return pt;
  }, [language]);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [avatarState, setAvatarState] = useState(() => {
    try {
      return {
        owner: primaryPlayer,
        dataUrl: localStorage.getItem(`meeplemind_profile_avatar_${primaryPlayer}`) || '',
      };
    } catch {
      return {
        owner: primaryPlayer,
        dataUrl: '',
      };
    }
  });
  const fileInputRef = useRef(null);

  const savedAvatarDataUrl = useMemo(() => {
    try {
      return localStorage.getItem(`meeplemind_profile_avatar_${primaryPlayer}`) || '';
    } catch {
      return '';
    }
  }, [primaryPlayer]);

  const playerStats = useMemo(() => getPlayerStats(primaryPlayer), [getPlayerStats, primaryPlayer]);

  const localAvatar = avatarState.owner === primaryPlayer ? avatarState.dataUrl : savedAvatarDataUrl;
  const avatarSrc = localAvatar || googlePhotoUrl || '/user_icon.png';

  const allPlayerGames = useMemo(
    () => games.filter((g) => (g.players || []).includes(primaryPlayer)),
    [games, primaryPlayer]
  );

  const competitiveGames = useMemo(
    () => allPlayerGames.filter((g) => (g.gameType || 'competitive') === 'competitive'),
    [allPlayerGames]
  );

  const totalWins = useMemo(() => {
    const competitiveWins = competitiveGames.filter((g) => g.winner === primaryPlayer).length;
    const cooperativeWins = allPlayerGames.filter((g) => g.gameType === 'cooperative' && g.coopResult === 'win').length;
    return competitiveWins + cooperativeWins;
  }, [allPlayerGames, competitiveGames, primaryPlayer]);

  const competitiveSummary = useMemo(() => {
    const wins = competitiveGames.filter((g) => g.winner === primaryPlayer).length;
    const gamesCount = competitiveGames.length;
    const winRate = gamesCount > 0 ? Math.round((wins / gamesCount) * 100) : 0;

    const byGame = {};
    competitiveGames.forEach((g) => {
      if (!g.game) return;
      if (!byGame[g.game]) {
        byGame[g.game] = { plays: 0, wins: 0 };
      }
      byGame[g.game].plays += 1;
      if (g.winner === primaryPlayer) {
        byGame[g.game].wins += 1;
      }
    });

    const bestGameEntry = Object.entries(byGame)
      .map(([name, data]) => ({
        name,
        plays: data.plays,
        wins: data.wins,
        rate: data.plays > 0 ? Math.round((data.wins / data.plays) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.rate - a.rate;
      })[0] || null;

    return {
      wins,
      gamesCount,
      winRate,
      bestGame: bestGameEntry,
    };
  }, [competitiveGames, primaryPlayer]);

  const rivalSummary = useMemo(() => {
    const opponents = {};

    competitiveGames.forEach((game) => {
      (game.players || []).forEach((player) => {
        if (player === primaryPlayer) return;
        opponents[player] = (opponents[player] || 0) + 1;
      });
    });

    const topRival = Object.entries(opponents).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    if (!topRival) return null;

    const rivalGames = competitiveGames.filter((g) => (g.players || []).includes(topRival));
    const myWins = rivalGames.filter((g) => g.winner === primaryPlayer).length;
    const winRate = rivalGames.length > 0 ? Math.round((myWins / rivalGames.length) * 100) : 0;

    const gameCount = {};
    rivalGames.forEach((g) => {
      if (!g.game) return;
      gameCount[g.game] = (gameCount[g.game] || 0) + 1;
    });
    const topGameEntry = Object.entries(gameCount).sort(([, a], [, b]) => b - a)[0] || null;

    return {
      name: topRival,
      games: rivalGames.length,
      myWins,
      winRate,
      topGame: topGameEntry ? { name: topGameEntry[0], plays: topGameEntry[1] } : null,
    };
  }, [competitiveGames, primaryPlayer]);

  const librarySummary = useMemo(() => {
    const recent = [...library]
      .sort((a, b) => new Date(b.addedAt || b.updatedAt || 0) - new Date(a.addedAt || a.updatedAt || 0))
      .slice(0, 3);

    return {
      total: library.length,
      recent,
    };
  }, [library]);

  const onAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      alert(
        tr(
          'Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.',
          'Unsupported image format. Please use JPG, PNG, WEBP, or GIF.',
          'Format d\'image non pris en charge. Utilisez JPG, PNG, WEBP ou GIF.'
        )
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      alert(
        tr(
          'Imagem muito grande. O limite é de 2 MB.',
          'Image is too large. The limit is 2 MB.',
          'Image trop volumineuse. La limite est de 2 Mo.'
        )
      );
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      setAvatarState({ owner: primaryPlayer, dataUrl: value });
      try {
        localStorage.setItem(`meeplemind_profile_avatar_${primaryPlayer}`, value);
      } catch {
        // no-op
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const displayedInsights = useMemo(() => {
    const pg = games.filter((g) => g.players?.includes(primaryPlayer));
    const stats = getPlayerStats(primaryPlayer);
    const pool = [];

    // --- Insight 1: Competitive vs Cooperative performance ---
    if (stats.competitiveGames > 0 && stats.cooperativeGames > 0) {
      const diff = stats.competitiveWinRate - stats.cooperativeWinRate;
      if (diff > 15) {
        pool.push({
          id: 'comp-better',
          icon: Swords,
          title: tr(
            'Você vence mais em jogos competitivos',
            'You perform better in competitive games',
            'Vous performez mieux en jeux compétitifs'
          ),
          detail: tr(
            `Seu desempenho está melhor no competitivo (${stats.competitiveWinRate}%) do que no cooperativo (${stats.cooperativeWinRate}%).`,
            `Your competitive performance (${stats.competitiveWinRate}%) is better than your cooperative one (${stats.cooperativeWinRate}%).`,
            `Votre performance en compétitif (${stats.competitiveWinRate}%) est meilleure qu'en coopératif (${stats.cooperativeWinRate}%).`
          ),
        });
      } else if (diff < -15) {
        pool.push({
          id: 'coop-better',
          icon: Handshake,
          title: tr(
            'Seu grupo tem alta taxa de sucesso em cooperativos',
            'Your group has a high co-op success rate',
            'Votre groupe a un excellent taux de réussite en coop'
          ),
          detail: tr(
            `Aproveitamento cooperativo de ${stats.cooperativeWinRate}% contra ${stats.competitiveWinRate}% no competitivo.`,
            `Co-op success is ${stats.cooperativeWinRate}% versus ${stats.competitiveWinRate}% in competitive play.`,
            `Le succès coopératif est de ${stats.cooperativeWinRate}% contre ${stats.competitiveWinRate}% en compétitif.`
          ),
        });
      } else if (stats.competitiveWinRate >= 55 && stats.cooperativeWinRate >= 55) {
        pool.push({
          id: 'balanced-high',
          icon: Trophy,
          title: tr(
            'Você mantém ótimo desempenho nos dois modos',
            'You keep strong performance in both modes',
            'Vous maintenez une excellente performance dans les deux modes'
          ),
          detail: tr(
            `Competitivo em ${stats.competitiveWinRate}% e cooperativo em ${stats.cooperativeWinRate}%.`,
            `Competitive at ${stats.competitiveWinRate}% and cooperative at ${stats.cooperativeWinRate}%.`,
            `Compétitif à ${stats.competitiveWinRate}% et coopératif à ${stats.cooperativeWinRate}%.`
          ),
        });
      } else {
        pool.push({
          id: 'balanced',
          icon: BarChart3,
          title: tr(
            'Seu desempenho está equilibrado entre os modos',
            'Your performance is balanced across modes',
            'Votre performance est équilibrée entre les modes'
          ),
          detail: tr(
            `Competitivo em ${stats.competitiveWinRate}% e cooperativo em ${stats.cooperativeWinRate}%.`,
            `Competitive at ${stats.competitiveWinRate}% and cooperative at ${stats.cooperativeWinRate}%.`,
            `Compétitif à ${stats.competitiveWinRate}% et coopératif à ${stats.cooperativeWinRate}%.`
          ),
        });
      }
    } else if (stats.competitiveGames > 0) {
      pool.push({
        id: 'only-comp',
        icon: Swords,
        title: tr(
          `Taxa de vitória competitiva: ${stats.competitiveWinRate}%`,
          `Competitive win rate: ${stats.competitiveWinRate}%`,
          `Taux de victoire compétitif : ${stats.competitiveWinRate}%`
        ),
        detail: tr(
          `Com base em ${stats.competitiveGames} partida${stats.competitiveGames === 1 ? '' : 's'} competitiva${stats.competitiveGames === 1 ? '' : 's'}.`,
          `Based on ${stats.competitiveGames} competitive game${stats.competitiveGames === 1 ? '' : 's'}.`,
          `Basé sur ${stats.competitiveGames} partie${stats.competitiveGames === 1 ? '' : 's'} compétitive${stats.competitiveGames === 1 ? '' : 's'}.`
        ),
      });
    } else if (stats.cooperativeGames > 0) {
      pool.push({
        id: 'only-coop',
        icon: Handshake,
        title: tr(
          `Taxa de sucesso cooperativa: ${stats.cooperativeWinRate}%`,
          `Co-op success rate: ${stats.cooperativeWinRate}%`,
          `Taux de succès coopératif : ${stats.cooperativeWinRate}%`
        ),
        detail: tr(
          `Com base em ${stats.cooperativeGames} partida${stats.cooperativeGames === 1 ? '' : 's'} cooperativa${stats.cooperativeGames === 1 ? '' : 's'}.`,
          `Based on ${stats.cooperativeGames} cooperative game${stats.cooperativeGames === 1 ? '' : 's'}.`,
          `Basé sur ${stats.cooperativeGames} partie${stats.cooperativeGames === 1 ? '' : 's'} coopérative${stats.cooperativeGames === 1 ? '' : 's'}.`
        ),
      });
    }

    // --- Insight 2: Most played game ---
    const gameCount = {};
    pg.forEach((g) => { if (g.game) gameCount[g.game] = (gameCount[g.game] || 0) + 1; });
    const mostPlayed = Object.entries(gameCount).sort(([, a], [, b]) => b - a)[0];
    if (mostPlayed) {
      pool.push({
        id: 'most-played',
        icon: Gamepad2,
        title: tr(
          `Você joga mais ${mostPlayed[0]}`,
          `You play ${mostPlayed[0]} the most`,
          `Vous jouez surtout à ${mostPlayed[0]}`
        ),
        detail: tr(
          `${mostPlayed[1]} partida${mostPlayed[1] !== 1 ? 's' : ''} registradas para esse jogo.`,
          `${mostPlayed[1]} game${mostPlayed[1] !== 1 ? 's' : ''} recorded for this title.`,
          `${mostPlayed[1]} partie${mostPlayed[1] !== 1 ? 's' : ''} enregistrée${mostPlayed[1] !== 1 ? 's' : ''} pour ce jeu.`
        ),
      });
    }

    // --- Insight 3: Favorite category (cross-ref with library) ---
    const libMap = {};
    library.forEach((e) => { if (e.name) libMap[e.name.toLowerCase()] = e; });
    const catCount = {};
    pg.forEach((g) => {
      const entry = g.game ? libMap[g.game.toLowerCase()] : null;
      if (entry?.category && entry.category !== 'other' && CATEGORY_LABELS[entry.category]) {
        catCount[entry.category] = (catCount[entry.category] || 0) + 1;
      }
    });
    const favCat = Object.entries(catCount).sort(([, a], [, b]) => b - a)[0];
    if (favCat) {
      const label = CATEGORY_LABELS[favCat[0]];
      pool.push({
        id: 'favorite-category',
        icon: Target,
        title: tr(
          `Sua categoria favorita é ${label}`,
          `Your favorite category is ${label}`,
          `Votre catégorie favorite est ${label}`
        ),
        detail: tr(
          `${favCat[1]} partida${favCat[1] !== 1 ? 's' : ''} nessa categoria.`,
          `${favCat[1]} game${favCat[1] !== 1 ? 's' : ''} in this category.`,
          `${favCat[1]} partie${favCat[1] !== 1 ? 's' : ''} dans cette catégorie.`
        ),
      });
    }

    // --- Insight 4: Best playing partner ---
    const partnerCount = {};
    pg.forEach((g) => {
      (g.players || []).forEach((p) => {
        if (p !== primaryPlayer) partnerCount[p] = (partnerCount[p] || 0) + 1;
      });
    });
    const bestPartner = Object.entries(partnerCount).sort(([, a], [, b]) => b - a)[0];
    if (bestPartner && bestPartner[1] >= 2) {
      pool.push({
        id: 'best-partner',
        icon: Handshake,
        title: tr(
          `${bestPartner[0]} é seu parceiro mais frequente`,
          `${bestPartner[0]} is your most frequent partner`,
          `${bestPartner[0]} est votre partenaire le plus fréquent`
        ),
        detail: tr(
          `${bestPartner[1]} partidas juntos até agora.`,
          `${bestPartner[1]} games together so far.`,
          `${bestPartner[1]} parties jouées ensemble jusqu'à présent.`
        ),
      });
    }

    // --- Insight 5: Recent form (last 10 competitive games vs overall) ---
    const recentComp = pg
      .filter((g) => (g.gameType || 'competitive') === 'competitive')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    if (recentComp.length >= 5 && stats.competitiveGames > recentComp.length) {
      const recentWins = recentComp.filter((g) => g.winner === primaryPlayer).length;
      const recentRate = Math.round((recentWins / recentComp.length) * 100);
      const diff = recentRate - stats.competitiveWinRate;
      if (diff >= 15) {
        pool.push({
          id: 'recent-above',
          icon: Flame,
          title: tr(
            'Você está em grande fase no competitivo',
            'You are in great competitive form',
            'Vous êtes en grande forme en compétitif'
          ),
          detail: tr(
            `${recentRate}% nas últimas ${recentComp.length} partidas, acima da média (${stats.competitiveWinRate}%).`,
            `${recentRate}% in the last ${recentComp.length} games, above your average (${stats.competitiveWinRate}%).`,
            `${recentRate}% sur les ${recentComp.length} dernières parties, au-dessus de votre moyenne (${stats.competitiveWinRate}%).`
          ),
        });
      } else if (diff <= -15) {
        pool.push({
          id: 'recent-below',
          icon: ShieldAlert,
          title: tr(
            'Seu ritmo recente caiu no competitivo',
            'Your recent competitive pace has dropped',
            'Votre rythme récent a baissé en compétitif'
          ),
          detail: tr(
            `${recentRate}% nas últimas ${recentComp.length} partidas, abaixo da média (${stats.competitiveWinRate}%).`,
            `${recentRate}% in the last ${recentComp.length} games, below your average (${stats.competitiveWinRate}%).`,
            `${recentRate}% sur les ${recentComp.length} dernières parties, sous votre moyenne (${stats.competitiveWinRate}%).`
          ),
        });
      } else if (recentRate >= 60) {
        pool.push({
          id: 'recent-hot',
          icon: Sparkles,
          title: tr(
            'Você vem em sequência forte',
            'You are on a strong run',
            'Vous êtes sur une belle série'
          ),
          detail: tr(
            `${recentWins} vitórias nas últimas ${recentComp.length} partidas competitivas.`,
            `${recentWins} wins in your last ${recentComp.length} competitive games.`,
            `${recentWins} victoires sur vos ${recentComp.length} dernières parties compétitives.`
          ),
        });
      } else {
        pool.push({
          id: 'recent-neutral',
          icon: BarChart3,
          title: tr(
            'Seu recorte recente está estável',
            'Your recent performance is stable',
            'Votre performance récente est stable'
          ),
          detail: tr(
            `${recentWins} vitórias nas últimas ${recentComp.length} partidas competitivas.`,
            `${recentWins} wins in your last ${recentComp.length} competitive games.`,
            `${recentWins} victoires sur vos ${recentComp.length} dernières parties compétitives.`
          ),
        });
      }
    }

    return pickRandomItems(pool, 3);
  }, [games, getPlayerStats, library, primaryPlayer, tr]);

  return (
    <>
      <div className="profile-container fade-in">
        <header className="profile-header-modern">
          <div className="profile-header-top-row">
            <h2 className="profile-header-page-title"></h2>
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
            />
          </div>
          <div className="profile-avatar-block">
            <div className="profile-avatar-wrap">
              <img src={avatarSrc} alt={displayPlayerName || primaryPlayer} className="profile-avatar" referrerPolicy="no-referrer" />
              <button
                className="profile-avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="profile-avatar-input"
                onChange={onAvatarUpload}
              />
            </div>
            <h1 className="profile-player-name">{displayPlayerName || primaryPlayer}</h1>
          </div>
        </header>

        <div className="profile-content">
          <section className="profile-top-stats" aria-label="Resumo geral">
            <article className="profile-small-stat-card">
              <span className="profile-small-stat-icon"><Dices size={18} /></span>
              <span className="profile-small-stat-number">{playerStats.totalGames}</span>
              <span className="profile-small-stat-label">{t('profile.matches')}</span>
            </article>
            <article className="profile-small-stat-card">
              <span className="profile-small-stat-icon"><Trophy size={18} /></span>
              <span className="profile-small-stat-number">{totalWins}</span>
              <span className="profile-small-stat-label">{t('stats.victories')}</span>
            </article>
          </section>

          <section className="profile-main-card">
            <div className="profile-card-header">
              <h3 className="profile-card-title">{t('stats.competitive')}</h3>
            </div>

            <div className="profile-competitive-row">
              <span className="profile-competitive-left"><Trophy size={16} /> {competitiveSummary.wins} {t('stats.victories')}</span>
              <span className="profile-competitive-right">
                {competitiveSummary.gamesCount > 0
                  ? `${competitiveSummary.winRate}%`
                  : '0%'}
              </span>
            </div>

            <div className="profile-progress-track" aria-hidden>
              <span className="profile-progress-fill" style={{ width: `${competitiveSummary.winRate}%` }} />
            </div>
            <p className="profile-subtle-text">{competitiveSummary.wins}/{competitiveSummary.gamesCount} {t('profile.matches')}</p>

            <div className="profile-competitive-best-game">
              <span className="profile-competitive-left"><Target size={16} /> {t('profile.bestGame')}</span>
              {competitiveSummary.bestGame ? (
                <span className="profile-competitive-right">
                  {competitiveSummary.bestGame.name} • {competitiveSummary.bestGame.wins} {t('profile.shortWins')} • {competitiveSummary.bestGame.rate}%
                </span>
              ) : (
                <span className="profile-competitive-right">{t('stats.noData')}</span>
              )}
            </div>

            <div className="profile-actions">
              <Button variant="primary" onClick={() => onNavigate('history')}>
                {t('history.title')}
              </Button>
            </div>
          </section>

          {displayedInsights.length > 0 && (
            <section className="profile-main-card">
              <div className="profile-card-header">
                <h3 className="profile-card-title-with-icon"><Brain size={18} /> {t('profile.insights')}</h3>
              </div>

              <div className="highlights-list profile-highlights-list">
                {displayedInsights.map((insight) => (
                  <button
                    key={insight.id}
                    className="highlight-row"
                    onClick={() => setSelectedInsight(insight)}
                    type="button"
                  >
                    <span className="highlight-icon"><insight.icon size={18} /></span>
                    <span className="highlight-title">{insight.title}</span>
                    <span className="highlight-chevron"><ChevronRight size={16} /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="profile-main-card">
            <div className="profile-card-header">
              <h3 className="profile-card-title-with-icon"><HandFist size={18} /> {t('stats.rivalMajor')}</h3>
            </div>
            {rivalSummary ? (
              <>
                <p className="profile-rival-name">{rivalSummary.name}</p>
                <div className="profile-rival-grid">
                  <p><span>{t('profile.matches')}</span><strong>{rivalSummary.games}</strong></p>
                  <p className="profile-rival-grid-wins"><span>{t('stats.victories')}</span><strong>{rivalSummary.myWins}</strong></p>
                  <p className="profile-rival-grid-losses"><span>{t('stats.defeats')}</span><strong>{Math.max(rivalSummary.games - rivalSummary.myWins, 0)}</strong></p>
                  <p><span>{t('stats.winRateLabel')}</span><strong>{rivalSummary.winRate}%</strong></p>
                </div>
                <p className="profile-subtle-text">
                  {t('profile.mostPlayedGameLabel')}: {rivalSummary.topGame ? `${rivalSummary.topGame.name} (${rivalSummary.topGame.plays})` : '—'}
                </p>
              </>
            ) : (
              <p className="profile-subtle-text">{t('profile.noRivalData')}</p>
            )}
          </section>

          <section className="profile-main-card">
            <div className="profile-card-header">
              <h3 className="profile-card-title-with-icon"><ShelvingUnit size={18} /> {t('profile.myShelf')}</h3>
            </div>

            <p className="profile-subtle-text">{librarySummary.total} {librarySummary.total === 1 ? t('profile.game') : t('profile.games')} {t('profile.inLibrary')}</p>

            <div className="profile-library-list">
              {librarySummary.recent.length > 0 ? (
                librarySummary.recent.map((entry) => (
                  <div className="profile-library-item" key={entry.id || entry.name}>
                    <Gamepad2 size={14} />
                    <span>{entry.name}</span>
                  </div>
                ))
              ) : (
                <p className="profile-subtle-text">{t('profile.noGamesAdded')}</p>
              )}
            </div>

            <Button variant="primary" onClick={() => onNavigate('library')}>
              {t('profile.viewAllGames')}
            </Button>
          </section>
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
          <button className="bottom-nav-item active" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{t('home.profile')}</small>
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
