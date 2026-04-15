import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import logoImage from '../assets/meeplemind_logo.png';
import './Home.css';

export const Home = ({ onNavigate, exportToCSV, exportToJSON, importFromJSON, stats, primaryPlayer, clearAllData }) => {
  const { language, changeLanguage, t, isInitialized } = useLanguage();

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <SideMenu
        onExportCSV={exportToCSV}
        onExportJSON={exportToJSON}
        onImportJSON={importFromJSON}
        onClearData={clearAllData}
      />
      <div className="home-container fade-in">
        <header className="home-header">
          <div className="logo">
            <img src={logoImage} alt="MeepleMind Logo" className="logo-image" />
          </div>
          <h2 className="welcome-message">{t('home.welcome')}, {primaryPlayer}!</h2>
          <p className="tagline">{t('home.tagline')}</p>
        </header>

        <main className="home-content">
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-icon">🎮</span>
              <div className="stat-info">
                <span className="stat-value">{stats?.totalGames || 0}</span>
                <span className="stat-label">{t('home.games')}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <span className="stat-value">{stats?.topWinner || '—'}</span>
                <span className="stat-label">{t('home.topPlayer')}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎯</span>
              <div className="stat-info">
                <span className="stat-value">{stats?.mostPlayedGame || '—'}</span>
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

          {/* Export/Import Section - REMOVED, now in SideMenu */}
        </main>
      </div>
    </>
  );
};
