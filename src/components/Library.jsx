import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CircleStar,
  Dices,
  Gamepad2,
  House,
  Info,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { SideMenu } from './SideMenu';
import { useLanguage } from '../hooks/useLanguage';
import { GAME_CATEGORIES, GAME_MECHANICS, GAME_TYPES } from '../hooks/useLibrary';
import './Library.css';

// ──────────────────────────────────────────────────
// BoardGameGeek XML API v2 helpers (gratuita, sem chave)
// https://boardgamegeek.com/wiki/page/BGG_XML_API2
// Roteado via corsproxy.io para contornar restrições CORS do navegador
// ──────────────────────────────────────────────────
const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const OPEN_LIBRARY_CATALOG_KEY = 'meeplemind-open-library-catalog';
const BGG_OFFLINE_CACHE_KEY = 'meeplemind-bgg-hot-offline';
// Em desenvolvimento: usa proxy do Vite (/bggapi → boardgamegeek.com/xmlapi2)
// Em produção: chama a API diretamente (requer CORS habilitado no servidor de hospedagem)
const BGG_PROXY_BASE = import.meta.env.DEV ? '/bggapi' : BGG_BASE;

function bggUrl(path) {
  return BGG_PROXY_BASE + path;
}

function normalizeImageUrl(url) {
  const normalized = (url || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('http://')) return normalized.replace('http://', 'https://');
  return normalized;
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
    const res = await fetch(url, { credentials: 'omit' });
    // BGG/CDN pode retornar 202 (cache miss) ou 401 (Cloudflare transient) — tentar novamente
    if (res.status === 202 || res.status === 401) {
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
    thumbnail: normalizeImageUrl(item.querySelector('thumbnail')?.textContent || ''),
    description: cleanBGGDescription(item.querySelector('description')?.textContent || ''),
    minPlayers: item.querySelector('minplayers')?.getAttribute('value') || '',
    maxPlayers: item.querySelector('maxplayers')?.getAttribute('value') || '',
  };
}

const LEGACY_CATEGORY_LABEL_KEYS = {
  strategy: 'library.categoryStrategy',
  cooperative: 'library.categoryCooperative',
  family: 'library.categoryFamily',
  rpg: 'library.categoryRPG',
  'deck-building': 'library.categoryDeckBuilding',
  'worker-placement': 'library.categoryWorkerPlacement',
  euro: 'library.categoryEuro',
  other: 'library.categoryOther',
};

const getCategoryMetaByValue = (value) =>
  GAME_CATEGORIES.find((item) => item.value === value)
  || (LEGACY_CATEGORY_LABEL_KEYS[value]
    ? { value, label: LEGACY_CATEGORY_LABEL_KEYS[value] }
    : null);

const getMechanicMetaByValue = (value) =>
  GAME_MECHANICS.find((item) => item.value === value) || null;

const getTypeMetaByValue = (value) =>
  GAME_TYPES.find((item) => item.value === value) || null;

const normalizeGameCategories = (game) => {
  if (Array.isArray(game?.categories) && game.categories.length > 0) {
    return game.categories.filter(Boolean);
  }

  if (game?.category) return [game.category];

  return [];
};

