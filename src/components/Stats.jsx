import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bird,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gamepad2,
  House,
  PieChart,
  ShieldCheck,
  Skull,
  Swords,
  Timer,
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
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../utils/dateFormat';
import './Stats.css';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Tooltip, Legend);

const CHART_COLORS = ['#4f7dff', '#f08a2f', '#8f7cff', '#2fbf8f', '#f4bf34', '#f97373', '#2dd4bf', '#60a5fa', '#c084fc', '#fb7185'];

const CATEGORY_LABEL_KEYS = {
  strategy: 'library.categoryStrategy',
  cooperative: 'library.categoryCooperative',
  family: 'library.categoryFamily',
  party: 'library.categoryParty',
  rpg: 'library.categoryRPG',
  'deck-building': 'library.categoryDeckBuilding',
  'worker-placement': 'library.categoryWorkerPlacement',
  abstract: 'library.categoryAbstract',
  euro: 'library.categoryEuro',
  other: 'library.categoryOther',
  none: 'library.categoryNone',
};

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

const makeDoughnutOptions = (topN = 10) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#dbe3ff',
        font: { size: 11 },
        boxWidth: 14,
        padding: 10,
        filter: (legendItem) => legendItem.index < topN,
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
      },
    },
  },
});

const DOUGHNUT_OPTIONS = makeDoughnutOptions(10);

const makeRadarOptions = (matchesLabel) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${matchesLabel}: ${ctx.parsed.r}`,
      },
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        stepSize: 1,
        color: '#dbe3ff',
        backdropColor: 'transparent',
      },
      grid: { color: 'rgba(148,163,184,0.2)' },
      angleLines: { color: 'rgba(148,163,184,0.2)' },
      pointLabels: {
        color: '#dbe3ff',
        font: { size: 11 },
      },
    },
  },
});

const sortByCountAndName = (a, b) => {
  if (b[1] !== a[1]) return b[1] - a[1];
  return a[0].localeCompare(b[0]);
};

const RivalCard = ({ title, subtitle, icon, items, primaryPlayer, emptyMessage }) => {
  const { t } = useLanguage();
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
                    <span>{t('stats.rivalMatches')}</span>
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

const ActivityCalendar = ({ year, activityByDay }) => {
  const { t, language } = useLanguage();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  // Align to week start (Sunday)
  const calStart = new Date(startDate);
  calStart.setDate(calStart.getDate() - calStart.getDay());

  const weeks = [];
  const cur = new Date(calStart);

  while (cur <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const count = activityByDay[key] || 0;
      const inYear = cur.getFullYear() === year;
      week.push({ key, count, inYear, date: new Date(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(activityByDay));

  const getLevel = (count) => {
    if (count === 0) return 0;
    if (count <= Math.ceil(maxCount * 0.25)) return 1;
    if (count <= Math.ceil(maxCount * 0.5)) return 2;
    if (count <= Math.ceil(maxCount * 0.75)) return 3;
    return 4;
  };

  const MONTH_LABELS = useMemo(
    () => Array.from({ length: 12 }, (_, m) =>
      new Intl.DateTimeFormat(language, { month: 'short' })
        .format(new Date(2024, m, 1))
        .replace('.', '')
    ),
    [language]
  );

  // Compute month label positions (week index where each month starts)
  const monthOffsets = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstInYear = week.find((d) => d.inYear);
    if (firstInYear) {
      const m = firstInYear.date.getMonth();
      if (m !== lastMonth) {
        monthOffsets.push({ month: m, weekIndex: wi });
        lastMonth = m;
      }
    }
  });

  return (
    <div className="activity-calendar">
      <div className="activity-scroll-wrap">
        <div className="activity-month-labels">
          {monthOffsets.map(({ month, weekIndex }) => (
            <span
              key={month}
              className="activity-month-label"
              style={{ left: `${weekIndex * (10 + 2)}px` }}
            >
              {MONTH_LABELS[month]}
            </span>
          ))}
        </div>
        <div className="activity-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="activity-col">
              {week.map((day) => (
                <div
                  key={day.key}
                  className={`activity-cell level-${day.inYear ? getLevel(day.count) : 'empty'}`}
                  title={day.inYear ? `${day.key}: ${t('stats.matchesCount').replace('{count}', day.count)}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="activity-legend">
        <span>{t('stats.activityLess')}</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`activity-cell level-${l}`} />
        ))}
        <span>{t('stats.activityMore')}</span>
      </div>
    </div>
  );
};

