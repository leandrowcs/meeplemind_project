import { Button } from './Button';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import './Profile.css';

export const Profile = ({ onNavigate, games, primaryPlayer, getPlayerStats }) => {
  const { language, changeLanguage, t } = useLanguage();

  const playerStats = getPlayerStats(primaryPlayer);

  return (
    <>
      <LanguageToggle currentLanguage={language} onLanguageChange={changeLanguage} />
      <div className="profile-container fade-in">
        <header className="profile-header">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            {t('common.back')}
          </button>
          <h1>{t('profile.title')}</h1>
        </header>

        <div className="profile-content">
          {/* Player Name Banner */}
          <div className="player-banner">
            <h2>{primaryPlayer}</h2>
          </div>

          {/* Stats Cards Grid */}
          <div className="stats-cards-grid">
            {/* Competitive Games Card */}
            <div className="stat-card-large competitive-card">
              <div className="card-header">
                <span className="card-icon">⚔️</span>
                <h3>{t('profile.competitiveGames')}</h3>
              </div>
              <div className="card-stats">
                <div className="big-stat">
                  <div className="stat-item">
                    <span className="stat-icon">🏆</span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.competitiveWins}</span>
                      <span className="stat-label">{t('stats.victories')}</span>
                    </div>
                  </div>
                  <div className="stat-divider">|</div>
                  <div className="stat-item">
                    <span className="stat-icon">📉</span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.competitiveWinRate}%</span>
                      <span className="stat-label">{t('stats.winRateLabel')}</span>
                    </div>
                  </div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${playerStats.competitiveWinRate}%` }}
                    />
                  </div>
                  <span className="progress-label">
                    {playerStats.competitiveGames} partida{playerStats.competitiveGames !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Cooperative Games Card */}
            <div className="stat-card-large cooperative-card">
              <div className="card-header">
                <span className="card-icon">🤝</span>
                <h3>{t('profile.cooperativeGames')}</h3>
              </div>
              <div className="card-stats">
                <div className="big-stat">
                  <div className="stat-item">
                    <span className="stat-icon">🤝</span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.cooperativeWins}</span>
                      <span className="stat-label">{t('stats.victories')}</span>
                    </div>
                  </div>
                  <div className="stat-divider">|</div>
                  <div className="stat-item">
                    <span className="stat-icon">🔥</span>
                    <div className="stat-group">
                      <span className="stat-number">{playerStats.cooperativeWinRate}%</span>
                      <span className="stat-label">{t('profile.successRate')}</span>
                    </div>
                  </div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill cooperative"
                      style={{ width: `${playerStats.cooperativeWinRate}%` }}
                    />
                  </div>
                  <span className="progress-label">
                    {playerStats.cooperativeGames} partida{playerStats.cooperativeGames !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="overall-stats">
            <h3>{t('stats.totalGames')}</h3>
            <div className="overall-grid">
              <div className="overall-item">
                <span className="overall-icon">🎮</span>
                <div>
                  <span className="overall-value">{playerStats.totalGames}</span>
                  <span className="overall-label">Total Partidas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <Button variant="primary" onClick={() => onNavigate('stats')}>
              {t('stats.title')}
            </Button>
            <Button variant="primary" onClick={() => onNavigate('history')}>
              {t('history.title')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
