import { useState, useEffect } from 'react';
import { Button, IconButton } from './Button';
import { ThemeToggle } from './ThemeToggle';
import './NewGame.css';

export const NewGame = ({ onNavigate, onSave, uniqueGames, uniquePlayers }) => {
  const [formData, setFormData] = useState({
    game: '',
    players: [],
    points: [],
    winner: '',
    duration: '',
    date: '',
  });

  // Initialize date on mount
  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    console.log('[NewGame] Initializing date:', dateString);
    setFormData((prev) => ({ ...prev, date: dateString }));
  }, []);

  const [suggestions, setSuggestions] = useState({
    games: [],
    players: [],
  });

  const [inputValues, setInputValues] = useState({
    game: '',
    newPlayer: '',
  });

  const handleGameInputChange = (e) => {
    const value = e.target.value;
    setInputValues((prev) => ({ ...prev, game: value }));
    setFormData((prev) => ({ ...prev, game: value }));

    if (value.length > 0) {
        const filtered = uniqueGames.filter((g) =>
        g.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions((prev) => ({ ...prev, games: filtered }));
    } else {
        setSuggestions((prev) => ({ ...prev, games: [] }));
    }
  };

  const handleSelectGame = (game) => {
    setFormData((prev) => ({ ...prev, game }));
    setInputValues((prev) => ({ ...prev, game }));
    setSuggestions((prev) => ({ ...prev, games: [] }));
  };

  const handlePlayerInputChange = (e) => {
    const value = e.target.value;
    setInputValues((prev) => ({ ...prev, newPlayer: value }));

    if (value.length > 0) {
      const filtered = uniquePlayers.filter(
        (p) =>
          p.toLowerCase().includes(value.toLowerCase()) &&
          !formData.players.includes(p)
      );
      setSuggestions((prev) => ({ ...prev, players: filtered }));
    } else {
      setSuggestions((prev) => ({ ...prev, players: [] }));
    }
  };

  const handleAddPlayer = (player = null) => {
    const newPlayer = player || inputValues.newPlayer.trim();
    if (newPlayer && !formData.players.includes(newPlayer)) {
      setFormData((prev) => ({
        ...prev,
        players: [...prev.players, newPlayer],
        points: [...prev.points, 0],
      }));
      setInputValues((prev) => ({ ...prev, newPlayer: '' }));
      setSuggestions((prev) => ({ ...prev, players: [] }));
    }
  };

  const handleRemovePlayer = (index) => {
    setFormData((prev) => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index),
      points: prev.points.filter((_, i) => i !== index),
      winner: prev.winner === prev.players[index] ? '' : prev.winner,
    }));
  };

  const handlePointChange = (index, value) => {
    const numValue = parseInt(value) || 0;
    setFormData((prev) => {
      const newPoints = [...prev.points];
      newPoints[index] = numValue;
      return { ...prev, points: newPoints };
    });
  };

  const handleSelectWinner = (player) => {
    setFormData((prev) => ({ ...prev, winner: player }));
  };

  const handleSetDuration = (minutes) => {
    setFormData((prev) => ({ ...prev, duration: minutes }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.game.trim()) {
      alert('Selecione um jogo');
      return;
    }

    if (formData.players.length < 2) {
      alert('Adicione pelo menos 2 jogadores');
      return;
    }

    if (!formData.winner) {
      alert('Selecione o vencedor');
      return;
    }

    onSave({
      game: formData.game,
      players: formData.players,
      points: formData.points,
      winner: formData.winner,
      duration: formData.duration ? parseInt(formData.duration) : null,
      date: formData.date,
    });

    onNavigate('home');
  };

  const isValid = formData.game && formData.players.length >= 2 && formData.winner && formData.date;

  // Debug validation state
  useEffect(() => {
    console.log('[NewGame] Form State:', {
      game: !!formData.game,
      playersCount: formData.players.length,
      winner: !!formData.winner,
      date: !!formData.date,
      isValid,
      dateValue: formData.date
    });
  }, [formData, isValid]);

  return (
    <>
      <ThemeToggle />
      <div className="newgame-container fade-in">
      <header className="newgame-header">
        <button className="back-btn" onClick={() => onNavigate('home')}>
          ← Voltar
        </button>
        <h1>Nova Partida</h1>
      </header>

      <form onSubmit={handleSubmit} className="newgame-form">
        {/* Game Selection */}
        <div className="form-group">
          <label htmlFor="game">Qual jogo?</label>
          <div className="input-with-suggestions">
            <input
              id="game"
              type="text"
              placeholder="Buscar ou digitar novo jogo..."
              value={inputValues.game}
              onChange={handleGameInputChange}
              autoComplete="off"
            />
            {suggestions.games.length > 0 && (
              <div className="suggestions-list">
                {suggestions.games.map((game) => (
                  <button
                    key={game}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleSelectGame(game)}
                  >
                    {game}
                  </button>
                ))}
              </div>
            )}
          </div>
          {formData.game && (
            <div className="selected-item">
              ✓ {formData.game}
            </div>
          )}
        </div>

        {/* Players */}
        <div className="form-group">
          <label htmlFor="player">Jogadores</label>
          <div className="input-with-suggestions">
            <input
              id="player"
              type="text"
              placeholder="Digital nome do jogador e clique +"
              value={inputValues.newPlayer}
              onChange={handlePlayerInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPlayer();
                }
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-add-player"
              onClick={() => handleAddPlayer()}
              disabled={!inputValues.newPlayer.trim()}
            >
              +
            </button>
            {suggestions.players.length > 0 && (
              <div className="suggestions-list">
                {suggestions.players.map((player) => (
                  <button
                    key={player}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleAddPlayer(player)}
                  >
                    {player}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formData.players.length > 0 && (
            <div className="players-section">
              <div className="players-list">
                {formData.players.map((player, index) => (
                  <div key={index} className="player-item">
                    <div className="player-info">
                      <span className="player-name">{player}</span>
                      <input
                        type="number"
                        className="player-points"
                        placeholder="Pts"
                        value={formData.points[index]}
                        onChange={(e) => handlePointChange(index, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemovePlayer(index)}
                      title="Remover jogador"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="winner-section">
                <label>Quem venceu?</label>
                <div className="winner-buttons">
                  {formData.players.map((player) => (
                    <button
                      key={player}
                      type="button"
                      className={`winner-btn ${formData.winner === player ? 'selected' : ''}`}
                      onClick={() => handleSelectWinner(player)}
                    >
                      {player}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date */}
        {formData.players.length > 0 && (
          <div className="form-group">
            <label htmlFor="date">Data da partida</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className="date-input"
            />
          </div>
        )}

        {/* Duration */}
        {formData.players.length > 0 && (
          <div className="form-group">
            <label>Quanto tempo durou? (opcional)</label>
            <div className="duration-buttons">
              {[30, 60, 90, 120, 180, 240].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`duration-btn ${formData.duration === mins ? 'selected' : ''}`}
                  onClick={() => handleSetDuration(mins)}
                >
                  {mins}min
                </button>
              ))}
              <input
                type="number"
                className="duration-input"
                placeholder="outro"
                value={formData.duration || ''}
                onChange={(e) => handleSetDuration(e.target.value)}
                max="999"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="accent"
          size="lg"
          fullWidth
          disabled={!isValid}
          className="submit-btn"
        >
          ✓ Registrar Partida
        </Button>
      </form>
      </div>
    </>
  );
};
