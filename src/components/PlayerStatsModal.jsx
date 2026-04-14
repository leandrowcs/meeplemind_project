import './PlayerStatsModal.css';

export const PlayerStatsModal = ({ player, games, onClose }) => {
  if (!player) return null;

  const playerGames = games.filter((g) => g.players.includes(player));
  const wins = playerGames.filter((g) => g.winner === player).length;
  const coopGames = playerGames.filter((g) => g.gameType === 'cooperative');
  const coopWins = coopGames.filter((g) => g.coopResult === 'win').length;
  const competitiveGames = playerGames.filter(
    (g) => !g.gameType || g.gameType === 'competitive'
  );
  const winRate =
    competitiveGames.length > 0
      ? ((wins / competitiveGames.length) * 100).toFixed(1)
      : '0.0';

  // Most played game
  const gameFreq = {};
  playerGames.forEach((g) => {
    gameFreq[g.game] = (gameFreq[g.game] || 0) + 1;
  });
  const mostPlayed = Object.entries(gameFreq).sort(([, a], [, b]) => b - a)[0];

  // Favorite rivals (players most played against)
  const rivalFreq = {};
  playerGames.forEach((g) => {
    g.players.forEach((p) => {
      if (p !== player) {
        rivalFreq[p] = (rivalFreq[p] || 0) + 1;
      }
    });
  });
  const topRivals = Object.entries(rivalFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Win streak (max consecutive wins in competitive games)
  let maxStreak = 0;
  let currentStreak = 0;
  [...competitiveGames]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((g) => {
      if (g.winner === player) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

  // Average duration
  const gamesWithDuration = playerGames.filter((g) => g.duration);
  const avgDuration =
    gamesWithDuration.length > 0
      ? Math.round(
          gamesWithDuration.reduce((sum, g) => sum + g.duration, 0) /
            gamesWithDuration.length
        )
      : null;

  const formatDuration = (mins) => {
    if (!mins) return '—';
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  // Recent form (last 5 competitive games)
  const recentCompetitive = [...competitiveGames]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="player-modal-close" onClick={onClose}>✕</button>

        <div className="player-modal-header">
          <div className="player-avatar">{player.charAt(0).toUpperCase()}</div>
          <div>
            <h2>{player}</h2>
            <p className="player-subtitle">{playerGames.length} partida{playerGames.length !== 1 ? 's' : ''} registrada{playerGames.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="player-stats-grid">
          <div className="player-stat-card highlight">
            <span className="psc-icon">🏆</span>
            <span className="psc-value">{wins}</span>
            <span className="psc-label">Vitórias</span>
          </div>
          <div className="player-stat-card">
            <span className="psc-icon">📊</span>
            <span className="psc-value">{winRate}%</span>
            <span className="psc-label">Taxa de vitória</span>
          </div>
          <div className="player-stat-card">
            <span className="psc-icon">⚡</span>
            <span className="psc-value">{maxStreak}</span>
            <span className="psc-label">Maior sequência</span>
          </div>
          <div className="player-stat-card">
            <span className="psc-icon">⏱️</span>
            <span className="psc-value">{formatDuration(avgDuration)}</span>
            <span className="psc-label">Duração média</span>
          </div>
        </div>

        {coopGames.length > 0 && (
          <div className="player-section">
            <h3>🤝 Jogos Cooperativos</h3>
            <div className="coop-summary">
              <div className="coop-stat">
                <span className="coop-num">{coopGames.length}</span>
                <span className="coop-lbl">Partidas</span>
              </div>
              <div className="coop-stat win">
                <span className="coop-num">{coopWins}</span>
                <span className="coop-lbl">Vitórias</span>
              </div>
              <div className="coop-stat loss">
                <span className="coop-num">{coopGames.length - coopWins}</span>
                <span className="coop-lbl">Derrotas</span>
              </div>
            </div>
          </div>
        )}

        {mostPlayed && (
          <div className="player-section">
            <h3>🎲 Jogo Favorito</h3>
            <div className="favorite-game">
              <span className="fg-name">{mostPlayed[0]}</span>
              <span className="fg-count">{mostPlayed[1]}× jogado</span>
            </div>
          </div>
        )}

        {recentCompetitive.length > 0 && (
          <div className="player-section">
            <h3>📅 Últimas Partidas Competitivas</h3>
            <div className="recent-games">
              {recentCompetitive.map((g) => {
                const isWin = g.winner === player;
                return (
                  <div key={g.id} className={`recent-game-item ${isWin ? 'win' : 'loss'}`}>
                    <span className="rg-result">{isWin ? '🥇' : '●'}</span>
                    <span className="rg-name">{g.game}</span>
                    <span className={`rg-badge ${isWin ? 'win' : 'loss'}`}>
                      {isWin ? 'V' : 'D'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {topRivals.length > 0 && (
          <div className="player-section">
            <h3>👥 Companheiros Frequentes</h3>
            <div className="rivals-list">
              {topRivals.map(([rival, count]) => (
                <div key={rival} className="rival-item">
                  <div className="rival-avatar">{rival.charAt(0).toUpperCase()}</div>
                  <span className="rival-name">{rival}</span>
                  <span className="rival-count">{count}× junto</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
