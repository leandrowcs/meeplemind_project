import { Button } from './Button';
import { SideMenu } from './SideMenu';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import { useGames } from '../hooks/useGames';
import logoImage from '../assets/meeplemind_logo.png';
import './Home.css';

export const Home = ({
  onNavigate,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  stats,
  primaryPlayer,
  clearAllData,
  auth,
  syncStatus,
}) => {
  const { language, changeLanguage, t, isInitialized } = useLanguage();
  const { getGamesLast30Days } = useGames();

  if (!isInitialized) {
    return null;
  }

  const gamesLast30Days = getGamesLast30Days();
  const showUrgentMessage = gamesLast30Days === 0;

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <SideMenu
        onExportCSV={exportToCSV}
        onExportJSON={exportToJSON}
        onImportJSON={importFromJSON}
        onClearData={clearAllData}
        auth={auth}
        syncStatus={syncStatus}
      />
      <div className="home-container fade-in">
        <header className="home-header">
          <div className="header-top">
            <div className="logo">
              <img src={logoImage} alt="MeepleMind Logo" className="logo-image" />
            </div>
            <div className="header-info">
              <div className="welcome-section">
                <h2 className="welcome-message">
                  {t('home.welcome')}, <span className="username">{primaryPlayer}</span>
                  <span className="waving-hand">👋</span>
                </h2>
                <div className="stats-badge">
                  <span className="fire-icon">🔥</span>
                  <span className="stats-text">
                    <strong>{gamesLast30Days}</strong> {t('home.gamesLast30Days')}
                  </span>
                </div>
              </div>
              {showUrgentMessage && (
                <p className="urgent-message">{t('home.urgentMessage')}</p>
              )}
            </div>
          </div>
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
              onClick={() => onNavigate('profile')}
              className="nav-btn"
            >
              {t('home.profile')}
            </Button>
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
            <Button
              variant="primary"
              onClick={() => onNavigate('library')}
              className="nav-btn"
            >
              {t('home.library')}
            </Button>
          </div>

          {/* Export/Import Section - REMOVED, now in SideMenu */}
        </main>
      </div>
    </>
  );
};
