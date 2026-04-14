import { useState, useEffect } from 'react';
import { Button } from './Button';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import logoImage from '../assets/meeplemind_logo.png';
import './Home.css';

export const Home = ({ onNavigate, exportToCSV, exportToJSON, importFromJSON }) => {
  const { language, changeLanguage, t, isInitialized } = useLanguage();
  const [shouldUpdateText, setShouldUpdateText] = useState(false);

  // Update label texts when language changes
  useEffect(() => {
    if (isInitialized) {
      setShouldUpdateText(prev => !prev);
    }
  }, [language, isInitialized]);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromJSON(file);
      e.target.value = '';
    }
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <div className="home-container fade-in">
        <header className="home-header">
          <div className="logo">
            <img src={logoImage} alt="MeepleMind Logo" className="logo-image" />
          </div>
          <p className="tagline">{t('home.tagline')}</p>
        </header>

        <main className="home-content">
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-icon">🎮</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-games">0</span>
                <span className="stat-label">{t('home.games')}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-winner">—</span>
                <span className="stat-label">{t('home.topPlayer')}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎯</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-game">—</span>
                <span className="stat-label">{t('home.mostPlayed')}</span>
              </div>
            </div>
          </div>

          <button
            className="btn-new-game"
            onClick={() => onNavigate('newgame')}
          >
            <span className="btn-icon">➕</span>
            <span>{t('home.newGame')}</span>
          </button>

          <div className="navigation-buttons">
            <Button
              variant="primary"
              onClick={() => onNavigate('history')}
              className="nav-btn"
            >
              {t('home.history')}
            </Button>
            <Button
              variant="primary"
              onClick={() => onNavigate('stats')}
              className="nav-btn"
            >
              {t('home.stats')}
            </Button>
          </div>

          {/* Export/Import Section */}
          <div className="export-section">
            <h3>{t('home.manageData')}</h3>
            <div className="export-buttons">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToCSV}
                title={t('home.exportCSVTitle')}
              >
                {t('home.exportCSV')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToJSON}
                title={t('home.backupJSONTitle')}
              >
                {t('home.backupJSON')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('import-input').click()}
                title={t('home.importJSONTitle')}
              >
                {t('home.importJSON')}
              </Button>
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
