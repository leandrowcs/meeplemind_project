import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  BookOpen,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Dices,
  Gamepad,
  Handshake,
  Search,
  Skull,
  Sword,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../hooks/useLanguage';
import { GAME_THEMES, GAME_MECHANICS, GAME_CATEGORIES } from '../utils/classifications';
import './NewGame.css';

const TOTAL_STEPS = 5;

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_PROXY_BASE = import.meta.env.DEV ? '/bggapi' : BGG_BASE;

const bggUrl = (path) => BGG_PROXY_BASE + path;

const fetchBGGXml = async (url, maxRetries = 4) => {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const res = await fetch(url, { credentials: 'omit' });
    if (res.status === 202 || res.status === 401) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`BGG ${res.status}`);
    return res.text();
  }

  throw new Error('BGG timeout');
};

const parseBGGSearchNames = (xmlText, limit = 8) => {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  const uniqueNames = new Set();
  const names = [];

  for (const item of items) {
    const primaryName = item.querySelector('name[type="primary"]')?.getAttribute('value');
    const fallbackName = item.querySelector('name')?.getAttribute('value');
    const cleanName = (primaryName || fallbackName || '').trim();
    const key = cleanName.toLowerCase();

    if (!cleanName || uniqueNames.has(key)) continue;
    uniqueNames.add(key);
    names.push(cleanName);

    if (names.length >= limit) break;
  }

  return names;
};

const getDurationLabel = (minutes, t) => {
  if (!minutes) return t('newgame.summaryDurationUnknown');
  return `${minutes}${t('newgame.minutesShort')}`;
};

