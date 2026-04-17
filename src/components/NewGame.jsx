import { useState, useEffect, useRef } from 'react';
import { Button, IconButton } from './Button';
import { useLanguage } from '../hooks/useLanguage';
import './NewGame.css';

export const NewGame = ({ onNavigate, onSave, uniqueGames, uniquePlayers, mainPlayer, libraryGames = [] }) => {
  const { language, changeLanguage, t } = useLanguage();
  const mainPlayerAdded = useRef(false);
  const [formData, setFormData] = useState({
    game: '',
    gameType: '', // 'competitive' | 'cooperative'
    players: [],
    points: [],
    winner: '',
    coopResult: '', // 'win' | 'loss' (for cooperative games)
    duration: '',
    date: '',
  });

  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setFormData((prev) => ({ ...prev, date: dateString }));
  }, []);

  // Auto-add the main player once on mount
  useEffect(() => {
    if (mainPlayer && !mainPlayerAdded.current) {
      mainPlayerAdded.current = true;
      setFormData((prev) => ({
        ...prev,
        players: [mainPlayer],
        points: [0],
      }));
    }
  }, [mainPlayer]);

  const [suggestions, setSuggestions] = useState({
    games: [],
    gamesFromLib: new Set(),
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
      const lower = value.toLowerCase();
      // Library games take priority, then history games not in library
      const fromLib = libraryGames.filter((g) =>
        g.toLowerCase().includes(lower)
      );
      const fromHistory = uniqueGames.filter(
        (g) =>
          g.toLowerCase().includes(lower) &&
          !libraryGames.some((l) => l.toLowerCase() === g.toLowerCase())
      );
      setSuggestions((prev) => ({
        ...prev,
        games: [...fromLib, ...fromHistory],
        gamesFromLib: new Set(fromLib.map((g) => g.toLowerCase())),
      }));
    } else {
      setSuggestions((prev) => ({ ...prev, games: [], gamesFromLib: new Set() }));
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

  const handleGameTypeSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      gameType: type,
      winner: '',
      coopResult: '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.game.trim()) {
      alert(t('newgame.errorGame'));
      return;
    }

    if (!formData.gameType) {
      alert(t('newgame.errorGameType'));
      return;
    }

    if (formData.players.length < 2) {
      alert(t('newgame.errorMinPlayers'));
      return;
    }

    if (formData.gameType === 'competitive' && !formData.winner) {
      alert(t('newgame.errorWinner'));
      return;
    }

    if (formData.gameType === 'cooperative' && !formData.coopResult) {
      alert(t('newgame.errorCoopResult'));
      return;
    }

    onSave({
      game: formData.game,
      gameType: formData.gameType,
      players: formData.players,
      points: formData.points,
      winner: formData.gameType === 'competitive' ? formData.winner : null,
      coopResult: formData.gameType === 'cooperative' ? formData.coopResult : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      date: formData.date,
    });

    onNavigate('home');
  };

  const isValid =
    formData.game &&
    formData.gameType &&
    formData.players.length >= 2 &&
    formData.date &&
    (formData.gameType === 'competitive' ? !!formData.winner : !!formData.coopResult);

  return (
    <>
      <div className="newgame-container fade-in">
        <header className="newgame-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('newgame.title')}</h1>
        </header>

        <form onSubmit={handleSubmit} className="newgame-form">
          {/* Game Selection */}
          <div className="form-group">
            <label htmlFor="game">{t('newgame.gameName')}</label>
            <div className="input-with-suggestions">
              <input
                id="game"
                type="text"
                placeholder={t('newgame.selectGame')}
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
                      {suggestions.gamesFromLib?.has(game.toLowerCase()) && (
                        <span className="suggestion-lib-badge" title={t('newgame.fromLibrary')}>
                          📚
                        </span>
                      )}
                      {game}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.game && (
              <div className="selected-item">✓ {formData.game}</div>
            )}
          </div>

          {/* Game Type Selection */}
          {formData.game && (
            <div className="form-group">
              <label>{t('newgame.gameType')}</label>
              <div className="game-type-buttons">
                <button
                  type="button"
                  className={`game-type-btn ${formData.gameType === 'competitive' ? 'selected' : ''}`}
                  onClick={() => handleGameTypeSelect('competitive')}
                >
                  <span className="game-type-icon">⚔️</span>
                  <span className="game-type-label">{t('newgame.typeCompetitive')}</span>
                  <span className="game-type-desc">{t('newgame.typeCompetitiveDesc')}</span>
                </button>
                <button
                  type="button"
                  className={`game-type-btn ${formData.gameType === 'cooperative' ? 'selected' : ''}`}
                  onClick={() => handleGameTypeSelect('cooperative')}
                >
                  <span className="game-type-icon">🤝</span>
                  <span className="game-type-label">{t('newgame.typeCooperative')}</span>
                  <span className="game-type-desc">{t('newgame.typeCooperativeDesc')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Players */}
          {formData.gameType && (
            <div className="form-group">
              <label htmlFor="player">{t('newgame.players')}</label>
              <div className="input-with-suggestions">
                <input
                  id="player"
                  type="text"
                  placeholder={t('newgame.playersPlaceholder')}
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
                          <span className="player-name">
                            {player}
                            {player === mainPlayer && (
                              <span className="you-badge">{t('newgame.you')}</span>
                            )}
                          </span>
                          {formData.gameType === 'competitive' && (
                            <input
                              type="number"
                              className="player-points"
                              placeholder="Pts"
                              value={formData.points[index]}
                              onChange={(e) => handlePointChange(index, e.target.value)}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => handleRemovePlayer(index)}
                          title={t('newgame.removePlayer')}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Competitive: select winner */}
                  {formData.gameType === 'competitive' && (
                    <div className="winner-section">
                      <label>{t('newgame.selectWinner')}</label>
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
                  )}

                  {/* Cooperative: win or loss */}
                  {formData.gameType === 'cooperative' && (
                    <div className="coop-result-section">
                      <label>{t('newgame.teamResult')}</label>
                      <div className="coop-result-buttons">
                        <button
                          type="button"
                          className={`coop-result-btn win ${formData.coopResult === 'win' ? 'selected' : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, coopResult: 'win' }))}
                        >
                          <span>🏆</span>
                          <span>{t('history.coopWin')}</span>
                          <span className="coop-result-sub">{t('newgame.coopWinSub')}</span>
                        </button>
                        <button
                          type="button"
                          className={`coop-result-btn loss ${formData.coopResult === 'loss' ? 'selected' : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, coopResult: 'loss' }))}
                        >
                          <span>💀</span>
                          <span>{t('history.coopLoss')}</span>
                          <span className="coop-result-sub">{t('newgame.coopLossSub')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date */}
          {formData.players.length > 0 && (
            <div className="form-group">
              <label htmlFor="date">{t('history.date')}</label>
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
              <label>{t('newgame.duration')}</label>
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
                  placeholder={t('newgame.durationOther')}
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
            ✓ {t('newgame.register')}
          </Button>
        </form>
      </div>
    </>
  );
};