const ModalShell = ({ title, onClose, children }) => {  return (
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
  library = [],
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
  const [topGamesView, setTopGamesView] = useState('count'); // 'count' | 'time'
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [selectedTeamPlayer, setSelectedTeamPlayer] = useState(null);
  const [selectedGameName, setSelectedGameName] = useState(null);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());

  const safeGames = Array.isArray(games) ? games : [];
  const safeLibrary = Array.isArray(library) ? library : [];

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

  const last30DaysCount = useMemo(() => {
    const now = new Date();
    const minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return sortedGames.filter((g) => {
      const d = new Date(g.date);
      return d >= minDate && d <= now;
    }).length;
  }, [sortedGames]);

  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set(safeGames.map((g) => new Date(g.date).getFullYear()).filter(Boolean));
    return [...years].sort((a, b) => b - a);
  }, [safeGames]);

  const yearGames = useMemo(() => {
    return sortedGames.filter((g) => new Date(g.date).getFullYear() === currentYear);
  }, [sortedGames, currentYear]);

  // Games of the year panel: unique game names that appeared this year
  const yearGameNames = useMemo(() => {
    const names = new Set(yearGames.map((g) => g.game).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [yearGames]);

  // Top 5 most played games overall (by count and by total duration)
  const topGamesByCount = useMemo(() => {
    const freq = {};
    const time = {};
    sortedGames.forEach((g) => {
      if (!g.game) return;
      freq[g.game] = (freq[g.game] || 0) + 1;
      time[g.game] = (time[g.game] || 0) + (g.duration || 0);
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, totalTime: time[name] || 0 }));
  }, [sortedGames]);

  const topGamesByTime = useMemo(() => {
    const time = {};
    const count = {};
    sortedGames.forEach((g) => {
      if (!g.game) return;
      time[g.game] = (time[g.game] || 0) + (g.duration || 0);
      count[g.game] = (count[g.game] || 0) + 1;
    });
    return Object.entries(time)
      .filter(([, t]) => t > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, totalTime]) => ({ name, count: count[name] || 0, totalTime }));
  }, [sortedGames]);

  // Activity calendar: days with game counts for the selected calendar year
  const calendarGames = useMemo(
    () => sortedGames.filter((g) => new Date(g.date).getFullYear() === calendarYear),
    [sortedGames, calendarYear]
  );

  const activityByDay = useMemo(() => {
    const map = {};
    calendarGames.forEach((g) => {
      const d = new Date(g.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [calendarGames]);

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

  const categoryFrequency = useMemo(() => {
    const categoryByGame = new Map();

    safeLibrary.forEach((entry) => {
      const normalizedName = (entry?.name || '').trim().toLowerCase();
      if (!normalizedName) return;

      const rawCategory = typeof entry?.category === 'string'
        ? entry.category.trim().toLowerCase()
        : '';
      const normalizedCategory = CATEGORY_LABEL_KEYS[rawCategory]
        ? rawCategory
        : rawCategory
          ? 'other'
          : 'none';

      categoryByGame.set(normalizedName, normalizedCategory);
    });

    const counts = {};
    sortedGames.forEach((game) => {
      const normalizedGameName = (game?.game || '').trim().toLowerCase();
      if (!normalizedGameName) return;

      const category = categoryByGame.get(normalizedGameName) || 'none';
      counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        count,
        label: t(CATEGORY_LABEL_KEYS[category] || 'library.categoryNone'),
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label, language);
      });
  }, [safeLibrary, sortedGames, t, language]);

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

  const categoryRadarData = useMemo(() => ({
    labels: categoryFrequency.map((entry) => entry.label),
    datasets: [
      {
        label: t('stats.matchesByCategory'),
        data: categoryFrequency.map((entry) => entry.count),
        backgroundColor: 'rgba(79, 125, 255, 0.24)',
        borderColor: '#8cb0ff',
        borderWidth: 2,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fde68a',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#f59e0b',
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  }), [categoryFrequency, t]);

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
  const categoryRadarOptions = useMemo(
    () => makeRadarOptions(t('stats.matchesByCategory')),
    [t]
  );

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
                  <span className="summary-label">{t('stats.totalGames')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><ShieldCheck size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{stats?.uniqueGames || 0}</span>
                  <span className="summary-label">{t('stats.uniqueGames')}</span>
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-icon"><Users size={18} /></span>
                <div className="summary-content">
                  <span className="summary-value">{participantsWithUser}</span>
                  <span className="summary-label">{t('stats.participantsWithYou')}</span>
                </div>
              </div>
            </div>

            <section className="stats-panel search-panel">
              <div className="year-panel-header">
                <CalendarDays size={16} />
                <span className="year-panel-title">{t('stats.gamesOfYear').replace('{year}', currentYear)}</span>
                <span className="search-chip"><Flame size={13} /> {last30DaysCount} {t('stats.last30Days')}</span>
              </div>

              <div className="search-results">
                {yearGameNames.map((name) => (
                  <button
                    key={name}
                    className="search-result-btn"
                    onClick={() => setSelectedGameName(name)}
                  >
                    {name}
                  </button>
                ))}
                {yearGameNames.length === 0 && (
                  <span className="search-empty">{t('stats.noGamesThisYear')}</span>
                )}
              </div>
            </section>

            {/* Top games card */}
            <section className="stats-panel">
              <div className="panel-header-row">
                <h3><Trophy size={18} /> {t('stats.topGamesTitle')}</h3>
              </div>
              <div className="top-games-view-toggle">
                <button
                  className={`view-toggle-btn${topGamesView === 'count' ? ' active' : ''}`}
                  onClick={() => setTopGamesView('count')}
                >
                  <Gamepad2 size={13} /> {t('stats.toggleCount')}
                </button>
                <button
                  className={`view-toggle-btn${topGamesView === 'time' ? ' active' : ''}`}
                  onClick={() => setTopGamesView('time')}
                >
                  <Timer size={13} /> {t('stats.toggleTime')}
                </button>
              </div>
              {topGamesView === 'count' ? (
                topGamesByCount.length > 0 ? (
                  <div className="top-games-list">
                    {topGamesByCount.map((item, i) => (
                      <div key={item.name} className="top-game-row">
                        <span className="rank-badge">{i + 1}</span>
                        <div className="leaderboard-info">
                          <span className="player-name">{item.name}</span>
                          <span className="player-stat">{t('stats.matchesCount').replace('{count}', item.count)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(item.count / topGamesByCount[0].count) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-section">{t('stats.noGamesRecorded')}</p>
                )
              ) : (
                topGamesByTime.length > 0 ? (
                  <div className="top-games-list">
                    {topGamesByTime.map((item, i) => {
                      const hours = Math.floor(item.totalTime / 60);
                      const mins = item.totalTime % 60;
                      const label = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                      return (
                        <div key={item.name} className="top-game-row">
                          <span className="rank-badge">{i + 1}</span>
                          <div className="leaderboard-info">
                            <span className="player-name">{item.name}</span>
                            <span className="player-stat">{label}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(item.totalTime / topGamesByTime[0].totalTime) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-section">{t('stats.noTimedGames')}</p>
                )
              )}
            </section>

            {/* Activity calendar */}
            <section className="stats-panel">
              <div className="panel-header-row">
                <h3><BarChart3 size={18} /> {t('stats.categoryRadarTitle')}</h3>
              </div>
              <p className="panel-subtitle">{t('stats.categoryRadarHint')}</p>

              {categoryFrequency.length > 0 ? (
                <>
                  <div className="chart-wrapper chart-wrapper-radar">
                    <Radar data={categoryRadarData} options={categoryRadarOptions} />
                  </div>
                  <div className="leaderboard">
                    {categoryFrequency.map((entry, rank) => (
                      <div key={entry.category} className="leaderboard-item">
                        <span className="rank-badge">{rank + 1}</span>
                        <div className="leaderboard-info">
                          <span className="player-name">{entry.label}</span>
                          <span className="player-stat">{t('stats.matchesCount').replace('{count}', entry.count)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(entry.count / categoryFrequency[0].count) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="empty-section">{t('stats.noCategoryData')}</p>
              )}
            </section>

            {/* Activity calendar */}
            <section className="stats-panel">
              <div className="panel-header-row">
                <h3><CalendarDays size={18} /> {t('stats.activityTitle').replace('{year}', calendarYear)}</h3>
                <div className="year-nav">
                  <button
                    className="year-nav-btn"
                    onClick={() => {
                      const idx = availableYears.indexOf(calendarYear);
                      if (idx < availableYears.length - 1) setCalendarYear(availableYears[idx + 1]);
                    }}
                    disabled={availableYears.indexOf(calendarYear) >= availableYears.length - 1}
                    aria-label={t('stats.activityLess')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="year-nav-label">{calendarYear}</span>
                  <button
                    className="year-nav-btn"
                    onClick={() => {
                      const idx = availableYears.indexOf(calendarYear);
                      if (idx > 0) setCalendarYear(availableYears[idx - 1]);
                    }}
                    disabled={availableYears.indexOf(calendarYear) <= 0}
                    aria-label={t('stats.activityMore')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <ActivityCalendar year={calendarYear} activityByDay={activityByDay} />
            </section>

            <div className="stats-tabs">
              <button className={`tab-btn ${activeTab === 'competitive' ? 'active' : ''}`} onClick={() => setActiveTab('competitive')}>
                {t('stats.competitive')}
              </button>
              <button className={`tab-btn ${activeTab === 'cooperative' ? 'active' : ''}`} onClick={() => setActiveTab('cooperative')}>
                {t('stats.cooperative')}
              </button>
              <button className={`tab-btn ${activeTab === 'rivalry' ? 'active' : ''}`} onClick={() => setActiveTab('rivalry')}>
                {t('stats.rivalry')}
              </button>
            </div>

            {activeTab === 'competitive' && (
              <div className="stats-grid">
                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><Trophy size={18} /> {t('stats.winsByPlayer')}</h3>
                  </div>
                  <p className="panel-subtitle">{t('stats.onlyWithVictory')}</p>
                  <p className="insights-note">{t('stats.clickBarHint')}</p>

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
                              <span className="player-stat">{t('stats.winsCount').replace('{count}', wins)}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(wins / winnerCounts[0][1]) * 100}%` }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noCompWins')}</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><PieChart size={18} /> {t('stats.mostPlayedLabel')}</h3>
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
                              <span className="player-stat">{t('stats.matchesCount').replace('{count}', count)}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(count / competitiveGameFreq[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noCompGames')}</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><ShieldCheck size={18} /> {t('stats.winRateByGame')}</h3>
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
                              <span className="player-stat">{entry.wins}/{entry.played} {t('stats.victories').toLowerCase()}</span>
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
                    <p className="empty-section">{t('stats.noWinRateData')}</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'cooperative' && (
              <div className="stats-grid">
                <section className="stats-panel full-width-panel">
                  <div className="panel-header-row">
                    <h3><ShieldCheck size={18} /> {t('stats.successRateLabel')}</h3>
                  </div>

                  {coopSummary.total > 0 ? (
                    <div className="coop-success-wrap">
                      <div className="coop-success-grid">
                        <div className="coop-success-main">
                          <span>{t('stats.successRateLabel')}</span>
                          <strong>{coopSummary.successRate}%</strong>
                        </div>
                        <div className="coop-success-stat">
                          <span>{t('stats.victories')}</span>
                          <strong>{coopSummary.wins}</strong>
                        </div>
                        <div className="coop-success-stat">
                          <span>{t('stats.defeats')}</span>
                          <strong>{coopSummary.losses}</strong>
                        </div>
                      </div>
                      <div className="progress-bar-large">
                        <div className="progress-fill" style={{ width: `${coopSummary.successRate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="empty-section">{t('stats.noCoopWithYou')}</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><PieChart size={18} /> {t('stats.mostPlayedLabel')}</h3>
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
                              <span className="player-stat">{t('stats.matchesCount').replace('{count}', count)}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(count / cooperativeGameFreq[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.noCoopYet')}</p>
                  )}
                </section>

                <section className="stats-panel">
                  <div className="panel-header-row">
                    <h3><Users size={18} /> {t('stats.alwaysOnTeam')}</h3>
                  </div>
                  <p className="panel-subtitle">{t('stats.coopParticipantsHint')}</p>

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
                              <span className="player-stat">{t('stats.matchesCount').replace('{count}', entry.games)}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(entry.games / teamPlayers[0].games) * 100}%` }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-section">{t('stats.registerCoopHint')}</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'rivalry' && (
              <div className="stats-grid">
                <RivalCard
                  title={t('stats.rivalMajor')}
                  subtitle={t('stats.rivalMajorHint')}
                  icon={<Swords size={18} />}
                  items={mainRivals}
                  primaryPlayer={primaryPlayer}
                  emptyMessage={t('stats.rivalMajorEmpty')}
                />

                <RivalCard
                  title={t('stats.rivalFreg')}
                  subtitle={t('stats.rivalFregHint')}
                  icon={<Bird size={18} />}
                  items={ducklings}
                  primaryPlayer={primaryPlayer}
                  emptyMessage={t('stats.rivalFregEmpty')}
                />

                <RivalCard
                  title={t('stats.rivalCarrasco')}
                  subtitle={t('stats.rivalCarrascoHint')}
                  icon={<Skull size={18} />}
                  items={executioners}
                  primaryPlayer={primaryPlayer}
                  emptyMessage={t('stats.rivalCarrascoEmpty')}
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
        <ModalShell title={t('stats.winsOf').replace('{name}', selectedWinner)} onClose={() => setSelectedWinner(null)}>
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
            <p className="empty-section">{t('stats.noWinsFound')}</p>
          )}
        </ModalShell>
      )}

      {selectedTeamData && (
        <ModalShell title={t('stats.partnershipWith').replace('{name}', selectedTeamData.name)} onClose={() => setSelectedTeamPlayer(null)}>
          <div className="stats-modal-summary-grid">
            <div>
              <span>{t('stats.rivalMatches')}</span>
              <strong>{selectedTeamData.games}</strong>
            </div>
            <div>
              <span>{t('stats.victories')}</span>
              <strong>{selectedTeamData.wins}</strong>
            </div>
            <div>
              <span>{t('stats.successRateLabel')}</span>
              <strong>
                {selectedTeamData.games > 0
                  ? `${Math.round((selectedTeamData.wins / selectedTeamData.games) * 100)}%`
                  : '0%'}
              </strong>
            </div>
          </div>

          <h4 className="stats-modal-subtitle">{t('stats.gamesPlayedTogether')}</h4>
          <div className="stats-modal-chip-list">
            {selectedTeamData.gamesPlayedList.map((name) => (
              <span key={name} className="stats-chip">{name}</span>
            ))}
          </div>
        </ModalShell>
      )}

      {selectedGameName && selectedGameStats && (
        <ModalShell title={t('stats.gameStatsOf').replace('{name}', selectedGameName)} onClose={() => setSelectedGameName(null)}>
          <div className="stats-modal-summary-grid">
            <div>
              <span>{t('stats.totalLabel')}</span>
              <strong>{selectedGameStats.total}</strong>
            </div>
            <div>
              <span>{t('stats.competitive')}</span>
              <strong>{selectedGameStats.competitive}</strong>
            </div>
            <div>
              <span>{t('stats.cooperative')}</span>
              <strong>{selectedGameStats.cooperative}</strong>
            </div>
            <div>
              <span>{t('stats.myRate')}</span>
              <strong>{selectedGameStats.myRate}%</strong>
            </div>
            <div>
              <span>{t('stats.coopWinsLabel')}</span>
              <strong>{selectedGameStats.coopWins}</strong>
            </div>
          </div>

          {selectedGameStats.topWinners.length > 0 && (
            <>
              <h4 className="stats-modal-subtitle">{t('stats.topWinnersGame')}</h4>
              <div className="stats-modal-list compact">
                {selectedGameStats.topWinners.map(([name, winsCount]) => (
                  <article key={name} className="stats-modal-item compact">
                    <p>{name}</p>
                    <strong>{t('stats.winsCount').replace('{count}', winsCount)}</strong>
                  </article>
                ))}
              </div>
            </>
          )}

          <h4 className="stats-modal-subtitle">{t('stats.latestMatches')}</h4>
          <div className="stats-modal-list">
            {selectedGameRecords.slice(0, 8).map((g) => (
              <article key={g.id} className="stats-modal-item">
                <p><CalendarDays size={14} /> {formatDate(g.date, language)}</p>
                <small><Users size={14} /> {(g.players || []).join(', ')}</small>
                <small>
                  {(g.gameType || 'competitive') === 'competitive'
                    ? t('stats.gameWinner').replace('{winner}', g.winner || '—')
                    : t('stats.gameResult').replace('{result}', g.coopResult === 'win' ? t('stats.victory') : t('stats.defeat'))}
                </small>
              </article>
            ))}
          </div>
        </ModalShell>
      )}
    </>
  );
};
