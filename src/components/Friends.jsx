import { BarChart3, BookOpen, House, Users, UserRound } from 'lucide-react';
import { SideMenu } from './SideMenu';
import { FriendsList } from './FriendsList';
import { useLanguage } from '../hooks/useLanguage';
import './Friends.css';

export const Friends = ({
  onNavigate,
  auth,
  friends,
  displayPlayerName,
  googlePhotoUrl,
  syncStatus,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
}) => {
  const { t } = useLanguage();

  return (
    <div className="friends-container fade-in">
      <header className="friends-header">
        <div className="friends-title-wrap">
          <span className="friends-title-icon"><Users size={18} /></span>
          <h1>{t('friends.title')}</h1>
        </div>
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
          userName={displayPlayerName}
          userPhotoUrl={googlePhotoUrl}
        />
      </header>

      <div className="friends-content">
        {!auth?.isSignedIn ? (
          <div className="friends-login-required">
            <Users size={40} className="friends-login-icon" />
            <p>{t('friends.requiresLogin')}</p>
          </div>
        ) : (
          <FriendsList
            friends={friends.friends}
            searchResult={friends.searchResult}
            isSearching={friends.isSearching}
            searchError={friends.searchError}
            searchByEmail={friends.searchByEmail}
            addFriend={friends.addFriend}
            removeFriend={friends.removeFriend}
            getFriendStats={friends.getFriendStats}
            setSearchResult={friends.setSearchResult}
          />
        )}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className="bottom-nav-item" onClick={() => onNavigate('home')}>
          <span><House size={18} /></span>
          <small>Home</small>
        </button>
        <button className="bottom-nav-item" onClick={() => onNavigate('stats')}>
          <span><BarChart3 size={18} /></span>
          <small>{t('home.stats')}</small>
        </button>
        <button className="bottom-nav-item" onClick={() => onNavigate('library')}>
          <span><BookOpen size={18} /></span>
          <small>{t('home.library')}</small>
        </button>
        <button className="bottom-nav-item active" onClick={() => onNavigate('friends')}>
          <span><Users size={18} /></span>
          <small>{t('home.friends')}</small>
        </button>
        <button className="bottom-nav-item" onClick={() => onNavigate('profile')}>
          <span><UserRound size={18} /></span>
          <small>{t('home.profile')}</small>
        </button>
      </nav>
    </div>
  );
};
