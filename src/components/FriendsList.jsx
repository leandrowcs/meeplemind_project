import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { sanitizeText } from '../utils/sanitize';
import { formatDate } from '../utils/dateFormat';
import { FriendStatsModal } from './FriendStatsModal';
import './FriendsList.css';

export const FriendsList = ({
  friends,
  friendSnapshots,
  isRefreshingFriends,
  searchResult,
  isSearching,
  searchError,
  searchByEmail,
  addFriend,
  removeFriend,
  getFriendStats,
  refreshFriendsData,
  setSearchResult,
}) => {
  const { language, t } = useLanguage();
  const [emailInput, setEmailInput] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedFriend, setSelectedFriend] = useState(null); // { uid, displayName, ... }
  const [friendStats, setFriendStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!friends.length || !refreshFriendsData) return;
    refreshFriendsData();
  }, [friends.length, refreshFriendsData]);

  const handleSearch = async () => {
    const clean = sanitizeText(emailInput).trim();
    if (!clean) return;
    await searchByEmail(clean);
  };

  const handleViewProfile = async (friend) => {
    setSelectedFriend(friend);
    setIsLoadingStats(true);
    const stats = await getFriendStats(friend.uid);
    setFriendStats(stats);
    setIsLoadingStats(false);
  };

  const handleCloseModal = () => {
    setSelectedFriend(null);
    setFriendStats(null);
  };

  const handleAddFromSearch = () => {
    if (searchResult && searchResult !== 'not-found') {
      addFriend(searchResult);
      setEmailInput('');
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatSyncDate = (dateString) => {
    if (!dateString) return t('friends.lastSyncUnknown');
    try {
      return formatDate(dateString, language);
    } catch {
      return dateString;
    }
  };

  const getLastSyncLabel = (friend) => {
    const syncedAt = friendSnapshots?.[friend.uid]?.updatedAt || friend.lastUpdatedAt;
    if (!syncedAt) return t('friends.lastSyncUnknown');
    return t('friends.lastSyncAt').replace('{date}', formatSyncDate(syncedAt));
  };

  const alreadyAdded =
    searchResult &&
    searchResult !== 'not-found' &&
    friends.some((f) => f.uid === searchResult.uid);

  return (
    <section className="friends-section">
      {/* Search */}
      <div className="friends-search-row">
        <input
          type="email"
          className="friends-email-input"
          placeholder={t('friends.addByEmail')}
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            if (searchResult) setSearchResult(null);
          }}
          onKeyDown={handleEmailKeyDown}
          aria-label={t('friends.addByEmail')}
          maxLength={254}
          autoComplete="off"
        />
        <button
          type="button"
          className="friends-search-btn"
          onClick={handleSearch}
          disabled={isSearching || !emailInput.trim()}
          aria-label={t('friends.search')}
        >
          <Search size={15} />
          {t('friends.search')}
        </button>
      </div>

      {/* Search feedback */}
      {searchResult === 'not-found' && (
        <p className="friends-feedback not-found">{t('friends.notFound')}</p>
      )}
      {searchError && (
        <p className="friends-feedback error">{t('friends.searchError')}</p>
      )}
      {searchResult && searchResult !== 'not-found' && (
        <div className="friends-search-result">
          <img
            src={searchResult.photoUrl || '/user_icon.png'}
            alt={searchResult.displayName}
            className="friends-avatar"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = '/user_icon.png'; }}
          />
          <span className="friends-result-name">{searchResult.displayName}</span>
          <span className="friends-result-email">{searchResult.email}</span>
          {alreadyAdded ? (
            <span className="friends-already-added">{t('friends.alreadyAdded')}</span>
          ) : (
            <button
              type="button"
              className="friends-add-btn"
              onClick={handleAddFromSearch}
              aria-label={t('friends.add')}
            >
              <UserPlus size={14} />
              {t('friends.add')}
            </button>
          )}
        </div>
      )}

      <div className="friends-view-toolbar">
        <div
          className="friends-view-toggle"
          role="group"
          aria-label={t('friends.viewModeLabel')}
        >
          <button
            type="button"
            className={`friends-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label={t('friends.viewList')}
          >
            <List size={13} />
            {t('friends.viewList')}
          </button>
          <button
            type="button"
            className={`friends-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label={t('friends.viewGrid')}
          >
            <LayoutGrid size={13} />
            {t('friends.viewGrid')}
          </button>
        </div>

        <button
          type="button"
          className="friends-refresh-btn"
          onClick={() => refreshFriendsData?.()}
          disabled={isRefreshingFriends || !friends.length}
          aria-label={t('friends.refreshList')}
        >
          <RefreshCw
            size={13}
            className={isRefreshingFriends ? 'friends-spin' : ''}
          />
          {t('friends.refreshList')}
        </button>
      </div>

      {/* Friends list */}
      {friends.length === 0 ? (
        <p className="friends-empty">{t('friends.empty')}</p>
      ) : viewMode === 'grid' ? (
        <div className="friends-grid">
          {friends.map((friend) => (
            <article key={friend.uid} className="friends-card">
              <img
                src={friend.photoUrl || '/user_icon.png'}
                alt={friend.displayName}
                className="friends-avatar"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = '/user_icon.png'; }}
              />

              <div className="friends-card-main">
                <span className="friends-item-name">{friend.displayName}</span>
                <span className="friends-item-sync">{getLastSyncLabel(friend)}</span>
              </div>

              <div className="friends-card-actions">
                <button
                  type="button"
                  className="friends-view-btn"
                  onClick={() => handleViewProfile(friend)}
                  aria-label={t('friends.viewProfile')}
                >
                  <UserRound size={13} />
                  {t('friends.viewProfile')}
                </button>
                <button
                  type="button"
                  className="friends-remove-btn"
                  onClick={() => removeFriend(friend.uid)}
                  aria-label={t('friends.remove')}
                >
                  <UserMinus size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <ul className="friends-list">
          {friends.map((friend) => (
            <li key={friend.uid} className="friends-item">
              <img
                src={friend.photoUrl || '/user_icon.png'}
                alt={friend.displayName}
                className="friends-avatar"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = '/user_icon.png'; }}
              />

              <div className="friends-item-main">
                <span className="friends-item-name">{friend.displayName}</span>
                <span className="friends-item-sync">{getLastSyncLabel(friend)}</span>
              </div>

              <div className="friends-item-actions">
                <button
                  type="button"
                  className="friends-view-btn"
                  onClick={() => handleViewProfile(friend)}
                  aria-label={t('friends.viewProfile')}
                >
                  <UserRound size={13} />
                  {t('friends.viewProfile')}
                </button>
                <button
                  type="button"
                  className="friends-remove-btn"
                  onClick={() => removeFriend(friend.uid)}
                  aria-label={t('friends.remove')}
                >
                  <UserMinus size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedFriend && (
        <FriendStatsModal
          friend={selectedFriend}
          stats={friendStats}
          isLoading={isLoadingStats}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
};
