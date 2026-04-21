import { useState, useCallback } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  Dices,
  Gamepad2,
  LoaderCircle,
  Pencil,
  Search,
  Star,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { GAME_CATEGORIES } from '../hooks/useLibrary';
import './Library.css';

// ──────────────────────────────────────────────────
// BoardGameGeek XML API v2 helpers (gratuita, sem chave)
// https://boardgamegeek.com/wiki/page/BGG_XML_API2
// Roteado via corsproxy.io para contornar restrições CORS do navegador
// ──────────────────────────────────────────────────
const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
// Em desenvolvimento: usa proxy do Vite (/bggapi → boardgamegeek.com/xmlapi2)
// Em produção: chama a API diretamente (requer CORS habilitado no servidor de hospedagem)
const BGG_PROXY_BASE = import.meta.env.DEV ? '/bggapi' : BGG_BASE;

function bggUrl(path) {
  return BGG_PROXY_BASE + path;
}

function decodeHtmlEntities(str) {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
}

function cleanBGGDescription(raw, maxLen = 500) {
  const decoded = decodeHtmlEntities(raw);
  const clean = decoded.replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.lastIndexOf(' ', maxLen);
  return clean.slice(0, cut > 0 ? cut : maxLen) + '\u2026';
}

async function fetchBGGXml(url, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url);
    // corsproxy repassa status 202 da BGG (cache miss — tentar novamente)
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`BGG ${res.status}`);
    return res.text();
  }
  throw new Error('BGG timeout');
}

async function searchBGGId(gameName) {
  // Tenta match exato primeiro, depois busca livre (mais resultados)
  for (const exact of [true, false]) {
    const path =
      `/search?query=${encodeURIComponent(gameName)}&type=boardgame` +
      (exact ? '&exact=1' : '');
    const xml = await fetchBGGXml(bggUrl(path));
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const item = doc.querySelector('item');
    if (item) return item.getAttribute('id');
  }
  return null;
}

async function fetchBGGData(gameName) {
  const id = await searchBGGId(gameName.trim());
  if (!id) return null;
  const xml = await fetchBGGXml(bggUrl(`/thing?id=${id}`));
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const item = doc.querySelector('item');
  if (!item) return null;
  return {
    thumbnail: (item.querySelector('thumbnail')?.textContent || '').trim(),
    description: cleanBGGDescription(item.querySelector('description')?.textContent || ''),
    minPlayers: item.querySelector('minplayers')?.getAttribute('value') || '',
    maxPlayers: item.querySelector('maxplayers')?.getAttribute('value') || '',
  };
}

const EMPTY_FORM = {
  name: '',
  category: '',
  minPlayers: '',
  maxPlayers: '',
  description: '',
  coverUrl: '',
};

// ──────────────────────────────────────────────────
// SVG placeholder shown when a game has no cover
// ──────────────────────────────────────────────────
const BoardgamePlaceholder = () => (
  <svg
    className="lib-cover-placeholder-svg"
    viewBox="0 0 200 280"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="200" height="280" rx="12" fill="#1e293b" />
    <rect x="16" y="16" width="168" height="248" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
    {/* Board grid */}
    <g stroke="#1e3a5f" strokeWidth="1">
      {[48, 80, 112, 144, 176, 208].map((y) => (
        <line key={`h${y}`} x1="24" y1={y} x2="176" y2={y} />
      ))}
      {[48, 80, 112, 144].map((x) => (
        <line key={`v${x}`} x1={x} y1="40" x2={x} y2="220" />
      ))}
    </g>
    {/* Meeple silhouette */}
    <g fill="#3b82f6" opacity="0.7">
      <circle cx="100" cy="100" r="18" />
      <ellipse cx="100" cy="130" rx="22" ry="28" />
      <ellipse cx="76" cy="120" rx="10" ry="6" transform="rotate(-30 76 120)" />
      <ellipse cx="124" cy="120" rx="10" ry="6" transform="rotate(30 124 120)" />
      <ellipse cx="84" cy="158" rx="9" ry="14" transform="rotate(10 84 158)" />
      <ellipse cx="116" cy="158" rx="9" ry="14" transform="rotate(-10 116 158)" />
    </g>
    {/* Accent dots */}
    {[[40, 40], [160, 40], [100, 230]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="4" fill="#f59e0b" opacity="0.6" />
    ))}
    {/* Label */}
    <text x="100" y="255" textAnchor="middle" fontSize="9" fill="#475569" fontFamily="sans-serif">
      BOARD GAME
    </text>
  </svg>
);

