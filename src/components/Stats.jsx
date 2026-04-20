import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Crown,
  Gamepad2,
  Medal,
  PieChart,
  Skull,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Button } from './Button';
import { useLanguage } from '../hooks/useLanguage';
import { PlayerStatsModal } from './PlayerStatsModal';
import './Stats.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  'rgba(30, 64, 175, 0.8)',
  'rgba(234, 88, 12, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(6, 182, 212, 0.8)',
  'rgba(132, 204, 22, 0.8)',
  'rgba(251, 146, 60, 0.8)',
  'rgba(99, 102, 241, 0.8)',
];

const BAR_OPTIONS = (max) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x}` } } },
  scales: {
    x: {
      beginAtZero: true,
      max,
      ticks: { color: '#94a3b8', stepSize: 1, precision: 0 },
      grid: { color: 'rgba(148,163,184,0.1)' },
    },
    y: { ticks: { color: '#e2e8f0', font: { size: 12 } }, grid: { display: false } },
  },
});

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { color: '#e2e8f0', font: { size: 11 }, boxWidth: 14, padding: 10 } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} partida${ctx.parsed !== 1 ? 's' : ''}` } },
  },
};

export const Stats = ({ onNavigate, games, stats, primaryPlayer }) => {
  const { t } = useLanguage();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('competitive');

  // ── Competitive stats ─────────────────────────────────────────────────────
  const competitiveStats = useMemo(() => {
    if (!games?.length) return { wins: {}, appearances: {} };
    const cg = games.filter((g) => (g.gameType || 'competitive') === 'competitive');
    const wins = {}, appearances = {};
    cg.forEach((g) => {
      if (g.winner) wins[g.winner] = (wins[g.winner] || 0) + 1;
      (g.players || []).forEach((p) => { appearances[p] = (appearances[p] || 0) + 1; });
    });
    return { wins, appearances };
  }, [games]);

  const cooperativeStats = useMemo(() => {
    if (!games?.length) return { wins: 0, losses: 0, successRate: 0, total: 0 };
    const cg = games.filter((g) => g.gameType === 'cooperative');
    const wins = cg.filter((g) => g.coopResult === 'win').length;
    const losses = cg.filter((g) => g.coopResult === 'loss').length;
    return { wins, losses, successRate: cg.length > 0 ? Math.round((wins / cg.length) * 100) : 0, total: cg.length };
  }, [games]);

  const competitiveGameFreq = useMemo(() => {
    if (!games?.length) return [];
    const freq = {};
    games.filter((g) => (g.gameType || 'competitive') === 'competitive')
      .forEach((g) => { if (g.game) freq[g.game] = (freq[g.game] || 0) + 1; });
    return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [games]);

  const cooperativeGameFreq = useMemo(() => {
    if (!games?.length) return [];
    const freq = {};
    games.filter((g) => g.gameType === 'cooperative')
      .forEach((g) => { if (g.game) freq[g.game] = (freq[g.game] || 0) + 1; });
    return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [games]);

  const competitiveWins = useMemo(() =>
    Object.entries(competitiveStats.wins).sort(([, a], [, b]) => b - a).slice(0, 10),
    [competitiveStats]);

  const competitivePlayerStats = useMemo(() =>
    Object.entries(competitiveStats.appearances)
      .map(([player, appearances]) => ({
        player, appearances,
        wins: competitiveStats.wins[player] || 0,
        winRate: Math.round(((competitiveStats.wins[player] || 0) / appearances) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10),
    [competitiveStats]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const winsBarData = useMemo(() => ({
    labels: competitiveWins.map(([p]) => p),
    datasets: [{
      data: competitiveWins.map(([, v]) => v),
      backgroundColor: CHART_COLORS.slice(0, competitiveWins.length),
      borderRadius: 6,
    }],
  }), [competitiveWins]);

  const winRateBarData = useMemo(() => ({
    labels: competitivePlayerStats.map((p) => p.player),
    datasets: [{
      label: '%',
      data: competitivePlayerStats.map((p) => p.winRate),
      backgroundColor: CHART_COLORS.slice(0, competitivePlayerStats.length),
      borderRadius: 6,
    }],
  }), [competitivePlayerStats]);

  const gamesDoughnutData = useMemo(() => ({
    labels: competitiveGameFreq.map(([g]) => g),
    datasets: [{
      data: competitiveGameFreq.map(([, v]) => v),
      backgroundColor: CHART_COLORS.slice(0, competitiveGameFreq.length),
      borderWidth: 2,
      borderColor: '#0f172a',
    }],
  }), [competitiveGameFreq]);

  const coopDoughnutData = useMemo(() => ({
    labels: cooperativeGameFreq.map(([g]) => g),
    datasets: [{
      data: cooperativeGameFreq.map(([, v]) => v),
      backgroundColor: CHART_COLORS.slice(0, cooperativeGameFreq.length),
      borderWidth: 2,
      borderColor: '#0f172a',
    }],
  }), [cooperativeGameFreq]);

  // ── Rivalry data ───────────────────────────────────────────────────────────
  const rivalryData = useMemo(() => {
    if (!primaryPlayer || !games?.length) return null;

    const compGames = games.filter((g) =>
      (g.gameType || 'competitive') === 'competitive' &&
      (g.players || []).includes(primaryPlayer)
    );

    if (compGames.length === 0) return null;

    // Count encounters, wins by me, wins by opponent
    const opponents = {};
    compGames.forEach((g) => {
      (g.players || []).forEach((p) => {
        if (p === primaryPlayer) return;
        if (!opponents[p]) opponents[p] = { games: 0, myWins: 0, theirWins: 0 };
        opponents[p].games += 1;
        if (g.winner === primaryPlayer) opponents[p].myWins += 1;
        else if (g.winner === p) opponents[p].theirWins += 1;
      });
    });

    const entries = Object.entries(opponents);
    if (entries.length === 0) return null;

    // Maior Rival: most games played together
    const [rivalName, rivalStats] = entries.sort(([, a], [, b]) => b.games - a.games)[0];

    // Maior Freguês: opponent where primaryPlayer won most
    const [fregName, fregStats] = entries.sort(([, a], [, b]) => b.myWins - a.myWins)[0];

    // Maior Carrasco: opponent who beat primaryPlayer most
    const [carrascoName, carrascoStats] = entries.sort(([, a], [, b]) => b.theirWins - a.theirWins)[0];

    return {
      rival: { name: rivalName, ...rivalStats },
      freg: { name: fregName, ...fregStats },
      carrasco: { name: carrascoName, ...carrascoStats },
    };
  }, [games, primaryPlayer]);

  const chartHeight = (count) => Math.max(140, count * 38);

  return (
    <>
      <div className="stats-container fade-in">
        <header className="stats-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('stats.title')}</h1>
        </header>

        {!games ? (
          <div className="empty-stats">
            <span className="empty-icon"><AlertTriangle size={22} /></span>
            <p>{t('stats.dataError')}</p>
          </div>
        ) : games.length === 0 ? (
          <div className="empty-stats">
            <span className="empty-icon"><BarChart3 size={22} /></span>
            <p>{t('stats.noData')}</p>
            <Button variant="accent" onClick={() => onNavigate('newgame')}>
              {t('home.newGame')}
            </Button>
          </div>
        ) : (
          <div className="stats-content">
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-icon"><Gamepad2 size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.totalGames || 0}</span>
                  <span className="summary-label">{t('stats.totalGames')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><Target size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.uniqueGames || 0}</span>
                  <span className="summary-label">{t('stats.gameStats')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><Users size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.totalPlayers || 0}</span>
                  <span className="summary-label">{t('stats.playerStats')}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="stats-tabs">
              <button className={`tab-btn ${activeTab === 'competitive' ? 'active' : ''}`} onClick={() => setActiveTab('competitive')}>
                {t('stats.competitive')}
              </button>
              <button className={`tab-btn ${activeTab === 'cooperative' ? 'active' : ''}`} onClick={() => setActiveTab('cooperative')}>
                {t('stats.cooperative')}
              </button>
              <button className={`tab-btn ${activeTab === 'rivalry' ? 'active' : ''}`} onClick={() => setActiveTab('rivalry')}>
                <Swords size={16} /> {t('stats.rivalry')}
              </button>
            </div>

            {/* ── Competitive Tab ── */}
            {activeTab === 'competitive' && (
              <div className="stats-grid">
                {/* Top Winners + Bar Chart */}
                <div className="stats-section">
                  <h2><Medal size={18} /> {t('stats.topWinnersLabel')}</h2>
                  <p className="stats-section-hint">{t('history.filterCompetitive')}</p>
                  {competitiveWins.length > 0 ? (
                    <>
                      <div className="chart-wrapper" style={{ height: chartHeight(competitiveWins.length) }}>
                        <Bar data={winsBarData} options={BAR_OPTIONS(competitiveWins[0]?.[1] + 1)} />
                      </div>
                      <div className="leaderboard">
                        {competitiveWins.map(([player, wins], rank) => (
                          <button key={player} className="leaderboard-item clickable" onClick={() => setSelectedPlayer(player)} title={`${t('stats.viewPlayerStats')} ${player}`}>
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{player}</span>
                              <span className="player-stat">{wins} {wins === 1 ? t('stats.victory') : t('stats.victories')}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(wins / competitiveWins[0][1]) * 100}%` }} />
                            </div>
                            <span className="leaderboard-chevron">›</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noData')}</p>
                  )}
                </div>

                {/* Win Rate + Bar Chart */}
                <div className="stats-section">
                  <h2><BarChart3 size={18} /> {t('stats.winRateLabel')}</h2>
                  <p className="stats-section-hint">{t('stats.winRateByPlayer')}</p>
                  {competitivePlayerStats.length > 0 ? (
                    <>
                      <div className="chart-wrapper" style={{ height: chartHeight(competitivePlayerStats.length) }}>
                        <Bar data={winRateBarData} options={BAR_OPTIONS(100)} />
                      </div>
                      <div className="leaderboard">
                        {competitivePlayerStats.map(({ player, winRate, wins, appearances }, rank) => (
                          <button key={player} className="leaderboard-item clickable" onClick={() => setSelectedPlayer(player)} title={`${t('stats.viewPlayerStats')} ${player}`}>
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{player}</span>
                              <span className="player-stat">{wins}/{appearances} • {winRate}%</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${winRate}%` }} />
                            </div>
                            <span className="leaderboard-chevron">›</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noData')}</p>
                  )}
                </div>

                {/* Most Played Games + Doughnut */}
                <div className="stats-section">
                  <h2><PieChart size={18} /> {t('stats.mostPlayedLabel')}</h2>
                  {competitiveGameFreq.length > 0 ? (
                    <>
                      <div className="chart-wrapper chart-wrapper-doughnut">
                        <Doughnut data={gamesDoughnutData} options={DOUGHNUT_OPTIONS} />
                      </div>
                      <div className="leaderboard">
                        {competitiveGameFreq.map(([game, count], rank) => (
                          <div key={game} className="leaderboard-item">
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{game}</span>
                              <span className="player-stat">{count} {count === 1 ? t('home.game') : t('home.games')}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(count / competitiveGameFreq[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noData')}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Cooperative Tab ── */}
            {activeTab === 'cooperative' && (
              <div className="stats-grid">
                <div className="stats-section full-width">
                  <h2><Target size={18} /> {t('stats.successRateLabel')}</h2>
                  {cooperativeStats.total > 0 ? (
                    <div className="success-rate-card">
                      <div className="success-rate-content">
                        <div className="rate-display">
                          <span className="rate-value">{cooperativeStats.successRate}% </span>
                          <span className="rate-label">{t('stats.successRateLabel')}</span>
                        </div>
                        <div className="rate-stats">
                          <div className="rate-item">
                            <span className="rate-icon"><Trophy size={16} /></span>
                            <span className="rate-number">{cooperativeStats.wins}</span>
                            <span className="rate-text">{cooperativeStats.wins === 1 ? t('stats.victory') : t('stats.victories')}</span>
                          </div>
                          <div className="rate-divider">|</div>
                          <div className="rate-item">
                            <span className="rate-icon"><Skull size={16} /></span>
                            <span className="rate-number">{cooperativeStats.losses}</span>
                            <span className="rate-text">{cooperativeStats.losses === 1 ? t('stats.defeat') : t('stats.defeats')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="progress-bar-large">
                        <div className="progress-fill" style={{ width: `${cooperativeStats.successRate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="empty-section">{t('stats.noCoopGames')}</p>
                  )}
                </div>

                {cooperativeGameFreq.length > 0 && (
                  <div className="stats-section">
                    <h2><PieChart size={18} /> {t('stats.mostPlayedLabel')}</h2>
                    <div className="chart-wrapper chart-wrapper-doughnut">
                      <Doughnut data={coopDoughnutData} options={DOUGHNUT_OPTIONS} />
                    </div>
                    <div className="leaderboard">
                      {cooperativeGameFreq.map(([game, count], rank) => (
                        <div key={game} className="leaderboard-item">
                          <span className="rank-badge">{rank + 1}</span>
                          <div className="leaderboard-info">
                            <span className="player-name">{game}</span>
                            <span className="player-stat">{count} {count === 1 ? t('home.game') : t('home.games')}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(count / cooperativeGameFreq[0][1]) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Rivalry Tab ── */}
            {activeTab === 'rivalry' && (
              <div className="stats-grid">
                {!rivalryData ? (
                  <div className="stats-section full-width">
                    <p className="empty-section">{t('stats.rivalryEmpty')}</p>
                  </div>
                ) : (
                  <>
                    {/* Maior Rival */}
                    <div className="stats-section rivalry-card">
                      <div className="rivalry-header">
                        <span className="rivalry-crown"><Swords size={18} /></span>
                        <div>
                          <h2>{t('stats.rivalMajor')}</h2>
                          <p className="stats-section-hint">{t('stats.rivalMajorHint')}</p>
                        </div>
                      </div>
                      <div className="rivalry-player-name">{rivalryData.rival.name}</div>
                      <div className="rivalry-stats">
                        <div className="rivalry-stat-item">
                          <span className="rivalry-stat-value">{rivalryData.rival.games}</span>
                          <span className="rivalry-stat-label"><Gamepad2 size={14} /> {t('stats.rivalGamesTogther')}</span>
                        </div>
                        <div className="rivalry-stat-item win">
                          <span className="rivalry-stat-value">{rivalryData.rival.myWins}</span>
                          <span className="rivalry-stat-label"><TrendingUp size={14} /> {t('stats.rivalMyWins')}</span>
                        </div>
                        <div className="rivalry-stat-item loss">
                          <span className="rivalry-stat-value">{rivalryData.rival.theirWins}</span>
                          <span className="rivalry-stat-label"><TrendingDown size={14} /> {t('stats.rivalTheirWins')}</span>
                        </div>
                      </div>
                      <div className="rivalry-bar-wrap">
                        <span className="rivalry-bar-label">{primaryPlayer}</span>
                        <div className="rivalry-bar">
                          <div
                            className="rivalry-fill win"
                            style={{ width: rivalryData.rival.games > 0 ? `${(rivalryData.rival.myWins / rivalryData.rival.games) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="rivalry-bar-label">{rivalryData.rival.name}</span>
                      </div>
                    </div>

                    {/* Maior Freguês */}
                    <div className="stats-section rivalry-card rivalry-card-win">
                      <div className="rivalry-header">
                        <span className="rivalry-crown"><Crown size={18} /></span>
                        <div>
                          <h2>{t('stats.rivalFreg')}</h2>
                          <p className="stats-section-hint">{t('stats.rivalFregHint')}</p>
                        </div>
                      </div>
                      <div className="rivalry-player-name">{rivalryData.freg.name}</div>
                      <div className="rivalry-stats">
                        <div className="rivalry-stat-item">
                          <span className="rivalry-stat-value">{rivalryData.freg.games}</span>
                          <span className="rivalry-stat-label"><Gamepad2 size={14} /> {t('stats.rivalGamesTogther')}</span>
                        </div>
                        <div className="rivalry-stat-item win">
                          <span className="rivalry-stat-value">{rivalryData.freg.myWins}</span>
                          <span className="rivalry-stat-label"><TrendingUp size={14} /> {t('stats.rivalMyWins')}</span>
                        </div>
                        <div className="rivalry-stat-item loss">
                          <span className="rivalry-stat-value">{rivalryData.freg.theirWins}</span>
                          <span className="rivalry-stat-label"><TrendingDown size={14} /> {t('stats.rivalTheirWins')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Maior Carrasco */}
                    <div className="stats-section rivalry-card rivalry-card-loss">
                      <div className="rivalry-header">
                        <span className="rivalry-crown"><Skull size={18} /></span>
                        <div>
                          <h2>{t('stats.rivalCarrasco')}</h2>
                          <p className="stats-section-hint">{t('stats.rivalCarrascoHint')}</p>
                        </div>
                      </div>
                      <div className="rivalry-player-name">{rivalryData.carrasco.name}</div>
                      <div className="rivalry-stats">
                        <div className="rivalry-stat-item">
                          <span className="rivalry-stat-value">{rivalryData.carrasco.games}</span>
                          <span className="rivalry-stat-label"><Gamepad2 size={14} /> {t('stats.rivalGamesTogther')}</span>
                        </div>
                        <div className="rivalry-stat-item win">
                          <span className="rivalry-stat-value">{rivalryData.carrasco.myWins}</span>
                          <span className="rivalry-stat-label"><TrendingUp size={14} /> {t('stats.rivalMyWins')}</span>
                        </div>
                        <div className="rivalry-stat-item loss">
                          <span className="rivalry-stat-value">{rivalryData.carrasco.theirWins}</span>
                          <span className="rivalry-stat-label"><TrendingDown size={14} /> {t('stats.rivalTheirWins')}</span>
                        </div>
                      </div>
                    </div>
                  </>
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
