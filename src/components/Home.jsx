import { Button } from './Button';
import { SideMenu } from './SideMenu';
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
  const { getGamesLast30Days, getLastGame } = useGames();

  if (!isInitialized) {
    return null;
  }

  const gamesLast30Days = getGamesLast30Days();
  const lastGame = getLastGame();
  const showUrgentMessage = gamesLast30Days === 0;

  return (
    <>
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
          {lastGame && (
            <div className="last-game-card">
              <h3 className="card-title">🎲 {t('home.lastGame')}</h3>
              <div className="card-content">
                <p className="game-name">{lastGame.game}</p>
                <p className="game-winner">🏆 {lastGame.winner}</p>
                <p className="game-meta">
                  👥 {lastGame.numPlayers} • 📅 {lastGame.date.toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

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