const normalizeGameMechanics = (game) => {
  if (!Array.isArray(game?.mechanics)) return [];
  return game.mechanics.filter(Boolean);
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
function computeGameStats(gameName, games, primaryPlayer) {
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

  let userWins = 0;
  let userDefeats = 0;
  let coopWins = 0;
  let coopDefeats = 0;

  if (primaryPlayer) {
    sessions.forEach((session) => {
      const playedByUser = (session.players || []).includes(primaryPlayer);
      if (!playedByUser) return;

      if (session.gameType === 'cooperative') {
        if (session.coopResult === 'win') coopWins += 1;
        if (session.coopResult === 'loss') coopDefeats += 1;
        return;
      }

      if (!session.winner) return;
      if (session.winner === primaryPlayer) {
        userWins += 1;
      } else {
        userDefeats += 1;
      }
    });
  }

  return {
    timesPlayed,
    players: [...allPlayers],
    topWinner,
    topWinnerCount: topWinner ? winnerCounts[topWinner] : 0,
    lastPlayed,
    userWins,
    userDefeats,
    coopWins,
    coopDefeats,
  };
}

// ──────────────────────────────────────────────────
// Game Details Modal
// ──────────────────────────────────────────────────
function GameDetailsModal({ game, stats, t, language, primaryPlayer, loadingBGG, canEdit, onClose, onEdit }) {
  const [imgError, setImgError] = useState(false);
  const categories = normalizeGameCategories(game);
  const mechanics = normalizeGameMechanics(game);
  const typeMeta = getTypeMetaByValue(game.gameType || '');
  const displayName = game.nameLocal?.[language] || game.name;
  const displayDescription = game.descriptionLocal?.[language] || game.description;
  const displayCoverUrl = normalizeImageUrl(game.coverUrl);

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
          {displayCoverUrl && !imgError ? (
            <img
              src={displayCoverUrl}
              alt={displayName}
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
            <h2 className="lib-details-name">{displayName}</h2>
            {game.owned && (
              <span className="lib-badge lib-badge-owned"><CircleStar size={14} /> {t('library.owned')}</span>
            )}
          </div>

          <div className="lib-details-badges">
            {categories.map((categoryValue) => {
              const meta = getCategoryMetaByValue(categoryValue);
              return (
                <span key={`cat-${categoryValue}`} className="lib-badge lib-badge-cat">
                  {meta ? t(meta.label) : categoryValue}
                </span>
              );
            })}
            {typeMeta && (
              <span className="lib-badge lib-badge-plays">{t(typeMeta.label)}</span>
            )}
            {(game.minPlayers || game.maxPlayers) && (
              <span className="lib-badge">
                <Users size={14} /> {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
              </span>
            )}
          </div>

          {mechanics.length > 0 && (
            <div className="lib-details-badges">
              {mechanics.map((mechanicValue) => {
                const meta = getMechanicMetaByValue(mechanicValue);
                return (
                  <span key={`mechanic-${mechanicValue}`} className="lib-badge">
                    {meta ? t(meta.label) : mechanicValue}
                  </span>
                );
              })}
            </div>
          )}

          {displayDescription && (
            <p className="lib-details-description">
              {displayDescription}
            </p>
          )}

          {loadingBGG && !displayDescription && (
            <p className="lib-details-description lib-details-muted">
              <LoaderCircle size={14} className="catalog-spinner" /> {t('library.bggSearching')}
            </p>
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

                {primaryPlayer && (
                  <>
                    <div className="lib-stat-row">
                      <span className="lib-stat-icon"><Trophy size={14} /></span>
                      <span className="lib-stat-value">
                        <strong>{t('stats.victories')}:</strong> {stats.userWins + stats.coopWins}
                      </span>
                    </div>
                    <div className="lib-stat-row">
                      <span className="lib-stat-icon"><X size={14} /></span>
                      <span className="lib-stat-value">
                        <strong>{t('stats.defeats')}:</strong> {stats.userDefeats + stats.coopDefeats}
                      </span>
                    </div>
                  </>
                )}

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
            {canEdit && (
              <button className="btn-edit-details" onClick={onEdit}>
                <IconPencil /> {t('library.editGame')}
              </button>
            )}
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

const createGameDraft = (game = null) => {
  if (!game) {
    return {
      id: '',
      name: '',
      category: '',
      categories: [],
      mechanics: [],
      gameType: '',
      minPlayers: '',
      maxPlayers: '',
      description: '',
      coverUrl: '',
      owned: false,
      nameLocal: {},
      descriptionLocal: {},
    };
  }

  const normalizedCategories = normalizeGameCategories(game);
  const normalizedMechanics = normalizeGameMechanics(game);

  return {
    ...game,
    category: normalizedCategories[0] || '',
    categories: normalizedCategories,
    mechanics: normalizedMechanics,
    gameType: game.gameType || '',
    minPlayers: game.minPlayers ?? '',
    maxPlayers: game.maxPlayers ?? '',
    description: game.description ?? '',
    coverUrl: game.coverUrl ?? '',
    owned: Boolean(game.owned),
    nameLocal: game.nameLocal ?? {},
    descriptionLocal: game.descriptionLocal ?? {},
  };
};

const toggleArrayValue = (values, target) => {
  if (!Array.isArray(values)) return [target];
  if (values.includes(target)) {
    return values.filter((value) => value !== target);
  }
  return [...values, target];
};

// ──────────────────────────────────────────────────
// Main Library component
// ──────────────────────────────────────────────────
export const Library = ({
  onNavigate,
  library,
  onAdd,
  onRemove,
  onUpdate,
  games,
  primaryPlayer,
  displayPlayerName,
  googlePhotoUrl,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
  auth,
  syncStatus,
}) => {
  const { language, t } = useLanguage();
  const [addingGame, setAddingGame] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [bggAddStatus, setBggAddStatus] = useState('idle');
  const [bggEditStatus, setBggEditStatus] = useState('idle');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const getCategoryLabel = useCallback((categoryValue) => {
    const meta = getCategoryMetaByValue(categoryValue);
    return meta ? t(meta.label) : categoryValue;
  }, [t]);

  // Tab state: 'shelf' | 'catalog'
  const [activeTab, setActiveTab] = useState('shelf');
  // BGG catalog state
  const [hotGames, setHotGames] = useState([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [hotError, setHotError] = useState(false);
  const [hotLoaded, setHotLoaded] = useState(false);
  const [catalogDataSource, setCatalogDataSource] = useState('online');
  const [sortAlpha, setSortAlpha] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogDetailsLoadingName, setCatalogDetailsLoadingName] = useState('');
  const [bggCardDetails, setBggCardDetails] = useState({});
  const catalogSearchInputRef = useRef(null);
  const bggDetailsCacheRef = useRef({});

  // Build a play-count map from game session history
  const playCount = useMemo(() => {
    const counts = {};
    games.forEach((g) => {
      const normalized = g.game?.toLowerCase();
      if (normalized) counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [games]);

  const libraryByNameLower = useMemo(() => {
    const entries = new Map();
    library.forEach((game) => {
      if (game?.name) entries.set(game.name.toLowerCase(), game);
    });
    return entries;
  }, [library, t]);

  const libraryNamesLower = useMemo(
    () => new Set(Array.from(libraryByNameLower.keys())),
    [libraryByNameLower]
  );

  const availableCategoryFilters = useMemo(() => {
    const usedCategories = new Set();
    library.forEach((game) => {
      normalizeGameCategories(game).forEach((categoryValue) => {
        if (categoryValue) usedCategories.add(categoryValue);
      });
    });

    return Array.from(usedCategories)
      .map((value) => getCategoryMetaByValue(value) || { value, label: '' })
      .sort((a, b) => {
        const labelA = a.label ? t(a.label) : a.value;
        const labelB = b.label ? t(b.label) : b.value;
        return labelA.localeCompare(labelB);
      });
  }, [library]);

  const filteredLibrary = useMemo(() => {
    if (categoryFilter === 'all') return library;
    return library.filter((game) => normalizeGameCategories(game).includes(categoryFilter));
  }, [library, categoryFilter]);

  const resolveBggDetails = useCallback(async (gameName) => {
    const key = gameName.toLowerCase();
    if (bggDetailsCacheRef.current[key]) return bggDetailsCacheRef.current[key];

    try {
      const data = await fetchBGGData(gameName);
      if (data) {
        bggDetailsCacheRef.current[key] = data;
        setBggCardDetails((prev) => ({ ...prev, [key]: data }));
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const handleEditField = (key) => (e) =>
    setEditingGame((prev) => ({ ...prev, [key]: e.target.value }));

  const handleAddField = (key) => (e) =>
    setAddingGame((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleEditCategory = (value) => {
    setEditingGame((prev) => {
      const nextCategories = toggleArrayValue(prev.categories || [], value);
      return {
        ...prev,
        categories: nextCategories,
        category: nextCategories[0] || '',
      };
    });
  };

  const toggleAddCategory = (value) => {
    setAddingGame((prev) => {
      const nextCategories = toggleArrayValue(prev.categories || [], value);
      return {
        ...prev,
        categories: nextCategories,
        category: nextCategories[0] || '',
      };
    });
  };

  const toggleEditMechanic = (value) => {
    setEditingGame((prev) => ({
      ...prev,
      mechanics: toggleArrayValue(prev.mechanics || [], value),
    }));
  };

  const toggleAddMechanic = (value) => {
    setAddingGame((prev) => ({
      ...prev,
      mechanics: toggleArrayValue(prev.mechanics || [], value),
    }));
  };

  const handleBGGAddSearch = async () => {
    const name = addingGame?.name?.trim();
    if (!name) return;

    setBggAddStatus('loading');
    try {
      const data = await fetchBGGData(name);
      if (!data) {
        setBggAddStatus('notfound');
        return;
      }
      setAddingGame((prev) => ({
        ...prev,
        description: data.description || prev.description,
        coverUrl: data.thumbnail || prev.coverUrl,
        minPlayers: data.minPlayers || prev.minPlayers,
        maxPlayers: data.maxPlayers || prev.maxPlayers,
      }));
      setBggAddStatus('found');
    } catch {
      setBggAddStatus('error');
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

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingGame?.name?.trim()) return;

    onUpdate(editingGame.id, {
      name: editingGame.name,
      category: editingGame.category,
      categories: editingGame.categories ?? [],
      mechanics: editingGame.mechanics ?? [],
      gameType: editingGame.gameType ?? '',
      minPlayers: editingGame.minPlayers ? parseInt(editingGame.minPlayers, 10) : null,
      maxPlayers: editingGame.maxPlayers ? parseInt(editingGame.maxPlayers, 10) : null,
      owned: editingGame.owned,
      description: editingGame.description,
      coverUrl: editingGame.coverUrl,
      nameLocal: editingGame.nameLocal ?? {},
      descriptionLocal: editingGame.descriptionLocal ?? {},
    });
    if (selectedGame?.id === editingGame.id) setSelectedGame({ ...editingGame });
    setEditingGame(null);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addingGame?.name?.trim()) return;

    onAdd({
      name: addingGame.name,
      category: addingGame.category,
      categories: addingGame.categories ?? [],
      mechanics: addingGame.mechanics ?? [],
      gameType: addingGame.gameType ?? '',
      minPlayers: addingGame.minPlayers ? parseInt(addingGame.minPlayers, 10) : null,
      maxPlayers: addingGame.maxPlayers ? parseInt(addingGame.maxPlayers, 10) : null,
      description: addingGame.description,
      coverUrl: addingGame.coverUrl,
      owned: addingGame.owned,
    });

    setAddingGame(null);
  };

  const openAdd = useCallback(() => {
    setBggAddStatus('idle');
    setAddingGame(createGameDraft());
  }, []);

  const openEdit = useCallback((game, e) => {
    e?.stopPropagation();
    setBggEditStatus('idle');
    setEditingGame(createGameDraft(game));
  }, []);

  const openDetails = useCallback((game) => {
    setCatalogDetailsLoadingName('');
    setSelectedGame({ ...game, inLibrary: true });
  }, []);

  const handleRemove = useCallback((game, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const removeKey = game?.id || game?.name;
    if (!removeKey) return;

    onRemove(removeKey);

    if (selectedGame?.id && game?.id && selectedGame.id === game.id) {
      setSelectedGame(null);
      return;
    }

    if (!game?.id && selectedGame?.name?.toLowerCase() === game?.name?.toLowerCase()) {
      setSelectedGame(null);
    }
  }, [onRemove, selectedGame]);

  const fetchHotGames = useCallback(async () => {
    if (hotLoaded) return;
    setHotLoading(true);
    setHotError(false);
    try {
      const xml = await fetchBGGXml(bggUrl('/hot?type=boardgame'));
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));
      const parsed = items.map((item) => ({
        id: item.getAttribute('id'),
        rank: parseInt(item.getAttribute('rank'), 10),
        name: item.querySelector('name')?.getAttribute('value') || '',
        thumbnail: item.querySelector('thumbnail')?.getAttribute('value') || '',
        yearPublished: item.querySelector('yearpublished')?.getAttribute('value') || '',
      }));
      setHotGames(parsed);
      setHotLoaded(true);
      setCatalogDataSource('online');
    } catch {
      try {
        const cachedRaw = localStorage.getItem(BGG_OFFLINE_CACHE_KEY);
        const cachedPayload = cachedRaw ? JSON.parse(cachedRaw) : null;
        if (Array.isArray(cachedPayload?.items) && cachedPayload.items.length > 0) {
          setHotGames(cachedPayload.items);
          setHotLoaded(true);
          setHotError(false);
          setCatalogDataSource('offline');
          return;
        }
      } catch {
        // No valid offline cache available.
      }
      setCatalogDataSource('online');
      setHotError(true);
    } finally {
      setHotLoading(false);
    }
  }, [hotLoaded]);

  const handleCatalogTab = useCallback(() => {
    setActiveTab('catalog');
    fetchHotGames();
  }, [fetchHotGames]);

  useEffect(() => {
    const shouldOpenCatalog = localStorage.getItem(OPEN_LIBRARY_CATALOG_KEY) === '1';
    if (!shouldOpenCatalog) return;
    localStorage.removeItem(OPEN_LIBRARY_CATALOG_KEY);
    handleCatalogTab();
  }, [handleCatalogTab]);

  const handleGoToCatalogSearch = useCallback(() => {
    handleCatalogTab();
    setTimeout(() => {
      catalogSearchInputRef.current?.focus();
      catalogSearchInputRef.current?.select();
    }, 0);
  }, [handleCatalogTab]);

  const handleAddFromCatalog = useCallback((bggGame) => {
    const cachedDetails = bggDetailsCacheRef.current[bggGame.name.toLowerCase()];
    const coverUrl = normalizeImageUrl(bggGame.thumbnail);
    onAdd({
      name: bggGame.name,
      category: '',
      categories: [],
      mechanics: [],
      gameType: '',
      coverUrl,
      owned: true,
      minPlayers: cachedDetails?.minPlayers ? parseInt(cachedDetails.minPlayers, 10) : null,
      maxPlayers: cachedDetails?.maxPlayers ? parseInt(cachedDetails.maxPlayers, 10) : null,
      description: cachedDetails?.description || '',
    });
  }, [onAdd]);

  const handleCatalogOpenDetails = useCallback(async (bggGame) => {
    const normalizedName = bggGame.name.toLowerCase();
    const existing = libraryByNameLower.get(normalizedName);

    if (existing) {
      setCatalogDetailsLoadingName('');
      setSelectedGame({ ...existing, inLibrary: true });
      return;
    }

    const coverUrl = normalizeImageUrl(bggGame.thumbnail);

    setSelectedGame({
      id: null,
      name: bggGame.name,
      category: '',
      categories: [],
      mechanics: [],
      gameType: '',
      minPlayers: null,
      maxPlayers: null,
      description: '',
      coverUrl,
      owned: false,
      nameLocal: {},
      descriptionLocal: {},
      inLibrary: false,
    });

    setCatalogDetailsLoadingName(normalizedName);
    const details = await resolveBggDetails(bggGame.name);
    setCatalogDetailsLoadingName('');

    if (!details) return;
    setSelectedGame((previous) => {
      if (!previous || previous.name.toLowerCase() !== normalizedName) return previous;
      return {
        ...previous,
        minPlayers: details.minPlayers || previous.minPlayers,
        maxPlayers: details.maxPlayers || previous.maxPlayers,
        description: details.description || previous.description,
      };
    });
  }, [libraryByNameLower, resolveBggDetails]);

  const filteredHot = hotGames
    .filter((g) => !catalogSearch || g.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    .sort(sortAlpha ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.rank - b.rank);

  return (
    <>
      <div className="library-container fade-in">
        <header className="library-header">
          <div className="library-title-wrap">
            <span className="library-title-icon"><BookOpen size={18} /></span>
            <h1>{t('library.title')}</h1>
          </div>
          <div className="library-header-actions">
            <span className="library-count" aria-label={String(library.length)}>{library.length}</span>
            <SideMenu
              onExportCSV={exportToCSV}
              onExportJSON={exportToJSON}
              onImportJSON={importFromJSON}
              onClearData={clearAllData}
              onOpenSettings={() => onNavigate('settings')}
              auth={auth}
              syncStatus={syncStatus}
              compact
              openFrom="right"
              userName={displayPlayerName || primaryPlayer}
              userPhotoUrl={googlePhotoUrl}
            />
          </div>
        </header>

        {/* Tab bar */}
        <div className="library-tabs">
          <button
            className={`library-tab-btn ${activeTab === 'shelf' ? 'active' : ''}`}
            onClick={() => setActiveTab('shelf')}
          >
            <BookOpen size={15} /> {t('library.tabShelf')}
          </button>
          <button
            className={`library-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={handleCatalogTab}
          >
            <Dices size={15} /> {t('library.tabBGG')}
          </button>
        </div>

        <div className="library-content">
          {/* ── Minha Estante tab ── */}
          {activeTab === 'shelf' && (
          <>
          <div className="library-shelf-actions">
            <button
              className="btn btn-secondary btn-md"
              onClick={openAdd}
              data-testid="library-open-add-manual"
            >
              <Plus size={16} /> {t('library.addManualGame')}
            </button>

            <button
              className="btn btn-accent btn-md"
              onClick={handleGoToCatalogSearch}
              data-testid="library-open-bgg-search"
            >
              <Search size={16} /> {t('library.bggSearch')}
            </button>
          </div>

          {availableCategoryFilters.length > 0 && (
            <div className="library-quick-filters" role="group" aria-label={t('library.category')}>
              <button
                type="button"
                className={`library-filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                {t('history.filterAll')}
              </button>
              {availableCategoryFilters.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`library-filter-btn ${categoryFilter === cat.value ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat.value)}
                >
                  {getCategoryLabel(cat.value)}
                </button>
              ))}
            </div>
          )}

          {/* Library list */}
          {filteredLibrary.length === 0 ? (
            <div className="library-empty">
              <span className="library-empty-icon"><BookOpen size={24} /></span>
              <p>{t('library.noGames')}</p>
            </div>
          ) : (
            <ul className="library-card-grid">
              {filteredLibrary.map((game) => {
                const count = playCount[game.name.toLowerCase()] || 0;
                const primaryCategory = normalizeGameCategories(game)[0] || '';
                const typeMeta = getTypeMetaByValue(game.gameType || '');
                const shelfCoverUrl = normalizeImageUrl(game.coverUrl);
                const playersLabel =
                  (game.minPlayers || game.maxPlayers)
                    ? `${game.minPlayers ?? '?'}-${game.maxPlayers ?? '?'}`
                    : '?';
                return (
                  <li key={game.id}>
                    <article
                      className={`library-game-card library-game-card--shelf${shelfCoverUrl ? '' : ' no-cover'}`}
                      onClick={() => openDetails(game)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openDetails(game)}
                      aria-label={game.name}
                    >
                      {shelfCoverUrl && (
                        <img
                          src={shelfCoverUrl}
                          alt=""
                          className="library-card-bg-img"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}

                      <div className="library-card-top-left">
                        <span className="library-card-chip"><Users size={12} /> {playersLabel}</span>
                      </div>

                      <div className="library-card-top-right">
                        {count > 0 && (
                          <span className="library-card-badge played" title={t('library.timesPlayed')}>
                            <BadgeCheck size={14} />
                          </span>
                        )}
                        {game.owned && (
                          <span className="library-card-badge owned" title={t('library.ownedLabel')}>
                            <CircleStar size={14} />
                          </span>
                        )}
                      </div>

                      <div className="library-card-content">
                        <h3>{game.nameLocal?.[language] || game.name}</h3>
                        <div className="library-card-meta">
                          <span className="library-card-chip">
                            {primaryCategory ? getCategoryLabel(primaryCategory) : t('library.categoryNone')}
                          </span>
                          {typeMeta && <span className="library-card-chip subtle">{t(typeMeta.label)}</span>}
                          {count > 0 && <span className="library-card-chip subtle">{count}x</span>}
                        </div>
                      </div>

                      <div className="library-card-actions" onClick={(e) => e.stopPropagation()}>
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
                          onClick={(e) => handleRemove(game, e)}
                          title={t('library.remove')}
                          aria-label={t('library.remove')}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          </>
          )}

          {/* ── Catálogo BGG tab ── */}
          {activeTab === 'catalog' && (
          <>
            {language !== 'en-US' && (
              <div className="bgg-lang-notice">
                <Info size={14} />
                {t('library.bggEnglishNotice')}
              </div>
            )}
            <div className="catalog-controls">
              <div className="catalog-sort-btns">
                <button
                  className={`catalog-sort-btn ${!sortAlpha ? 'active' : ''}`}
                  onClick={() => setSortAlpha(false)}
                >
                  {t('library.bggSortRanking')}
                </button>
                <button
                  className={`catalog-sort-btn ${sortAlpha ? 'active' : ''}`}
                  onClick={() => setSortAlpha(true)}
                >
                  {t('library.bggSortAlpha')}
                </button>
              </div>
              <div className="catalog-search-wrap">
                <Search size={14} className="catalog-search-icon" />
                <input
                  ref={catalogSearchInputRef}
                  type="text"
                  className="catalog-search-input"
                  placeholder={t('library.bggSearch')}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
            </div>

            {!hotLoading && !hotError && (
              <div
                className={`catalog-source-badge ${catalogDataSource === 'offline' ? 'offline' : 'online'}`}
                role="status"
                aria-live="polite"
              >
                <span className="catalog-source-dot" aria-hidden="true" />
                <span>
                  {catalogDataSource === 'offline'
                    ? t('library.bggSourceOffline')
                    : t('library.bggSourceOnline')}
                </span>
              </div>
            )}

            {!hotLoading && !hotError && catalogDataSource === 'offline' && (
              <p className="catalog-source-note">{t('library.bggSourceOfflineHint')}</p>
            )}

            {hotLoading && (
              <div className="catalog-status">
                <LoaderCircle size={20} className="catalog-spinner" />
                <span>{t('library.bggLoadingHot')}</span>
              </div>
            )}

            {hotError && (
              <p className="catalog-error">{t('library.bggHotError')}</p>
            )}

            {!hotLoading && !hotError && filteredHot.length > 0 && (
              <ul className="library-card-grid catalog-grid">
                {filteredHot.map((game) => {
                  const normalizedName = game.name.toLowerCase();
                  const inShelf = libraryNamesLower.has(normalizedName);
                  const inLibraryEntry = libraryByNameLower.get(normalizedName);
                  const cachedDetails = bggCardDetails[normalizedName];
                  const count = playCount[normalizedName] || 0;
                  const thumb = game.thumbnail;
                  const thumbSrc = thumb
                    ? (thumb.startsWith('//') ? `https:${thumb}` : thumb)
                    : '';
                  const preferredCoverUrl =
                    normalizeImageUrl(inLibraryEntry?.coverUrl) || normalizeImageUrl(thumbSrc);
                  const playersLabel =
                    (inLibraryEntry?.minPlayers || inLibraryEntry?.maxPlayers)
                      ? `${inLibraryEntry?.minPlayers ?? '?'}-${inLibraryEntry?.maxPlayers ?? '?'}`
                      : (cachedDetails?.minPlayers || cachedDetails?.maxPlayers)
                        ? `${cachedDetails?.minPlayers ?? '?'}-${cachedDetails?.maxPlayers ?? '?'}`
                      : '?';
                  const primaryCategory = inLibraryEntry
                    ? (normalizeGameCategories(inLibraryEntry)[0] || '')
                    : '';
                  return (
                    <li key={game.id}>
                      <article
                        className={`library-game-card library-game-card--catalog${preferredCoverUrl ? '' : ' no-cover'}`}
                        onClick={() => handleCatalogOpenDetails(game)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleCatalogOpenDetails(game)}
                        aria-label={game.name}
                      >
                        {preferredCoverUrl && (
                          <img
                            src={preferredCoverUrl}
                            alt=""
                            className="library-card-bg-img"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}

                        <div className="library-card-top-left">
                          <span className="library-card-chip">#{game.rank}</span>
                          <span className="library-card-chip"><Users size={12} /> {playersLabel}</span>
                        </div>

                        <div className="library-card-top-right">
                          {count > 0 && (
                            <span className="library-card-badge played" title={t('library.timesPlayed')}>
                              <BadgeCheck size={14} />
                            </span>
                          )}
                          {inLibraryEntry?.owned && (
                            <span className="library-card-badge owned" title={t('library.ownedLabel')}>
                              <CircleStar size={14} />
                            </span>
                          )}
                        </div>

                        <div className="library-card-content">
                          <h3>{game.name}</h3>
                          <div className="library-card-meta">
                            <span className="library-card-chip">
                              {primaryCategory ? getCategoryLabel(primaryCategory) : 'BGG'}
                            </span>
                            {game.yearPublished && (
                              <span className="library-card-chip subtle">{game.yearPublished}</span>
                            )}
                          </div>
                        </div>

                        <div className="library-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`library-card-add-btn${inShelf ? ' in-shelf' : ''}`}
                            onClick={() => !inShelf && handleAddFromCatalog(game)}
                            disabled={inShelf}
                            title={inShelf ? t('library.alreadyOnShelf') : t('library.addToShelf')}
                            aria-label={inShelf ? t('library.alreadyOnShelf') : t('library.addToShelf')}
                          >
                            {inShelf ? <Check size={14} /> : <BookOpen size={14} />}
                            <span>{inShelf ? t('library.alreadyOnShelf') : t('library.addToShelf')}</span>
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}

            {!hotLoading && !hotError && filteredHot.length === 0 && (
              <div className="library-empty">
                <span className="library-empty-icon"><Dices size={24} /></span>
                <p>{t('library.noGames')}</p>
              </div>
            )}
          </>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className="bottom-nav-item" onClick={() => onNavigate('home')}>
            <span><House size={18} /></span>
            <small>Home</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('stats')}>
            <span><BarChart3 size={18} /></span>
            <small>{t('stats.title')}</small>
          </button>
          <button className="bottom-nav-item active" onClick={() => onNavigate('library')}>
            <span><BookOpen size={18} /></span>
            <small>{t('home.library')}</small>
          </button>
          <button className="bottom-nav-item" onClick={() => onNavigate('profile')}>
            <span><UserRound size={18} /></span>
            <small>{t('home.profile')}</small>
          </button>
        </nav>
      </div>

      {/* Game Details Modal */}
      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          stats={computeGameStats(selectedGame.name, games, primaryPlayer)}
          t={t}
          language={language}
          primaryPlayer={primaryPlayer}
          loadingBGG={catalogDetailsLoadingName === selectedGame.name.toLowerCase()}
          canEdit={Boolean(selectedGame.inLibrary)}
          onClose={() => setSelectedGame(null)}
          onEdit={() => {
            openEdit(selectedGame);
            setSelectedGame(null);
          }}
        />
      )}

      {/* Add modal */}
      {addingGame && (
        <div className="modal-overlay" onClick={() => setAddingGame(null)}>
          <div
            className="modal-content lib-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="lib-edit-title">{t('library.addManualTitle')}</h2>
            <button
              className="modal-close"
              onClick={() => setAddingGame(null)}
              aria-label={t('common.cancel')}
            >
              ✕
            </button>
            <form onSubmit={handleAddSubmit} className="library-form lib-edit-form">
              <div className="lib-bgg-row">
                <button
                  type="button"
                  className={`btn-bgg-search${bggAddStatus === 'loading' ? ' loading' : ''}`}
                  onClick={handleBGGAddSearch}
                  disabled={bggAddStatus === 'loading'}
                >
                  {bggAddStatus === 'loading'
                    ? <><LoaderCircle size={14} /> {t('library.bggSearching')}</>
                    : <><Search size={14} /> {t('library.bggSearch')}</>}
                </button>
                {bggAddStatus === 'found' && (
                  <span className="lib-bgg-msg lib-bgg-success"><Check size={14} /> {t('library.bggFound')}</span>
                )}
                {bggAddStatus === 'notfound' && (
                  <span className="lib-bgg-msg lib-bgg-error">{t('library.bggNotFound')}</span>
                )}
                {bggAddStatus === 'error' && (
                  <span className="lib-bgg-msg lib-bgg-error">{t('library.bggError')}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-name">{t('library.gameName')}</label>
                <input
                  id="add-name"
                  type="text"
                  value={addingGame.name}
                  onChange={handleAddField('name')}
                  placeholder={t('library.gameNamePlaceholder')}
                  maxLength={120}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('library.categories')}</label>
                <div className="lib-multi-grid">
                  {GAME_CATEGORIES.map((cat) => (
                    <button
                      key={`add-cat-${cat.value}`}
                      type="button"
                      className={`lib-tag-btn ${addingGame.categories?.includes(cat.value) ? 'selected' : ''}`}
                      onClick={() => toggleAddCategory(cat.value)}
                    >
                      {t(cat.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('library.mechanics')}</label>
                <div className="lib-multi-grid">
                  {GAME_MECHANICS.map((mechanic) => (
                    <button
                      key={`add-mechanic-${mechanic.value}`}
                      type="button"
                      className={`lib-tag-btn ${addingGame.mechanics?.includes(mechanic.value) ? 'selected' : ''}`}
                      onClick={() => toggleAddMechanic(mechanic.value)}
                    >
                      {t(mechanic.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="add-game-type">{t('library.gameType')}</label>
                <select
                  id="add-game-type"
                  value={addingGame.gameType ?? ''}
                  onChange={handleAddField('gameType')}
                >
                  <option value="">{t('library.typeNone')}</option>
                  {GAME_TYPES.map((typeOption) => (
                    <option key={typeOption.value} value={typeOption.value}>
                      {t(typeOption.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="add-min">{t('library.minPlayers')}</label>
                  <input
                    id="add-min"
                    type="number"
                    min={1}
                    max={20}
                    value={addingGame.minPlayers}
                    onChange={handleAddField('minPlayers')}
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="add-max">{t('library.maxPlayers')}</label>
                  <input
                    id="add-max"
                    type="number"
                    min={1}
                    max={20}
                    value={addingGame.maxPlayers}
                    onChange={handleAddField('maxPlayers')}
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="add-description">{t('library.description')}</label>
                <textarea
                  id="add-description"
                  value={addingGame.description ?? ''}
                  onChange={handleAddField('description')}
                  placeholder={t('library.descriptionPlaceholder')}
                  maxLength={500}
                  rows={3}
                  className="lib-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-cover">{t('library.coverUrl')}</label>
                <input
                  id="add-cover"
                  type="url"
                  value={addingGame.coverUrl ?? ''}
                  onChange={handleAddField('coverUrl')}
                  placeholder={t('library.coverUrlPlaceholder')}
                  maxLength={1000}
                />
                <span className="lib-field-hint">{t('library.coverUrlHint')}</span>
              </div>

              <div className="form-group form-checkbox">
                <label htmlFor="add-owned" className="checkbox-label">
                  <input
                    id="add-owned"
                    type="checkbox"
                    checked={addingGame.owned ?? false}
                    onChange={(e) =>
                      setAddingGame((prev) => ({
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
                  onClick={() => setAddingGame(null)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-save-lib">
                  {t('library.addGame')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingGame && (
        <div className="modal-overlay" onClick={() => setEditingGame(null)}>
          <div
            className="modal-content lib-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="lib-edit-title">{t('library.editGame')}</h2>
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
                <label htmlFor="edit-name">{t('library.gameName')}</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editingGame.name}
                  onChange={handleEditField('name')}
                  placeholder={t('library.gameNamePlaceholder')}
                  maxLength={120}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('library.categories')}</label>
                <div className="lib-multi-grid">
                  {GAME_CATEGORIES.map((cat) => (
                    <button
                      key={`edit-cat-${cat.value}`}
                      type="button"
                      className={`lib-tag-btn ${editingGame.categories?.includes(cat.value) ? 'selected' : ''}`}
                      onClick={() => toggleEditCategory(cat.value)}
                    >
                      {t(cat.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('library.mechanics')}</label>
                <div className="lib-multi-grid">
                  {GAME_MECHANICS.map((mechanic) => (
                    <button
                      key={`edit-mechanic-${mechanic.value}`}
                      type="button"
                      className={`lib-tag-btn ${editingGame.mechanics?.includes(mechanic.value) ? 'selected' : ''}`}
                      onClick={() => toggleEditMechanic(mechanic.value)}
                    >
                      {t(mechanic.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-game-type">{t('library.gameType')}</label>
                <select
                  id="edit-game-type"
                  value={editingGame.gameType ?? ''}
                  onChange={handleEditField('gameType')}
                >
                  <option value="">{t('library.typeNone')}</option>
                  {GAME_TYPES.map((typeOption) => (
                    <option key={typeOption.value} value={typeOption.value}>
                      {t(typeOption.label)}
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

              {language !== 'en-US' && (
                <>
                  <div className="form-group">
                    <label htmlFor="edit-name-local">{t('library.nameLocalLabel')}</label>
                    <input
                      id="edit-name-local"
                      type="text"
                      value={editingGame.nameLocal?.[language] ?? ''}
                      onChange={(e) =>
                        setEditingGame((prev) => ({
                          ...prev,
                          nameLocal: { ...(prev.nameLocal ?? {}), [language]: e.target.value },
                        }))
                      }
                      placeholder={t('library.nameLocalPlaceholder')}
                      maxLength={200}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-desc-local">{t('library.descriptionLocalLabel')}</label>
                    <textarea
                      id="edit-desc-local"
                      value={editingGame.descriptionLocal?.[language] ?? ''}
                      onChange={(e) =>
                        setEditingGame((prev) => ({
                          ...prev,
                          descriptionLocal: { ...(prev.descriptionLocal ?? {}), [language]: e.target.value },
                        }))
                      }
                      placeholder={t('library.descriptionLocalPlaceholder')}
                      maxLength={500}
                      rows={3}
                      className="lib-textarea"
                    />
                  </div>
                </>
              )}

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
