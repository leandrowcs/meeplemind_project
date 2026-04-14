import { useState } from 'react';
import { Button, IconButton } from './Button';
import { GameDetailsModal } from './GameDetailsModal';
import { ThemeToggle } from './ThemeToggle';
import './History.css';

export const History = ({ onNavigate, games, onDelete, onUpdate, uniqueGames }) => {
  const [selectedFilter, setSelectedFilter] = useState('');
  const [modalGame, setModalGame] = useState(null);

  const filteredGames = selectedFilter
    ? games.filter((g) => g.game === selectedFilter)
    : games;

  const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  
  const dateStr = isoDate.includes('T') ? isoDate : isoDate + 'T00:00:00';
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) return '—';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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

    const stats = {
      totalGames: gameRecords.length,
      players: new Set(),
      averageDuration: null,
      winners: {},
    };

    let totalDuration = 0;
    let durationCount = 0;

    gameRecords.forEach((record) => {
      record.players.forEach((p) => stats.players.add(p));
      stats.winners[record.winner] = (stats.winners[record.winner] || 0) + 1;
      if (record.duration) {
        totalDuration += record.duration;
        durationCount++;
      }
    });

    if (durationCount > 0) {
      stats.averageDuration = Math.round(totalDuration / durationCount);
    }

    return stats;
  };

  return (
    <>
      <ThemeToggle />
      <div className="history-container fade-in">
        <header className="history-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            ← Voltar
          </button>
          <h1>Histórico de Partidas</h1>
        </header>

        <div className="content">
        {games.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>Nenhuma partida registrada ainda</p>
            <Button
              variant="accent"
              onClick={() => onNavigate('newgame')}
            >
              Registrar primeira partida
            </Button>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="filter-section">
              <div className="filter-label">Filtrar por jogo:</div>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${!selectedFilter ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('')}
                >
                  Ver Todos
                </button>
                {uniqueGames.map((game) => (
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

            {/* Stats for selected filter */}
            {selectedFilter && getPlayerStats(selectedFilter) && (
              <div className="game-stats">
                <div className="stat-row">
                  <span>Vezes jogado:</span>
                  <strong>{getPlayerStats(selectedFilter).totalGames}×</strong>
                </div>
                <div className="stat-row">
                  <span>Jogadores:</span>
                  <strong>{getPlayerStats(selectedFilter).players.size}</strong>
                </div>
                {getPlayerStats(selectedFilter).averageDuration && (
                  <div className="stat-row">
                    <span>Duração média:</span>
                    <strong>{formatDuration(getPlayerStats(selectedFilter).averageDuration)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Games List */}
            <div className="games-list">
              {filteredGames.length === 0 ? (
                <div className="no-filter-results">
                  <p>Nenhuma partida de "{selectedFilter}" encontrada</p>
                </div>
              ) : (
                filteredGames.map((game) => (
                  <div key={game.id} className="game-card">
                    <div className="card-header">
                      <h3>{game.game}</h3>
                      <div className="header-actions">
                        <button
                          className="btn-edit"
                          onClick={() => setModalGame(game)}
                          title="Editar rating e notas"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja deletar?')) {
                              onDelete(game.id);
                            }
                          }}
                          title="Deletar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

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
                      <div className="card-stat">
                        <span className="icon">👑</span>
                        <div>
                          <span className="label">Vencedor</span>
                          <span className="value">{game.winner}</span>
                        </div>
                      </div>

                      <div className="card-stat">
                        <span className="icon">👥</span>
                        <div>
                          <span className="label">Jogadores</span>
                          <span className="value">{game.players.length}</span>
                        </div>
                      </div>

                      {game.duration && (
                        <div className="card-stat">
                          <span className="icon">⏱️</span>
                          <div>
                            <span className="label">Duração</span>
                            <span className="value">{formatDuration(game.duration)}</span>
                          </div>
                        </div>
                      )}

                      <div className="card-stat">
                        <span className="icon">📅</span>
                        <div>
                          <span className="label">Data</span>
                          <span className="value">{formatDate(game.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Players & Points */}
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
                  </div>
                ))
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
