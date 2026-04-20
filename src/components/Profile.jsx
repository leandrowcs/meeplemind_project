import { useMemo } from 'react';
import {
  BarChart3,
  Flame,
  Gamepad2,
  Handshake,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from './Button';
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

export const Profile = ({ onNavigate, games, primaryPlayer, getPlayerStats, library = [] }) => {
  const { language, t } = useLanguage();

  const playerStats = getPlayerStats(primaryPlayer);

  // Randomly pick 3 insights on each page mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayedInsights = useMemo(() => {
    const pg = games.filter((g) => g.players?.includes(primaryPlayer));
    const stats = getPlayerStats(primaryPlayer);
    const pool = [];

    // --- Insight 1: Competitive vs Cooperative performance ---
    if (stats.competitiveGames > 0 && stats.cooperativeGames > 0) {
      const diff = stats.competitiveWinRate - stats.cooperativeWinRate;
      if (diff > 15) pool.push(`Você se sai melhor em competitivos (${stats.competitiveWinRate}%) do que em cooperativos (${stats.cooperativeWinRate}%)`);
      else if (diff < -15) pool.push(`Você brilha mais em cooperativos (${stats.cooperativeWinRate}% de sucesso) do que em competitivos (${stats.competitiveWinRate}%)`);
      else if (stats.competitiveWinRate >= 55 && stats.cooperativeWinRate >= 55) pool.push(`Excelente desempenho nos dois modos! ${stats.competitiveWinRate}% em competitivos e ${stats.cooperativeWinRate}% em cooperativos`);
      else pool.push(`Desempenho equilibrado: ${stats.competitiveWinRate}% em competitivos e ${stats.cooperativeWinRate}% em cooperativos`);
    } else if (stats.competitiveGames > 0) {
      if (stats.competitiveWinRate >= 60) pool.push(`Ótima taxa de vitória em competitivos: ${stats.competitiveWinRate}%!`);
      else if (stats.competitiveWinRate >= 40) pool.push(`Taxa de vitória competitiva de ${stats.competitiveWinRate}% - bom ritmo!`);
      else pool.push(`Taxa de vitória competitiva: ${stats.competitiveWinRate}% - cada partida é aprendizado!`);
    } else if (stats.cooperativeGames > 0) {
      if (stats.cooperativeWinRate >= 60) pool.push(`Seu grupo é forte em cooperativos: ${stats.cooperativeWinRate}% de sucesso!`);
      else pool.push(`Taxa de sucesso em cooperativos: ${stats.cooperativeWinRate}%`);
    }

    // --- Insight 2: Most played game ---
    const gameCount = {};
    pg.forEach((g) => { if (g.game) gameCount[g.game] = (gameCount[g.game] || 0) + 1; });
    const mostPlayed = Object.entries(gameCount).sort(([, a], [, b]) => b - a)[0];
    if (mostPlayed) {
      pool.push(`Você joga mais ${mostPlayed[0]} (${mostPlayed[1]} partida${mostPlayed[1] !== 1 ? 's' : ''})`);
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
      pool.push(`Sua categoria favorita é ${label} (${favCat[1]} partida${favCat[1] !== 1 ? 's' : ''})`);
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
      pool.push(`Seu parceiro mais frequente é ${bestPartner[0]} (${bestPartner[1]} partidas juntos)`);
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
      if (diff >= 15) pool.push(`Em forma! Aproveitamento recente ${recentRate}% está acima da sua média (${stats.competitiveWinRate}%)`);
      else if (diff <= -15) pool.push(`Aproveitamento recente ${recentRate}% abaixo da sua média (${stats.competitiveWinRate}%) - hora de reagir!`);
      else if (recentRate >= 60) pool.push(`Sequência quente! ${recentWins} vitórias nas últimas ${recentComp.length} partidas competitivas`);
      else pool.push(`${recentWins} vitórias nas últimas ${recentComp.length} partidas competitivas`);
    }

    // Fisher-Yates shuffle and pick 3
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }, []); // [] is intentional: pick once per mount for random variety

  return (
    <>
      <div className="profile-container fade-in">
        <header className="profile-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('profile.title')}</h1>
        </header>

        <div className="profile-content">
          {/* Player Name Banner */}
          <div className="player-banner">
            <h2>{primaryPlayer}</h2>
            <p className="player-banner-stats">
              <Gamepad2 size={14} /> {playerStats.totalGames} {playerStats.totalGames === 1 ? t('home.game') : t('home.games')} • <Trophy size={14} /> {playerStats.competitiveWins} {playerStats.competitiveWins === 1 ? t('profile.bannerCompWin') : t('profile.bannerCompWins')}
            </p>
          </div>

          {/* Insights Card */}
          {displayedInsights.length > 0 && (
            <div className="insights-card">
              <div className="insights-header">
                <span className="insights-icon"><Flame size={18} /></span>
                <h3>Insights</h3>
              </div>
              <ul className="insights-list">
                {displayedInsights.map((insight, i) => (
                  <li key={i} className="insight-item">{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Stats Cards Grid */}
          <div className="stats-cards-grid">
            {/* Competitive Games Card */}
            <div className="stat-card-large competitive-card">
              <div className="card-header">
                <span className="card-icon"><Swords size={18} /></span>
                <h3>{t('profile.competitiveGames')}</h3>
              </div>
              <div className="card-stats">
                <div className="big-stat">
                  <div className="stat-item">
                    <span className="stat-icon"><Trophy size={16} /></span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.competitiveWins}</span>
                      <span className="stat-label">{t('stats.victories')}</span>
                    </div>
                  </div>
                  <div className="stat-divider">|</div>
                  <div className="stat-item">
                    <span className="stat-icon"><BarChart3 size={16} /></span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.competitiveWinRate}%</span>
                      <span className="stat-label">{t('stats.winRateLabel')}</span>
                    </div>
                  </div>
                  {playerStats.bestGame && (
                    <>
                      <div className="stat-divider">|</div>
                      <div className="stat-item">
                        <span className="stat-icon"><Target size={16} /></span>
                        <div className="stat-group">
                          <span className="stat-number stat-number-sm">{playerStats.bestGame}</span>
                          <span className="stat-label">({playerStats.bestGameWins} {playerStats.bestGameWins === 1 ? t('stats.victory') : t('stats.victories')})</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${playerStats.competitiveWinRate}%` }}
                    />
                  </div>
                  <span className="progress-label">
                    {t('profile.gamesRecord')} {playerStats.competitiveWins}/{playerStats.competitiveGames}
                  </span>
                </div>
              </div>
            </div>

            {/* Cooperative Games Card */}
            <div className="stat-card-large cooperative-card">
              <div className="card-header">
                <span className="card-icon"><Handshake size={18} /></span>
                <h3>{t('profile.cooperativeGames')}</h3>
              </div>
              <div className="card-stats">
                <div className="big-stat">
                  <div className="stat-item">
                    <span className="stat-icon"><Trophy size={16} /></span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.cooperativeWins}</span>
                      <span className="stat-label">{t('stats.victories')}</span>
                    </div>
                  </div>
                  <div className="stat-divider">|</div>
                  <div className="stat-item">
                    <span className="stat-icon"><Flame size={16} /></span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.cooperativeWinRate}%</span>
                      <span className="stat-label">{t('profile.successRate')}</span>
                    </div>
                  </div>
                  {playerStats.favoriteCoopTeam?.length > 0 && (
                    <>
                      <div className="stat-divider">|</div>
                      <div className="stat-item stat-item-team">
                        <span className="stat-icon"><Users size={16} /></span>
                        <div className="stat-group">
                          <span className="stat-label stat-label-title">{t('profile.favTeam')}</span>
                          <span className="stat-team-names">
                            {playerStats.favoriteCoopTeam.join(' • ')}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill cooperative"
                      style={{ width: `${playerStats.cooperativeWinRate}%` }}
                    />
                  </div>
                  <span className="progress-label">
                    {t('profile.gamesRecord')} {playerStats.cooperativeWins}/{playerStats.cooperativeGames}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <Button variant="primary" onClick={() => onNavigate('stats')}>
              {t('stats.title')}
            </Button>
            <Button variant="primary" onClick={() => onNavigate('history')}>
              {t('history.title')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