export const NewGame = ({ onNavigate, onSave, uniqueGames, uniquePlayers, mainPlayer, libraryGames = [], libraryEntries = [] }) => {
  const { t } = useLanguage();
  const initialDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [stepIndex, setStepIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState('forward');
  const [formData, setFormData] = useState(() => ({
    game: '',
    gameType: '',
    players: mainPlayer ? [mainPlayer] : [],
    points: mainPlayer ? [0] : [],
    winner: '',
    coopResult: '',
    duration: '',
    date: initialDate,
    ownGame: false,
    themes: [],
    mechanics: [],
    gameCategories: [],
  }));

  const [suggestions, setSuggestions] = useState({
    games: [],
    gamesFromLib: new Set(),
    players: [],
  });

  const [inputValues, setInputValues] = useState({
    game: '',
    newPlayer: '',
  });

  const [bggSearch, setBggSearch] = useState({
    loading: false,
    results: [],
    error: '',
  });

  const safeUniqueGames = useMemo(
    () => (Array.isArray(uniqueGames) ? uniqueGames : []),
    [uniqueGames]
  );
  const safeUniquePlayers = useMemo(
    () => (Array.isArray(uniquePlayers) ? uniquePlayers : []),
    [uniquePlayers]
  );
  const safeLibraryGames = useMemo(
    () => (Array.isArray(libraryGames) ? libraryGames : []),
    [libraryGames]
  );
  const safeLibraryEntries = useMemo(
    () => (Array.isArray(libraryEntries) ? libraryEntries : []),
    [libraryEntries]
  );

  const classificationByGameName = useMemo(() => {
    const themeSet = new Set(GAME_THEMES);
    const mechanicSet = new Set(GAME_MECHANICS);
    const gameCategorySet = new Set(GAME_CATEGORIES);
    const map = new Map();

    safeLibraryEntries.forEach((entry) => {
      const key = (entry?.name || '').trim().toLowerCase();
      if (!key) return;

      map.set(key, {
        themes: Array.isArray(entry?.themes)
          ? entry.themes.filter((value) => themeSet.has(value)).slice(0, 16)
          : [],
        mechanics: Array.isArray(entry?.sessionMechanics)
          ? entry.sessionMechanics.filter((value) => mechanicSet.has(value)).slice(0, 16)
          : [],
        gameCategories: Array.isArray(entry?.sessionGameCategories)
          ? entry.sessionGameCategories.filter((value) => gameCategorySet.has(value)).slice(0, 10)
          : [],
      });
    });

    return map;
  }, [safeLibraryEntries]);

  const steps = useMemo(
    () => [
      {
        title: t('newgame.stepGameTitle'),
        description: t('newgame.stepGameDesc'),
        short: t('newgame.stepGameShort'),
      },
      {
        title: t('newgame.stepPlayersTitle'),
        description: t('newgame.stepPlayersDesc'),
        short: t('newgame.stepPlayersShort'),
      },
      {
        title: t('newgame.stepResultTitle'),
        description: t('newgame.stepResultDesc'),
        short: t('newgame.stepResultShort'),
      },
      {
        title: t('newgame.stepMetaTitle'),
        description: t('newgame.stepMetaDesc'),
        short: t('newgame.stepMetaShort'),
      },
      {
        title: t('newgame.stepReviewTitle'),
        description: t('newgame.stepReviewDesc'),
        short: t('newgame.stepReviewShort'),
      },
    ],
    [t]
  );

  const completionByStep = useMemo(() => {
    const hasGame = Boolean(formData.game.trim());
    const hasPlayers = formData.players.length >= 2;
    const hasResult = Boolean(formData.gameType)
      && (formData.gameType === 'competitive' ? Boolean(formData.winner) : Boolean(formData.coopResult));
    const hasMeta = Boolean(formData.date);

    return [
      hasGame,
      hasPlayers,
      hasResult,
      hasMeta,
      hasGame && hasPlayers && hasResult && hasMeta,
    ];
  }, [formData]);

  const isValid = completionByStep[4];
  const currentStep = steps[stepIndex];
  const progressPercent = ((stepIndex + 1) / TOTAL_STEPS) * 100;

  const filteredLibraryGames = useMemo(() => {
    const term = inputValues.game.trim().toLowerCase();
    const base = term
      ? safeLibraryGames.filter((gameName) => gameName.toLowerCase().includes(term))
      : safeLibraryGames;
    return base.slice(0, 20);
  }, [inputValues.game, safeLibraryGames]);

  const knownPlayersToSuggest = useMemo(() => {
    return safeUniquePlayers
      .filter((player) => !formData.players.includes(player))
      .slice(0, 24);
  }, [safeUniquePlayers, formData.players]);

  const formatTemplate = useCallback((key, replacements = {}) => {
    let text = t(key);
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replaceAll(`{${placeholder}}`, String(value));
    });
    return text;
  }, [t]);

  const handleGameInputChange = (event) => {
    const value = event.target.value;
    setInputValues((prev) => ({ ...prev, game: value }));
    const inherited = classificationByGameName.get(value.trim().toLowerCase()) || {
      themes: [],
      mechanics: [],
      gameCategories: [],
    };
    setFormData((prev) => ({
      ...prev,
      game: value,
      themes: inherited.themes,
      mechanics: inherited.mechanics,
      gameCategories: inherited.gameCategories,
    }));
    setBggSearch((prev) => ({ ...prev, error: '' }));

    if (!value.length) {
      setSuggestions((prev) => ({ ...prev, games: [], gamesFromLib: new Set() }));
      return;
    }

    const lower = value.toLowerCase();
    const fromLib = safeLibraryGames.filter((gameName) =>
      gameName.toLowerCase().includes(lower)
    );
    const fromHistory = safeUniqueGames.filter(
      (gameName) => gameName.toLowerCase().includes(lower)
        && !safeLibraryGames.some((libName) => libName.toLowerCase() === gameName.toLowerCase())
    );

    setSuggestions((prev) => ({
      ...prev,
      games: [...fromLib, ...fromHistory],
      gamesFromLib: new Set(fromLib.map((name) => name.toLowerCase())),
    }));
  };

  const handleSelectGame = (gameName) => {
    const inherited = classificationByGameName.get(gameName.trim().toLowerCase()) || {
      themes: [],
      mechanics: [],
      gameCategories: [],
    };
    setFormData((prev) => ({
      ...prev,
      game: gameName,
      themes: inherited.themes,
      mechanics: inherited.mechanics,
      gameCategories: inherited.gameCategories,
    }));
    setInputValues((prev) => ({ ...prev, game: gameName }));
    setSuggestions((prev) => ({ ...prev, games: [] }));
    setBggSearch((prev) => ({ ...prev, error: '' }));
  };

  const handleSearchBGG = async () => {
    const term = inputValues.game.trim();
    if (!term) return;

    setBggSearch({ loading: true, results: [], error: '' });

    try {
      const xmlText = await fetchBGGXml(
        bggUrl(`/search?query=${encodeURIComponent(term)}&type=boardgame`)
      );
      const names = parseBGGSearchNames(xmlText);

      if (!names.length) {
        setBggSearch({ loading: false, results: [], error: t('library.bggNotFound') });
        return;
      }

      setBggSearch({ loading: false, results: names, error: '' });
    } catch {
      setBggSearch({ loading: false, results: [], error: t('library.bggError') });
    }
  };

  const handlePlayerInputChange = (event) => {
    const value = event.target.value;
    setInputValues((prev) => ({ ...prev, newPlayer: value }));

    if (!value.length) {
      setSuggestions((prev) => ({ ...prev, players: [] }));
      return;
    }

    const filtered = safeUniquePlayers.filter(
      (player) => player.toLowerCase().includes(value.toLowerCase())
        && !formData.players.includes(player)
    );
    setSuggestions((prev) => ({ ...prev, players: filtered }));
  };

  const handleAddPlayer = (playerName = null) => {
    const nextPlayer = (playerName || inputValues.newPlayer).trim();
    if (!nextPlayer || formData.players.includes(nextPlayer)) return;

    setFormData((prev) => ({
      ...prev,
      players: [...prev.players, nextPlayer],
      points: [...prev.points, 0],
    }));
    setInputValues((prev) => ({ ...prev, newPlayer: '' }));
    setSuggestions((prev) => ({ ...prev, players: [] }));
  };

  const handleRemovePlayer = (index) => {
    const player = formData.players[index];
    if (!player || player === mainPlayer) return;

    setFormData((prev) => ({
      ...prev,
      players: prev.players.filter((_, idx) => idx !== index),
      points: prev.points.filter((_, idx) => idx !== index),
      winner: prev.winner === player ? '' : prev.winner,
    }));
  };

  const handlePointChange = (index, value) => {
    const points = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(points) ? 0 : points;
    setFormData((prev) => {
      const nextPoints = [...prev.points];
      nextPoints[index] = safeValue;
      return { ...prev, points: nextPoints };
    });
  };

  const handleSetDuration = (value) => {
    if (value === '') {
      setFormData((prev) => ({ ...prev, duration: '' }));
      return;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setFormData((prev) => ({ ...prev, duration: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, duration: parsed }));
  };

  const handleGameTypeSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      gameType: type,
      winner: '',
      coopResult: '',
    }));
  };

  const showValidationAlert = (invalidStep) => {
    if (invalidStep === 0) {
      alert(t('newgame.errorGame'));
      return;
    }

    if (invalidStep === 1) {
      alert(t('newgame.errorMinPlayers'));
      return;
    }

    if (invalidStep === 2) {
      if (!formData.gameType) {
        alert(t('newgame.errorGameType'));
        return;
      }
      if (formData.gameType === 'competitive' && !formData.winner) {
        alert(t('newgame.errorWinner'));
        return;
      }
      alert(t('newgame.errorCoopResult'));
      return;
    }

    if (invalidStep === 3) {
      alert(t('newgame.errorDate'));
    }
  };

  const handleNextStep = () => {
    if (stepIndex >= TOTAL_STEPS - 1) return;
    if (!completionByStep[stepIndex]) {
      showValidationAlert(stepIndex);
      return;
    }
    setStepDirection('forward');
    setStepIndex((prev) => prev + 1);
  };

  const handlePreviousStep = () => {
    if (stepIndex <= 0) return;
    setStepDirection('backward');
    setStepIndex((prev) => prev - 1);
  };

  const handleSubmit = (event) => {
    event?.preventDefault();

    if (!formData.game.trim()) {
      alert(t('newgame.errorGame'));
      return;
    }
    if (formData.players.length < 2) {
      alert(t('newgame.errorMinPlayers'));
      return;
    }
    if (!formData.gameType) {
      alert(t('newgame.errorGameType'));
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
    if (!formData.date) {
      alert(t('newgame.errorDate'));
      return;
    }

    const inherited = classificationByGameName.get(formData.game.trim().toLowerCase());
    const themes = inherited?.themes ?? formData.themes ?? [];
    const mechanics = inherited?.mechanics ?? formData.mechanics ?? [];
    const gameCategories = inherited?.gameCategories ?? formData.gameCategories ?? [];

    onSave({
      game: formData.game,
      gameType: formData.gameType,
      players: formData.players,
      points: formData.points,
      winner: formData.gameType === 'competitive' ? formData.winner : null,
      coopResult: formData.gameType === 'cooperative' ? formData.coopResult : null,
      duration: formData.duration ? Number.parseInt(formData.duration, 10) : null,
      date: formData.date,
      ownGame: formData.ownGame,
      themes,
      mechanics,
      gameCategories,
    });

    onNavigate('home');
  };

  const renderStepGame = () => (
    <>
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
              {suggestions.games.map((gameName) => (
                <button
                  key={gameName}
                  type="button"
                  className="suggestion-item"
                  onClick={() => handleSelectGame(gameName)}
                >
                  {suggestions.gamesFromLib.has(gameName.toLowerCase()) && (
                    <span className="suggestion-lib-badge" title={t('newgame.fromLibrary')}>
                      <Gamepad size={14} />
                    </span>
                  )}
                  {gameName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-inline-actions">
          <button
            type="button"
            className="inline-action-btn"
            onClick={handleSearchBGG}
            disabled={!inputValues.game.trim() || bggSearch.loading}
          >
            <Search size={14} />
            {bggSearch.loading ? t('library.bggSearching') : t('library.bggSearch')}
          </button>
        </div>

        {bggSearch.error && (
          <p className="form-message error">{bggSearch.error}</p>
        )}

        {bggSearch.results.length > 0 && (
          <div className="chip-group">
            <p className="chip-group-title">{t('newgame.bggResultsTitle')}</p>
            <div className="chip-grid">
              {bggSearch.results.map((gameName) => (
                <button
                  key={`bgg-${gameName}`}
                  type="button"
                  className="chip-btn"
                  onClick={() => handleSelectGame(gameName)}
                >
                  {gameName}
                </button>
              ))}
            </div>
          </div>
        )}

        {formData.game && (
          <div className="selected-item"><Check size={14} /> {formData.game}</div>
        )}
      </div>

      <div className="chip-group">
        <p className="chip-group-title">{t('newgame.libraryListTitle')}</p>
        {filteredLibraryGames.length > 0 ? (
          <div className="chip-grid">
            {filteredLibraryGames.map((gameName) => (
              <button
                key={`lib-${gameName}`}
                type="button"
                className={`chip-btn ${formData.game === gameName ? 'selected' : ''}`}
                onClick={() => handleSelectGame(gameName)}
              >
                <Gamepad size={14} /> {gameName}
              </button>
            ))}
          </div>
        ) : (
          <p className="form-message">{t('newgame.libraryEmpty')}</p>
        )}
      </div>

      <div className="form-group own-game-group">
        <label className="own-game-label">
          <input
            type="checkbox"
            checked={formData.ownGame}
            onChange={(event) => setFormData((prev) => ({ ...prev, ownGame: event.target.checked }))}
            className="own-game-checkbox"
          />
          <Gamepad size={15} />
          {t('newgame.ownGame')}
        </label>
      </div>
    </>
  );

  const renderStepPlayers = () => (
    <>
      <div className="chip-group">
        <p className="chip-group-title">{t('newgame.playersPlayedWithYou')}</p>
        {knownPlayersToSuggest.length > 0 ? (
          <div className="chip-grid">
            {knownPlayersToSuggest.map((playerName) => (
              <button
                key={playerName}
                type="button"
                className="chip-btn"
                onClick={() => handleAddPlayer(playerName)}
              >
                {playerName}
              </button>
            ))}
          </div>
        ) : (
          <p className="form-message">{t('newgame.noKnownPlayers')}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="player">{t('newgame.players')}</label>
        <div className="input-with-suggestions">
          <input
            id="player"
            type="text"
            placeholder={t('newgame.playersPlaceholder')}
            value={inputValues.newPlayer}
            onChange={handlePlayerInputChange}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              handleAddPlayer();
            }}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn-add-player"
            onClick={() => handleAddPlayer()}
            disabled={!inputValues.newPlayer.trim()}
          >
            <UserPlus size={16} />
          </button>
          {suggestions.players.length > 0 && (
            <div className="suggestions-list">
              {suggestions.players.map((playerName) => (
                <button
                  key={playerName}
                  type="button"
                  className="suggestion-item"
                  onClick={() => handleAddPlayer(playerName)}
                >
                  {playerName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <p className="chip-group-title">{t('newgame.selectedPlayers')}</p>
        <div className="players-list">
          {formData.players.map((playerName, index) => (
            <div key={`${playerName}-${index}`} className="player-item">
              <div className="player-name-wrap">
                <span className="player-name">
                  {playerName}
                  {playerName === mainPlayer && (
                    <span className="you-badge">{t('newgame.you')}</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="btn-remove"
                onClick={() => handleRemovePlayer(index)}
                disabled={playerName === mainPlayer}
                title={t('newgame.removePlayer')}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderStepResult = () => (
    <>
      <div className="form-group">
        <label>{t('newgame.gameType')}</label>
        <div className="game-type-buttons">
          <button
            type="button"
            className={`game-type-btn ${formData.gameType === 'competitive' ? 'selected' : ''}`}
            onClick={() => handleGameTypeSelect('competitive')}
          >
            <span className="game-type-icon"><Sword size={18} /></span>
            <span className="game-type-label">{t('newgame.typeCompetitive')}</span>
            <span className="game-type-desc">{t('newgame.typeCompetitiveDesc')}</span>
          </button>
          <button
            type="button"
            className={`game-type-btn ${formData.gameType === 'cooperative' ? 'selected' : ''}`}
            onClick={() => handleGameTypeSelect('cooperative')}
          >
            <span className="game-type-icon"><Handshake size={18} /></span>
            <span className="game-type-label">{t('newgame.typeCooperative')}</span>
            <span className="game-type-desc">{t('newgame.typeCooperativeDesc')}</span>
          </button>
        </div>
      </div>

      {formData.gameType === 'competitive' && (
        <div className="result-block">
          <p className="form-message">{t('newgame.stepResultCompetitiveHint')}</p>
          <div className="scoreboard-list">
            {formData.players.map((playerName, index) => (
              <div
                key={`${playerName}-score`}
                className={`score-row ${formData.winner === playerName ? 'winner' : ''}`}
              >
                <span className="score-player-name">
                  {playerName}
                  {playerName === mainPlayer && <span className="you-badge">{t('newgame.you')}</span>}
                </span>
                <input
                  type="number"
                  className="score-input"
                  value={formData.points[index]}
                  onChange={(event) => handlePointChange(index, event.target.value)}
                  aria-label={`${t('newgame.pointsLabel')} ${playerName}`}
                />
                <button
                  type="button"
                  className={`winner-crown ${formData.winner === playerName ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, winner: playerName }))}
                  aria-label={formatTemplate('newgame.selectWinnerFor', { player: playerName })}
                >
                  <Crown size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.gameType === 'cooperative' && (
        <div className="coop-result-section">
          <label>{t('newgame.teamResult')}</label>
          <div className="coop-result-buttons">
            <button
              type="button"
              className={`coop-result-btn win ${formData.coopResult === 'win' ? 'selected' : ''}`}
              onClick={() => setFormData((prev) => ({ ...prev, coopResult: 'win' }))}
            >
              <span><Trophy size={16} /></span>
              <span>{t('history.coopWin')}</span>
              <span className="coop-result-sub">{t('newgame.coopWinSub')}</span>
            </button>
            <button
              type="button"
              className={`coop-result-btn loss ${formData.coopResult === 'loss' ? 'selected' : ''}`}
              onClick={() => setFormData((prev) => ({ ...prev, coopResult: 'loss' }))}
            >
              <span><Skull size={16} /></span>
              <span>{t('history.coopLoss')}</span>
              <span className="coop-result-sub">{t('newgame.coopLossSub')}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderStepMeta = () => (
    <>
      <div className="form-group">
        <label htmlFor="date">{t('history.date')}</label>
        <input
          id="date"
          type="date"
          value={formData.date}
          onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
          className="date-input"
        />
      </div>

      <div className="form-group">
        <label>{t('newgame.duration')}</label>
        <div className="duration-buttons">
          {[30, 60, 90, 120, 180, 240].map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`duration-btn ${formData.duration === minutes ? 'selected' : ''}`}
              onClick={() => handleSetDuration(minutes)}
            >
              {minutes}{t('newgame.minutesShort')}
            </button>
          ))}
          <input
            type="number"
            className="duration-input"
            placeholder={t('newgame.durationOther')}
            value={formData.duration || ''}
            onChange={(event) => handleSetDuration(event.target.value)}
            max="999"
            min="1"
          />
        </div>
      </div>
    </>
  );

  const renderStepReview = () => (
    <div className="review-summary">
      <div className="summary-item">
        <span>{t('newgame.summaryGame')}</span>
        <strong>{formData.game || '—'}</strong>
      </div>
      <div className="summary-item">
        <span>{t('newgame.summaryType')}</span>
        <strong>
          {formData.gameType === 'competitive'
            ? t('newgame.typeCompetitive')
            : t('newgame.typeCooperative')}
        </strong>
      </div>
      <div className="summary-item">
        <span>{t('newgame.summaryPlayers')}</span>
        <strong>{formData.players.join(', ')}</strong>
      </div>
      <div className="summary-item">
        <span>{t('newgame.summaryResult')}</span>
        <strong>
          {formData.gameType === 'competitive'
            ? formData.winner || '—'
            : formData.coopResult === 'win'
              ? t('history.coopWin')
              : t('history.coopLoss')}
        </strong>
      </div>
      {formData.gameType === 'competitive' && (
        <div className="summary-item full">
          <span>{t('newgame.pointsLabel')}</span>
          <ul className="score-summary-list">
            {formData.players.map((playerName, index) => (
              <li key={`${playerName}-summary`}>
                <span>{playerName}</span>
                <strong>
                  {formData.points[index] ?? 0} {t('newgame.pointsShort')}
                  {formData.winner === playerName && (
                    <span className="summary-crown"><Crown size={13} /></span>
                  )}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="summary-item">
        <span>{t('newgame.summaryDate')}</span>
        <strong>{formData.date}</strong>
      </div>
      <div className="summary-item">
        <span>{t('newgame.summaryDuration')}</span>
        <strong>{getDurationLabel(formData.duration, t)}</strong>
      </div>
      <div className="summary-item">
        <span>{t('newgame.summaryOwnGame')}</span>
        <strong>{formData.ownGame ? t('newgame.summaryOwnGameYes') : t('newgame.summaryOwnGameNo')}</strong>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (stepIndex === 0) return renderStepGame();
    if (stepIndex === 1) return renderStepPlayers();
    if (stepIndex === 2) return renderStepResult();
    if (stepIndex === 3) return renderStepMeta();
    return renderStepReview();
  };

  return (
    <div className="newgame-container fade-in">
      <header className="newgame-header">
        <button className="back-btn" onClick={() => onNavigate('home')}>
          {t('common.back')}
        </button>
        <h1>{t('newgame.title')}</h1>
      </header>

      <form onSubmit={handleSubmit} className="newgame-form">
        <section className="wizard-progress" aria-label={t('newgame.progressAriaLabel')}>
          <div className="wizard-progress-top">
            <strong>{currentStep.title}</strong>
            <span>
              {formatTemplate('newgame.progressLabel', {
                current: stepIndex + 1,
                total: TOTAL_STEPS,
              })}
            </span>
          </div>
          <div className="wizard-progress-track">
            <span className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="wizard-step-pills" aria-hidden>
            {steps.map((step, index) => (
              <span
                key={step.short}
                className={`wizard-step-pill ${index === stepIndex ? 'active' : ''} ${completionByStep[index] ? 'done' : ''}`}
              >
                {index + 1}. {step.short}
              </span>
            ))}
          </div>
        </section>

        <section className="wizard-card" data-step-index={stepIndex + 1}>
          <h2><Gamepad size={16} /> {currentStep.title}</h2>
          <p className="wizard-step-description">{currentStep.description}</p>
          <div key={`step-${stepIndex}`} className={`wizard-step-frame ${stepDirection}`}>
            {renderStepContent()}
          </div>
        </section>

        <div className="wizard-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreviousStep}
            disabled={stepIndex === 0}
          >
            <ChevronLeft size={16} /> {t('newgame.previous')}
          </Button>

          {stepIndex < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              variant="accent"
              onClick={handleNextStep}
              disabled={!completionByStep[stepIndex]}
              className="newgame-next-btn"
              data-testid="newgame-next-step"
            >
              {t('newgame.next')} <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              disabled={!isValid}
              className="newgame-submit-btn"
              data-testid="newgame-submit"
              onClick={handleSubmit}
            >
              <Check size={16} /> {t('newgame.confirm')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};