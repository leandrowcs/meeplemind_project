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

export const Library = ({ onNavigate, library, onAdd, onRemove, games }) => {
  const { language, changeLanguage, t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Build a play-count map from game session history
  const playCount = {};
  games.forEach((g) => {
    if (g.game) playCount[g.game] = (playCount[g.game] || 0) + 1;
  });

  const handleField = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

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
                      <span className="library-item-name">{game.name}</span>
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
                    <button
                      className="btn-remove-lib"
                      onClick={() => onRemove(game.id)}
                      title={t('library.remove')}
                      aria-label={t('library.remove')}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};
