import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bird,
  BookOpen,
  CalendarDays,
  Gamepad2,
  House,
  PieChart,
  Search,
  ShieldCheck,
  Skull,
  Swords,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../utils/dateFormat';
import './Stats.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_COLORS = ['#4f7dff', '#f08a2f', '#8f7cff', '#2fbf8f', '#f4bf34', '#f97373', '#2dd4bf', '#60a5fa', '#c084fc', '#fb7185'];

const VERTICAL_BAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { color: '#dbe3ff', stepSize: 1, precision: 0 },
      grid: { color: 'rgba(148,163,184,0.16)' },
    },
    x: {
      ticks: { color: '#dbe3ff' },
      grid: { display: false },
    },
  },
};

const horizontalBarOptions = (max = 100) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.x}`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      max,
      ticks: { color: '#dbe3ff' },
      grid: { color: 'rgba(148,163,184,0.16)' },
    },
    y: {
      ticks: { color: '#dbe3ff', font: { size: 12 } },
      grid: { display: false },
    },
  },
});

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#dbe3ff', font: { size: 11 }, boxWidth: 14, padding: 10 },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
      },
    },
  },
};

const sortByCountAndName = (a, b) => {
  if (b[1] !== a[1]) return b[1] - a[1];
  return a[0].localeCompare(b[0]);
};

const RivalCard = ({ title, subtitle, icon, items, primaryPlayer, emptyMessage }) => {
  return (
    <section className="stats-panel rivalry-panel">
      <div className="panel-header-row">
        <h3><span className="panel-icon">{icon}</span> {title}</h3>
      </div>
      <p className="panel-subtitle">{subtitle}</p>

      {items.length === 0 ? (
        <p className="empty-section">{emptyMessage}</p>
      ) : (
        <div className="rival-list">
          {items.map((item) => {
            const duelTotal = item.myWins + item.theirWins;
            const myRate = duelTotal > 0 ? Math.round((item.myWins / duelTotal) * 100) : 0;
            const rivalRate = duelTotal > 0 ? Math.round((item.theirWins / duelTotal) * 100) : 0;

            return (
              <article key={item.name} className="rival-entry">
                <h4>{item.name}</h4>
                <div className="rival-stats-grid">
                  <div>
                    <span>Partidas</span>
                    <strong>{item.games}</strong>
                  </div>
                  <div>
                    <span>{primaryPlayer}</span>
                    <strong>{item.myWins}</strong>
                  </div>
                  <div>
                    <span>{item.name}</span>
                    <strong>{item.theirWins}</strong>
                  </div>
                </div>
                <div className="duel-progress">
                  <div className="duel-progress-me" style={{ width: `${myRate}%` }} />
                  <div className="duel-progress-rival" style={{ width: `${rivalRate}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const ModalShell = ({ title, onClose, children }) => {
  return (
    <div className="stats-modal-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
        <button className="stats-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
};

export const Stats = ({
  onNavigate,
  games,
  stats,
  primaryPlayer,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
  auth,
  syncStatus,
  displayPlayerName,
  googlePhotoUrl,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('competitive');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [selectedTeamPlayer, setSelectedTeamPlayer] = useState(null);
  const [selectedGameName, setSelectedGameName] = useState(null);

  const safeGames = Array.isArray(games) ? games : [];

  const sortedGames = useMemo(
    () => [...safeGames].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [safeGames]
  );

  const competitiveGames = useMemo(
    () => sortedGames.filter((g) => (g.gameType || 'competitive') === 'competitive'),
    [sortedGames]
  );

  const cooperativeGames = useMemo(
    () => sortedGames.filter((g) => g.gameType === 'cooperative'),
    [sortedGames]
  );

  const participantsWithUser = useMemo(() => {
    const participantSet = new Set();
    sortedGames.forEach((g) => {
      if (!(g.players || []).includes(primaryPlayer)) return;
      (g.players || []).forEach((p) => {
        if (p !== primaryPlayer) participantSet.add(p);
      });
    });
    return participantSet.size;
  }, [sortedGames, primaryPlayer]);

  const winnerCounts = useMemo(() => {
    const wins = {};
    competitiveGames.forEach((g) => {
      if (g.winner) wins[g.winner] = (wins[g.winner] || 0) + 1;
    });
    return Object.entries(wins).sort(sortByCountAndName);
  }, [competitiveGames]);

  const competitiveGameFreq = useMemo(() => {
    const freq = {};
    competitiveGames.forEach((g) => {
      if (g.game) freq[g.game] = (freq[g.game] || 0) + 1;
    });
    return Object.entries(freq).sort(sortByCountAndName);
  }, [competitiveGames]);

  const cooperativeGameFreq = useMemo(() => {
    const freq = {};
    cooperativeGames.forEach((g) => {
      if (g.game) freq[g.game] = (freq[g.game] || 0) + 1;
    });
    return Object.entries(freq).sort(sortByCountAndName);
  }, [cooperativeGames]);

  const userWinRateByGame = useMemo(() => {
    const map = {};
    competitiveGames.forEach((g) => {
      if (!(g.players || []).includes(primaryPlayer)) return;
      if (!map[g.game]) map[g.game] = { played: 0, wins: 0 };
      map[g.game].played += 1;
      if (g.winner === primaryPlayer) map[g.game].wins += 1;
    });

    return Object.entries(map)
      .map(([game, value]) => ({
        game,
        winRate: value.played > 0 ? Math.round((value.wins / value.played) * 100) : 0,
        wins: value.wins,
        played: value.played,
      }))
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.played !== a.played) return b.played - a.played;
        return a.game.localeCompare(b.game);
      });
  }, [competitiveGames, primaryPlayer]);

  const coopSummary = useMemo(() => {
    const gamesWithUser = cooperativeGames.filter((g) => (g.players || []).includes(primaryPlayer));
    const winsCount = gamesWithUser.filter((g) => g.coopResult === 'win').length;
    const lossesCount = gamesWithUser.filter((g) => g.coopResult === 'loss').length;
    const total = gamesWithUser.length;
    const successRate = total > 0 ? Math.round((winsCount / total) * 100) : 0;

    return {
      total,
      wins: winsCount,
      losses: lossesCount,
      successRate,
    };
  }, [cooperativeGames, primaryPlayer]);

  const teamPlayers = useMemo(() => {
    const map = {};
    cooperativeGames.forEach((g) => {
      if (!(g.players || []).includes(primaryPlayer)) return;
      (g.players || []).forEach((p) => {
        if (p === primaryPlayer) return;
        if (!map[p]) map[p] = { name: p, games: 0, wins: 0, losses: 0, gameSet: new Set() };
        map[p].games += 1;
        map[p].gameSet.add(g.game);
        if (g.coopResult === 'win') map[p].wins += 1;
        if (g.coopResult === 'loss') map[p].losses += 1;
      });
    });

    return Object.values(map)
      .map((p) => ({ ...p, gamesPlayedList: [...p.gameSet].sort() }))
      .sort((a, b) => {
        if (b.games !== a.games) return b.games - a.games;
        return a.name.localeCompare(b.name);
      });
  }, [cooperativeGames, primaryPlayer]);

  const rivalryEntries = useMemo(() => {
    const map = {};
    competitiveGames.forEach((g) => {
      if (!(g.players || []).includes(primaryPlayer)) return;
      (g.players || []).forEach((p) => {
        if (p === primaryPlayer) return;
        if (!map[p]) map[p] = { name: p, games: 0, myWins: 0, theirWins: 0 };
        map[p].games += 1;
        if (g.winner === primaryPlayer) map[p].myWins += 1;
        if (g.winner === p) map[p].theirWins += 1;
      });
    });

    return Object.values(map);
  }, [competitiveGames, primaryPlayer]);

  const mainRivals = useMemo(() => {
    if (rivalryEntries.length === 0) return [];
    const max = Math.max(...rivalryEntries.map((r) => r.games));
    return rivalryEntries.filter((r) => r.games === max).sort((a, b) => a.name.localeCompare(b.name));
  }, [rivalryEntries]);

  const ducklings = useMemo(() => {
    if (rivalryEntries.length === 0) return [];
    const max = Math.max(...rivalryEntries.map((r) => r.myWins));
    if (max === 0) return [];
    return rivalryEntries.filter((r) => r.myWins === max).sort((a, b) => a.name.localeCompare(b.name));
  }, [rivalryEntries]);

  const executioners = useMemo(() => {
    if (rivalryEntries.length === 0) return [];
    const max = Math.max(...rivalryEntries.map((r) => r.theirWins));
    if (max === 0) return [];
    return rivalryEntries.filter((r) => r.theirWins === max).sort((a, b) => a.name.localeCompare(b.name));
  }, [rivalryEntries]);

  const searchableGames = useMemo(() => {
    const names = new Set(sortedGames.map((g) => g.game).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sortedGames]);

  const searchedGames = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return searchableGames.slice(0, 5);
    return searchableGames.filter((name) => name.toLowerCase().includes(normalized)).slice(0, 8);
  }, [searchableGames, searchQuery]);

  const last30DaysCount = useMemo(() => {
    const now = new Date();
    const minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return sortedGames.filter((g) => {
      const d = new Date(g.date);
      return d >= minDate && d <= now;
    }).length;
  }, [sortedGames]);

  const selectedWinnerGames = useMemo(() => {
    if (!selectedWinner) return [];
    return competitiveGames
      .filter((g) => g.winner === selectedWinner)
      .map((g) => ({
        id: g.id,
        game: g.game,
        date: g.date,
        players: (g.players || []).filter((p) => p !== selectedWinner),
      }));
  }, [competitiveGames, selectedWinner]);

  const selectedTeamData = useMemo(
    () => teamPlayers.find((p) => p.name === selectedTeamPlayer) || null,
    [teamPlayers, selectedTeamPlayer]
  );

  const selectedGameRecords = useMemo(() => {
    if (!selectedGameName) return [];
    return sortedGames.filter((g) => (g.game || '').toLowerCase() === selectedGameName.toLowerCase());
  }, [sortedGames, selectedGameName]);

  const selectedGameStats = useMemo(() => {
    if (!selectedGameName || selectedGameRecords.length === 0) return null;

    const competitive = selectedGameRecords.filter((g) => (g.gameType || 'competitive') === 'competitive');
    const cooperative = selectedGameRecords.filter((g) => g.gameType === 'cooperative');
    const myCompetitiveGames = competitive.filter((g) => (g.players || []).includes(primaryPlayer));
    const myWins = myCompetitiveGames.filter((g) => g.winner === primaryPlayer).length;
    const myRate = myCompetitiveGames.length > 0 ? Math.round((myWins / myCompetitiveGames.length) * 100) : 0;

    const winnersMap = {};
    competitive.forEach((g) => {
      if (g.winner) winnersMap[g.winner] = (winnersMap[g.winner] || 0) + 1;
    });

    return {
      total: selectedGameRecords.length,
      competitive: competitive.length,
      cooperative: cooperative.length,
      myRate,
      coopWins: cooperative.filter((g) => g.coopResult === 'win').length,
      topWinners: Object.entries(winnersMap).sort(sortByCountAndName).slice(0, 3),
    };
  }, [selectedGameName, selectedGameRecords, primaryPlayer]);

  const winnerBarData = useMemo(() => ({
    labels: winnerCounts.map(([name]) => name),
    datasets: [
      {
        data: winnerCounts.map(([, count]) => count),
        backgroundColor: winnerCounts.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 8,
        maxBarThickness: 44,
      },
    ],
  }), [winnerCounts]);

  const competitivePieData = useMemo(() => ({
    labels: competitiveGameFreq.map(([name]) => name),
    datasets: [
      {
        data: competitiveGameFreq.map(([, count]) => count),
        backgroundColor: competitiveGameFreq.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderColor: '#101b3f',
      },
    ],
  }), [competitiveGameFreq]);

  const coopPieData = useMemo(() => ({
    labels: cooperativeGameFreq.map(([name]) => name),
    datasets: [
      {
        data: cooperativeGameFreq.map(([, count]) => count),
        backgroundColor: cooperativeGameFreq.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderColor: '#101b3f',
      },
    ],
  }), [cooperativeGameFreq]);

  const userRateData = useMemo(() => ({
    labels: userWinRateByGame.map((entry) => entry.game),
    datasets: [
      {
        data: userWinRateByGame.map((entry) => entry.winRate),
        backgroundColor: userWinRateByGame.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 8,
      },
    ],
  }), [userWinRateByGame]);

  const teamBarData = useMemo(() => ({
    labels: teamPlayers.map((p) => p.name),
    datasets: [
      {
        data: teamPlayers.map((p) => p.games),
        backgroundColor: teamPlayers.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 8,
      },
    ],
  }), [teamPlayers]);

  const winnerBarOptions = useMemo(() => ({
    ...VERTICAL_BAR_OPTIONS,
    onClick: (_, elements) => {
      if (!elements?.length) return;
      const index = elements[0].index;
      const selected = winnerCounts[index]?.[0];
      if (selected) setSelectedWinner(selected);
    },
  }), [winnerCounts]);

  const teamBarOptions = useMemo(() => {
    const max = Math.max(1, ...teamPlayers.map((p) => p.games));
    return {
      ...horizontalBarOptions(max + 1),
      onClick: (_, elements) => {
        if (!elements?.length) return;
        const index = elements[0].index;
        const selected = teamPlayers[index]?.name;
        if (selected) setSelectedTeamPlayer(selected);
      },
    };
  }, [teamPlayers]);

  const userRateOptions = useMemo(() => horizontalBarOptions(100), []);

  const chartHeight = (count, minimum = 180) => Math.max(minimum, count * 36);

  return (
    <>
      <div className="stats-container fade-in">
        <header className="stats-header">
          <div className="stats-title-wrap">
            <span className="stats-title-icon"><BarChart3 size={18} /></span>
            <h1>{t('stats.title')}</h1>
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
            userName={displayPlayerName || primaryPlayer}
            userPhotoUrl={googlePhotoUrl}
          />
        </header>

        {!games ? (
          <div className="empty-stats">
            <span className="empty-icon"><AlertTriangle size={22} /></span>
            <p>{t('stats.dataError')}</p>
          </div>
        ) : safeGames.length === 0 ? (
          <div className="empty-stats">
            <span className="empty-icon"><BarChart3 size={22} /></span>
            <p>{t('stats.noData')}</p>
            <Button variant="accent" onClick={() => onNavigate('newgame')}>
              {t('home.newGame')}
            </Button>
          </div>
        ) : (
          <div className="stats-content">
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-icon"><Gamepad2 size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.totalGames || 0}</span>
                  <span className="summary-label">Total de Partidas</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><ShieldCheck size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.uniqueGames || 0}</span>
                  <span className="summary-label">Jogos diferentes</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><Users size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{participantsWithUser}</span>
                  <span className="summary-label">Participantes com você</span>
                </div>
              </div>
            </div>

            <section className="stats-panel search-panel">
              <div className="search-input-row">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar jogo..."
                    aria-label="Pesquisar jogo"
                  />
                </div>
                <span className="search-chip">{last30DaysCount} últimos 30 dias</span>
              </div>

              <div className="search-results">
                {searchedGames.map((name) => (
                  <button
                    key={name}
                    className="search-result-btn"
                    onClick={() => {
                      setSelectedGameName(name);
                      setSearchQuery('');
                    }}
                  >
                    {name}
                  </button>
                ))}
                {searchedGames.length === 0 && (
                  <span className="search-empty">Nenhum jogo encontrado</span>
                )}
              </div>
            </section>

            <div className="stats-tabs">
              <button className={`tab-btn ${activeTab === 'competitive' ? 'active' : ''}`} onClick={() => setActiveTab('competitive')}>
                Competitivo
              </button>
              <button className={`tab-btn ${activeTab === 'cooperative' ? 'active' : ''}`} onClick={() => setActiveTab('cooperative')}>
                Cooperativo
              </button>
              <button className={`tab-btn ${activeTab === 'rivalry' ? 'active' : ''}`} onClick={() => setActiveTab('rivalry')}>
                Rivalidade
              </button>
            </div>

            {activeTab === 'competitive' && (
              <div className="stats-grid">
                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><Trophy size={18} /> Vitórias por jogador</h3>
                  </div>
                  <p className="panel-subtitle">Apenas jogadores com ao menos uma vitória competitiva.</p>
                  <p className="insights-note">Clique em uma barra ou nome para ver os jogos que esse jogador venceu.</p>

                  {winnerCounts.length > 0 ? (
                    <>
                      <div className="chart-wrapper" style={{ height: chartHeight(winnerCounts.length, 200) }}>
                        <Bar data={winnerBarData} options={winnerBarOptions} />
                      </div>
                      <div className="leaderboard">
                        {winnerCounts.map(([player, wins], rank) => (
                          <button
                            key={player}
                            className="leaderboard-item clickable"
                            onClick={() => setSelectedWinner(player)}
                          >
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{player}</span>
                              <span className="player-stat">{wins} vitórias</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(wins / winnerCounts[0][1]) * 100}%` }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">Sem vitórias competitivas registradas.</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><PieChart size={18} /> Jogos mais jogados</h3>
                  </div>

                  {competitiveGameFreq.length > 0 ? (
                    <>
                      <div className="chart-wrapper chart-wrapper-doughnut">
                        <Doughnut data={competitivePieData} options={DOUGHNUT_OPTIONS} />
                      </div>
                      <div className="leaderboard">
                        {competitiveGameFreq.map(([game, count], rank) => (
                          <div key={game} className="leaderboard-item">
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{game}</span>
                              <span className="player-stat">{count} partidas</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(count / competitiveGameFreq[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">Sem jogos competitivos registrados.</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><ShieldCheck size={18} /> Taxa de vitória por jogo</h3>
                  </div>

                  {userWinRateByGame.length > 0 ? (
                    <>
                      <div className="chart-wrapper" style={{ height: chartHeight(userWinRateByGame.length, 180) }}>
                        <Bar data={userRateData} options={userRateOptions} />
                      </div>
                      <div className="leaderboard">
                        {userWinRateByGame.map((entry, rank) => (
                          <div key={entry.game} className="leaderboard-item">
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{entry.game}</span>
                              <span className="player-stat">{entry.wins}/{entry.played} vitórias</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${entry.winRate}%` }} />
                            </div>
                            <strong className="rate-badge">{entry.winRate}%</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">Nenhum jogo competitivo seu para calcular taxa.</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'cooperative' && (
              <div className="stats-grid">
                <section className="stats-panel full-width-panel">
                  <div className="panel-header-row">
                    <h3><ShieldCheck size={18} /> Taxa de sucesso</h3>
                  </div>

                  {coopSummary.total > 0 ? (
                    <div className="coop-success-wrap">
                      <div className="coop-success-grid">
                        <div className="coop-success-main">
                          <span>Taxa de sucesso</span>
                          <strong>{coopSummary.successRate}%</strong>
                        </div>
                        <div className="coop-success-stat">
                          <span>Vitórias</span>
                          <strong>{coopSummary.wins}</strong>
                        </div>
                        <div className="coop-success-stat">
                          <span>Derrotas</span>
                          <strong>{coopSummary.losses}</strong>
                        </div>
                      </div>
                      <div className="progress-bar-large">
                        <div className="progress-fill" style={{ width: `${coopSummary.successRate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="empty-section">Nenhum jogo cooperativo com você registrado.</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><PieChart size={18} /> Jogos mais jogados</h3>
                  </div>

                  {cooperativeGameFreq.length > 0 ? (
                    <>
                      <div className="chart-wrapper chart-wrapper-doughnut">
                        <Doughnut data={coopPieData} options={DOUGHNUT_OPTIONS} />
                      </div>
                      <div className="leaderboard">
                        {cooperativeGameFreq.map(([game, count], rank) => (
                          <div key={game} className="leaderboard-item">
                            <span className="rank-badge">{rank + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{game}</span>
                              <span className="player-stat">{count} partidas</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(count / cooperativeGameFreq[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">Nenhum jogo cooperativo ainda.</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><Users size={18} /> Sempre na equipe</h3>
                  </div>
                  <p className="panel-subtitle">Participantes de partidas cooperativas com você.</p>

                  {teamPlayers.length > 0 ? (
                    <>
                      <div className="chart-wrapper" style={{ height: chartHeight(teamPlayers.length, 180) }}>
                        <Bar data={teamBarData} options={teamBarOptions} />
                      </div>
                      <div className="leaderboard">
                        {teamPlayers.map((entry, index) => (
                          <button key={entry.name} className="leaderboard-item clickable" onClick={() => setSelectedTeamPlayer(entry.name)}>
                            <span className="rank-badge">{index + 1}</span>
                            <div className="leaderboard-info">
                              <span className="player-name">{entry.name}</span>
                              <span className="player-stat">{entry.games} partidas</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(entry.games / teamPlayers[0].games) * 100}%` }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">Registre partidas cooperativas com outros participantes.</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'rivalry' && (
              <div className="stats-grid">
                <RivalCard
                  title="Maior rival"
                  subtitle="Quem mais cruzou o seu caminho!"
                  icon={<Swords size={18} />}
                  items={mainRivals}
                  primaryPlayer={primaryPlayer}
                  emptyMessage="Sem dados suficientes de rivalidade ainda."
                />

                <RivalCard
                  title="Maior freguês"
                  subtitle="Quem mais perde pra você, feito um patinho!"
                  icon={<Bird size={18} />}
                  items={ducklings}
                  primaryPlayer={primaryPlayer}
                  emptyMessage="Ainda não existe um freguês definido."
                />

                <RivalCard
                  title="Maior carrasco"
                  subtitle="Quem mais te derrota!"
                  icon={<Skull size={18} />}
                  items={executioners}
                  primaryPlayer={primaryPlayer}
                  emptyMessage="Ainda não existe um carrasco definido."
                />
              </div>
            )}
          </div>
        )}

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className="bottom-nav-item" onClick={() => onNavigate('home')}>
            <span><House size={18} /></span>
            <small>Home</small>
          </button>
          <button className="bottom-nav-item active" onClick={() => onNavigate('stats')}>
            <span><BarChart3 size={18} /></span>
            <small>{t('stats.title')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('library')}>
            <span><BookOpen size={18} /></span>
            <small>{t('home.library')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{t('home.profile')}</small>
          </button>
        </nav>
      </div>

      {selectedWinner && (
        <ModalShell title={`Vitórias de ${selectedWinner}`} onClose={() => setSelectedWinner(null)}>
          {selectedWinnerGames.length > 0 ? (
            <div className="stats-modal-list">
              {selectedWinnerGames.map((entry) => (
                <article key={entry.id} className="stats-modal-item">
                  <p><Gamepad2 size={14} /> {entry.game}</p>
                  <small><CalendarDays size={14} /> {formatDate(entry.date, language)}</small>
                  <small><Users size={14} /> vs. {entry.players.join(', ') || '—'}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-section">Nenhuma vitória encontrada.</p>
          )}
        </ModalShell>
      )}

      {selectedTeamData && (
        <ModalShell title={`Parceria com ${selectedTeamData.name}`} onClose={() => setSelectedTeamPlayer(null)}>
          <div className="stats-modal-summary-grid">
            <div>
              <span>Partidas</span>
              <strong>{selectedTeamData.games}</strong>
            </div>
            <div>
              <span>Vitórias</span>
              <strong>{selectedTeamData.wins}</strong>
            </div>
            <div>
              <span>Taxa de sucesso</span>
              <strong>
                {selectedTeamData.games > 0
                  ? `${Math.round((selectedTeamData.wins / selectedTeamData.games) * 100)}%`
                  : '0%'}
              </strong>
            </div>
          </div>

          <h4 className="stats-modal-subtitle">Jogos que vocês já jogaram juntos</h4>
          <div className="stats-modal-chip-list">
            {selectedTeamData.gamesPlayedList.map((name) => (
              <span key={name} className="stats-chip">{name}</span>
            ))}
          </div>
        </ModalShell>
      )}

      {selectedGameName && selectedGameStats && (
        <ModalShell title={`Estatísticas de ${selectedGameName}`} onClose={() => setSelectedGameName(null)}>
          <div className="stats-modal-summary-grid">
            <div>
              <span>Total</span>
              <strong>{selectedGameStats.total}</strong>
            </div>
            <div>
              <span>Competitivo</span>
              <strong>{selectedGameStats.competitive}</strong>
            </div>
            <div>
              <span>Cooperativo</span>
              <strong>{selectedGameStats.cooperative}</strong>
            </div>
            <div>
              <span>Seu aproveitamento</span>
              <strong>{selectedGameStats.myRate}%</strong>
            </div>
            <div>
              <span>Vitórias coop</span>
              <strong>{selectedGameStats.coopWins}</strong>
            </div>
          </div>

          {selectedGameStats.topWinners.length > 0 && (
            <>
              <h4 className="stats-modal-subtitle">Quem mais venceu este jogo</h4>
              <div className="stats-modal-list compact">
                {selectedGameStats.topWinners.map(([name, winsCount]) => (
                  <article key={name} className="stats-modal-item compact">
                    <p>{name}</p>
                    <strong>{winsCount} vitórias</strong>
                  </article>
                ))}
              </div>
            </>
          )}

          <h4 className="stats-modal-subtitle">Últimas partidas</h4>
          <div className="stats-modal-list">
            {selectedGameRecords.slice(0, 8).map((g) => (
              <article key={g.id} className="stats-modal-item">
                <p><CalendarDays size={14} /> {formatDate(g.date, language)}</p>
                <small><Users size={14} /> {(g.players || []).join(', ')}</small>
                <small>
                  {(g.gameType || 'competitive') === 'competitive'
                    ? `Vencedor: ${g.winner || '—'}`
                    : `Resultado: ${g.coopResult === 'win' ? 'Vitória' : 'Derrota'}`}
                </small>
              </article>
            ))}
          </div>
        </ModalShell>
      )}
    </>
  );
};