// ──────────────────────────────────────────────────
// Stats derived from session history
// ──────────────────────────────────────────────────
function computeGameStats(gameName, games) {
  const sessions = games.filter(
    (g) => g.game?.toLowerCase() === gameName.toLowerCase()
  );
  const timesPlayed = sessions.length;

  const allPlayers = new Set();
  sessions.forEach((s) => s.players?.forEach((p) => allPlayers.add(p)));

  const winnerCounts = {};
  sessions.forEach((s) => {
    if (s.winner) winnerCounts[s.winner] = (winnerCounts[s.winner] || 0) + 1;
  });
  const topWinner = Object.keys(winnerCounts).sort(
    (a, b) => winnerCounts[b] - winnerCounts[a]
  )[0] || null;

  const dates = sessions.map((s) => s.date).filter(Boolean).sort();
  const lastPlayed = dates[dates.length - 1] || null;

  return {
    timesPlayed,
    players: [...allPlayers],
    topWinner,
    topWinnerCount: topWinner ? winnerCounts[topWinner] : 0,
    lastPlayed,
  };
}

// ──────────────────────────────────────────────────
// Game Details Modal
// ──────────────────────────────────────────────────
function GameDetailsModal({ game, stats, t, language, onClose, onEdit }) {
  const [imgError, setImgError] = useState(false);
  const catMeta = GAME_CATEGORIES.find((c) => c.value === game.category);

  const formatLastPlayed = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat(language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const winsLabel = (n) =>
    n === 1 ? `1 ${t('library.win')}` : `${n} ${t('library.wins')}`;

  return (
    <div className="modal-overlay lib-details-overlay" onClick={onClose}>
      <div
        className="modal-content lib-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        {/* Cover */}
        <div className="lib-details-cover">
          {game.coverUrl && !imgError ? (
            <img
              src={game.coverUrl}
              alt={game.name}
              className="lib-cover-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <BoardgamePlaceholder />
          )}
        </div>

        {/* Info */}
        <div className="lib-details-body">
          <div className="lib-details-name-row">
            <h2 className="lib-details-name">{game.name}</h2>
            {game.owned && (
              <span className="lib-badge lib-badge-owned"><Star size={14} /> {t('library.owned')}</span>
            )}
          </div>

          <div className="lib-details-badges">
            {catMeta && (
              <span className="lib-badge lib-badge-cat">{t(catMeta.label)}</span>
            )}
            {(game.minPlayers || game.maxPlayers) && (
              <span className="lib-badge">
                <Users size={14} /> {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
              </span>
            )}
          </div>

          {game.description && (
            <p className="lib-details-description">{game.description}</p>
          )}

          {/* Play stats */}
          <div className="lib-details-section-title">{t('library.statsSection')}</div>
          <div className="lib-details-stats">
            {stats.timesPlayed === 0 ? (
              <p className="lib-details-never-played">{t('library.neverPlayed')}</p>
            ) : (
              <>
                <div className="lib-stat-row">
                  <span className="lib-stat-icon"><Gamepad2 size={14} /></span>
                  <span className="lib-stat-value">
                    <strong>{stats.timesPlayed}</strong> {t('library.timesPlayed')}
                  </span>
                </div>

                {stats.lastPlayed && (
                  <div className="lib-stat-row">
                    <span className="lib-stat-icon"><CalendarDays size={14} /></span>
                    <span className="lib-stat-value">
                      <strong>{t('library.lastPlayed')}:</strong>{' '}
                      {formatLastPlayed(stats.lastPlayed)}
                    </span>
                  </div>
                )}

                {stats.players.length > 0 && (
                  <div className="lib-stat-row lib-stat-players-row">
                    <span className="lib-stat-icon"><Users size={14} /></span>
                    <div className="lib-stat-players">
                      <span className="lib-stat-label">{t('library.playersLabel')}:</span>
                      <div className="lib-stat-player-chips">
                        {stats.players.map((p) => (
                          <span key={p} className="lib-player-chip">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {stats.topWinner ? (
                  <div className="lib-stat-row">
                    <span className="lib-stat-icon"><Trophy size={14} /></span>
                    <span className="lib-stat-value">
                      <strong>{t('library.topWinner')}:</strong>{' '}
                      {stats.topWinner}{' '}
                      <span className="lib-win-count">({winsLabel(stats.topWinnerCount)})</span>
                    </span>
                  </div>
                ) : (
                  <div className="lib-stat-row">
                    <span className="lib-stat-icon"><Trophy size={14} /></span>
                    <span className="lib-stat-value lib-stat-muted">{t('library.noWinner')}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lib-details-actions">
            <button className="btn-edit-details" onClick={onEdit}>
              <IconPencil /> {t('library.editGame')}
            </button>
            <button className="btn-close-details" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const IconPencil = () => (
  <Pencil size={16} />
);

const IconTrash = () => (
  <Trash2 size={16} />
);

// ──────────────────────────────────────────────────
// Main Library component
// ──────────────────────────────────────────────────
export const Library = ({ onNavigate, library, onAdd, onRemove, onUpdate, games }) => {
  const { language, t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingGame, setEditingGame] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  // BGG search status: 'idle' | 'loading' | 'found' | 'notfound' | 'error'
  const [bggStatus, setBggStatus] = useState('idle');
  const [bggEditStatus, setBggEditStatus] = useState('idle');

  // Build a play-count map from game session history
  const playCount = {};
  games.forEach((g) => {
    if (g.game) playCount[g.game] = (playCount[g.game] || 0) + 1;
  });

  const handleField = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleEditField = (key) => (e) =>
    setEditingGame((prev) => ({ ...prev, [key]: e.target.value }));

  const handleBGGSearch = async () => {
    const name = formData.name.trim();
    if (!name) return;
    setBggStatus('loading');
    try {
      const data = await fetchBGGData(name);
      if (!data) { setBggStatus('notfound'); return; }
      setFormData((prev) => ({
        ...prev,
        description: data.description || prev.description,
        coverUrl: data.thumbnail || prev.coverUrl,
        minPlayers: data.minPlayers || prev.minPlayers,
        maxPlayers: data.maxPlayers || prev.maxPlayers,
      }));
      setBggStatus('found');
    } catch {
      setBggStatus('error');
    }
  };

  const handleBGGEditSearch = async () => {
    const name = editingGame?.name?.trim();
    if (!name) return;
    setBggEditStatus('loading');
    try {
      const data = await fetchBGGData(name);
      if (!data) { setBggEditStatus('notfound'); return; }
      setEditingGame((prev) => ({
        ...prev,
        description: data.description || prev.description,
        coverUrl: data.thumbnail || prev.coverUrl,
        minPlayers: data.minPlayers || prev.minPlayers,
        maxPlayers: data.maxPlayers || prev.maxPlayers,
      }));
      setBggEditStatus('found');
    } catch {
      setBggEditStatus('error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return;
    onAdd({
      name,
      category: formData.category,
      minPlayers: formData.minPlayers ? parseInt(formData.minPlayers, 10) : null,
      maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers, 10) : null,
      description: formData.description,
      coverUrl: formData.coverUrl,
    });
    setFormData(EMPTY_FORM);
    setShowForm(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onUpdate(editingGame.id, {
      category: editingGame.category,
      minPlayers: editingGame.minPlayers ? parseInt(editingGame.minPlayers, 10) : null,
      maxPlayers: editingGame.maxPlayers ? parseInt(editingGame.maxPlayers, 10) : null,
      owned: editingGame.owned,
      description: editingGame.description,
      coverUrl: editingGame.coverUrl,
    });
    if (selectedGame?.id === editingGame.id) setSelectedGame({ ...editingGame });
    setEditingGame(null);
  };

  const openEdit = useCallback((game, e) => {
    e?.stopPropagation();
    setBggEditStatus('idle');
    setEditingGame({
      ...game,
      minPlayers: game.minPlayers ?? '',
      maxPlayers: game.maxPlayers ?? '',
      description: game.description ?? '',
      coverUrl: game.coverUrl ?? '',
    });
  }, []);

  const openDetails = useCallback((game) => {
    setSelectedGame(game);
  }, []);

  const handleRemove = useCallback((gameId, e) => {
    e?.stopPropagation();
    onRemove(gameId);
    if (selectedGame?.id === gameId) setSelectedGame(null);
  }, [onRemove, selectedGame]);

  return (
    <>
      <div className="library-container fade-in">
        <header className="library-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('library.title')}</h1>
          <span className="library-count">{library.length}</span>
        </header>

        <div className="library-content">
          {/* Add game button / form toggle */}
          <button
            className={`btn btn-accent btn-md ${showForm ? 'active' : ''}`}
            onClick={() => {
              setShowForm((v) => !v);
              setFormData(EMPTY_FORM);
            }}
          >
            {showForm ? <><X size={16} /> {t('common.cancel')}</> : <><BookOpen size={16} /> {t('library.addGame')}</>}
          </button>

          {/* Add game form */}
          {showForm && (
            <form className="library-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="lib-name">{t('library.gameName')}</label>
                <input
                  id="lib-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    handleField('name')(e);
                    setBggStatus('idle');
                  }}
                  placeholder={t('library.gameNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* BGG Auto-fill */}
              {formData.name.trim().length >= 2 && (
                <div className="lib-bgg-row">
                  <button
                    type="button"
                    className={`btn-bgg-search${bggStatus === 'loading' ? ' loading' : ''}`}
                    onClick={handleBGGSearch}
                    disabled={bggStatus === 'loading'}
                  >
                    {bggStatus === 'loading'
                      ? <><LoaderCircle size={14} /> {t('library.bggSearching')}</>
                      : <><Search size={14} /> {t('library.bggSearch')}</>}
                  </button>
                  {bggStatus === 'found' && (
                    <span className="lib-bgg-msg lib-bgg-success"><Check size={14} /> {t('library.bggFound')}</span>
                  )}
                  {bggStatus === 'notfound' && (
                    <span className="lib-bgg-msg lib-bgg-error">{t('library.bggNotFound')}</span>
                  )}
                  {bggStatus === 'error' && (
                    <span className="lib-bgg-msg lib-bgg-error">{t('library.bggError')}</span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="lib-category">{t('library.category')}</label>
                <select
                  id="lib-category"
                  value={formData.category}
                  onChange={handleField('category')}
                >
                  <option value="">{t('library.categoryNone')}</option>
                  {GAME_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {t(cat.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lib-min">{t('library.minPlayers')}</label>
                  <input
                    id="lib-min"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.minPlayers}
                    onChange={handleField('minPlayers')}
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lib-max">{t('library.maxPlayers')}</label>
                  <input
                    id="lib-max"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.maxPlayers}
                    onChange={handleField('maxPlayers')}
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lib-description">{t('library.description')}</label>
                <textarea
                  id="lib-description"
                  value={formData.description}
                  onChange={handleField('description')}
                  placeholder={t('library.descriptionPlaceholder')}
                  maxLength={500}
                  rows={3}
                  className="lib-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lib-cover">{t('library.coverUrl')}</label>
                <input
                  id="lib-cover"
                  type="url"
                  value={formData.coverUrl}
                  onChange={handleField('coverUrl')}
                  placeholder={t('library.coverUrlPlaceholder')}
                  maxLength={1000}
                />
                <span className="lib-field-hint">{t('library.coverUrlHint')}</span>
                {formData.coverUrl && (
                  <div className="lib-cover-preview-wrap">
                    <img
                      src={formData.coverUrl}
                      alt="preview"
                      className="lib-cover-preview"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save-lib">
                  {t('common.save')}
                </button>
              </div>
            </form>
          )}

          {/* Library list */}
          {library.length === 0 ? (
            <div className="library-empty">
              <span className="library-empty-icon"><BookOpen size={24} /></span>
              <p>{t('library.noGames')}</p>
            </div>
          ) : (
            <ul className="library-list">
              {library.map((game) => {
                const count = playCount[game.name] || 0;
                const catMeta = GAME_CATEGORIES.find(
                  (c) => c.value === game.category
                );
                return (
                  <li
                    key={game.id}
                    className="library-item library-item-clickable"
                    onClick={() => openDetails(game)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openDetails(game)}
                    aria-label={game.name}
                  >
                    {/* Thumbnail */}
                    <div className="lib-item-thumb">
                      {game.coverUrl ? (
                        <>
                          <img
                            src={game.coverUrl}
                            alt=""
                            className="lib-item-thumb-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="lib-item-thumb-fallback" style={{ display: 'none' }}>
                            <Dices size={18} />
                          </div>
                        </>
                      ) : (
                        <div className="lib-item-thumb-fallback"><Dices size={18} /></div>
                      )}
                    </div>

                    <div className="library-item-info">
                      <div className="library-item-name-row">
                        <span className="library-item-name">{game.name}</span>
                        {game.owned && (
                          <span className="lib-badge lib-badge-owned" title={t('library.ownedLabel')}>
                            <Star size={14} /> {t('library.owned')}
                          </span>
                        )}
                      </div>
                      <div className="library-item-badges">
                        {catMeta && (
                          <span className="lib-badge lib-badge-cat">
                            {t(catMeta.label)}
                          </span>
                        )}
                        {(game.minPlayers || game.maxPlayers) && (
                          <span className="lib-badge">
                            <Users size={14} /> {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="lib-badge lib-badge-plays">
                            <Gamepad2 size={14} /> {count}x
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="library-item-actions">
                      <button
                        className="btn-icon-lib btn-edit-lib"
                        onClick={(e) => openEdit(game, e)}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                      >
                        <IconPencil />
                      </button>
                      <button
                        className="btn-icon-lib btn-remove-lib"
                        onClick={(e) => handleRemove(game.id, e)}
                        title={t('library.remove')}
                        aria-label={t('library.remove')}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Game Details Modal */}
      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          stats={computeGameStats(selectedGame.name, games)}
          t={t}
          language={language}
          onClose={() => setSelectedGame(null)}
          onEdit={() => {
            openEdit(selectedGame);
            setSelectedGame(null);
          }}
        />
      )}

      {/* Edit modal */}
      {editingGame && (
        <div className="modal-overlay" onClick={() => setEditingGame(null)}>
          <div
            className="modal-content lib-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="lib-edit-title">{editingGame.name}</h2>
            <button
              className="modal-close"
              onClick={() => setEditingGame(null)}
              aria-label={t('common.cancel')}
            >
              ✕
            </button>
            <form onSubmit={handleEditSubmit} className="library-form lib-edit-form">

              {/* BGG Auto-fill */}
              <div className="lib-bgg-row">
                <button
                  type="button"
                  className={`btn-bgg-search${bggEditStatus === 'loading' ? ' loading' : ''}`}
                  onClick={handleBGGEditSearch}
                  disabled={bggEditStatus === 'loading'}
                >
                  {bggEditStatus === 'loading'
                    ? <><LoaderCircle size={14} /> {t('library.bggSearching')}</>
                    : <><Search size={14} /> {t('library.bggSearch')}</>}
                </button>
                {bggEditStatus === 'found' && (
                  <span className="lib-bgg-msg lib-bgg-success"><Check size={14} /> {t('library.bggFound')}</span>
                )}
                {bggEditStatus === 'notfound' && (
                  <span className="lib-bgg-msg lib-bgg-error">{t('library.bggNotFound')}</span>
                )}
                {bggEditStatus === 'error' && (
                  <span className="lib-bgg-msg lib-bgg-error">{t('library.bggError')}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-category">{t('library.category')}</label>
                <select
                  id="edit-category"
                  value={editingGame.category ?? ''}
                  onChange={handleEditField('category')}
                >
                  <option value="">{t('library.categoryNone')}</option>
                  {GAME_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {t(cat.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-min">{t('library.minPlayers')}</label>
                  <input
                    id="edit-min"
                    type="number"
                    min={1}
                    max={20}
                    value={editingGame.minPlayers}
                    onChange={handleEditField('minPlayers')}
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-max">{t('library.maxPlayers')}</label>
                  <input
                    id="edit-max"
                    type="number"
                    min={1}
                    max={20}
                    value={editingGame.maxPlayers}
                    onChange={handleEditField('maxPlayers')}
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">{t('library.description')}</label>
                <textarea
                  id="edit-description"
                  value={editingGame.description ?? ''}
                  onChange={handleEditField('description')}
                  placeholder={t('library.descriptionPlaceholder')}
                  maxLength={500}
                  rows={3}
                  className="lib-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-cover">{t('library.coverUrl')}</label>
                <input
                  id="edit-cover"
                  type="url"
                  value={editingGame.coverUrl ?? ''}
                  onChange={handleEditField('coverUrl')}
                  placeholder={t('library.coverUrlPlaceholder')}
                  maxLength={1000}
                />
                <span className="lib-field-hint">{t('library.coverUrlHint')}</span>
                {editingGame.coverUrl && (
                  <div className="lib-cover-preview-wrap">
                    <img
                      src={editingGame.coverUrl}
                      alt="preview"
                      className="lib-cover-preview"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group form-checkbox">
                <label htmlFor="edit-owned" className="checkbox-label">
                  <input
                    id="edit-owned"
                    type="checkbox"
                    checked={editingGame.owned ?? false}
                    onChange={(e) =>
                      setEditingGame((prev) => ({
                        ...prev,
                        owned: e.target.checked,
                      }))
                    }
                  />
                  <span>{t('library.ownedLabel')}</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel-lib"
                  onClick={() => setEditingGame(null)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-save-lib">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
