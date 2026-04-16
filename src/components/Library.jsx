import { useState } from 'react';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import { GAME_CATEGORIES } from '../hooks/useLibrary';
import './Library.css';

const EMPTY_FORM = {
  name: '',
  category: '',
  minPlayers: '',
  maxPlayers: '',
};

const IconPencil = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export const Library = ({ onNavigate, library, onAdd, onRemove, onUpdate, games }) => {
  const { language, changeLanguage, t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingGame, setEditingGame] = useState(null); // game object being edited

  // Build a play-count map from game session history
  const playCount = {};
  games.forEach((g) => {
    if (g.game) playCount[g.game] = (playCount[g.game] || 0) + 1;
  });

  const handleField = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleEditField = (key) => (e) =>
    setEditingGame((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return;
    onAdd({
      name,
      category: formData.category,
      minPlayers: formData.minPlayers ? parseInt(formData.minPlayers, 10) : null,
      maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers, 10) : null,
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
    });
    setEditingGame(null);
  };

  const openEdit = (game) => {
    setEditingGame({
      ...game,
      minPlayers: game.minPlayers ?? '',
      maxPlayers: game.maxPlayers ?? '',
    });
  };

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
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
            className={`btn-add-library ${showForm ? 'active' : ''}`}
            onClick={() => {
              setShowForm((v) => !v);
              setFormData(EMPTY_FORM);
            }}
          >
            {showForm ? `✕ ${t('common.cancel')}` : `+ ${t('library.addGame')}`}
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
                  onChange={handleField('name')}
                  placeholder={t('library.gameNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

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
              <span className="library-empty-icon">📚</span>
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
                  <li key={game.id} className="library-item">
                    <div className="library-item-info">
                      <div className="library-item-name-row">
                        <span className="library-item-name">{game.name}</span>
                        {game.owned && (
                          <span className="lib-badge lib-badge-owned" title={t('library.ownedLabel')}>
                            ⭐ {t('library.owned')}
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
                            👥 {game.minPlayers ?? '?'}–{game.maxPlayers ?? '?'}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="lib-badge lib-badge-plays">
                            🎮 {count}×
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="library-item-actions">
                      <button
                        className="btn-icon-lib btn-edit-lib"
                        onClick={() => openEdit(game)}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                      >
                        <IconPencil />
                      </button>
                      <button
                        className="btn-icon-lib btn-remove-lib"
                        onClick={() => onRemove(game.id)}
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
