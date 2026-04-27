import { X, UserRound, Dices, Trophy, Handshake, Flame, Sparkles, BookOpen } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate as formatDateValue } from '../utils/dateFormat';
import './FriendStatsModal.css';

const StatRow = ({ label, value }) => (
  <div className="friend-stat-row">
    <span className="friend-stat-label">{label}</span>
    <span className="friend-stat-value">{value ?? '—'}</span>
  </div>
);

export const FriendStatsModal = ({ friend, stats, isLoading, onClose }) => {
  const { t, language } = useLanguage();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return formatDateValue(dateStr, language);
    } catch {
      return dateStr;
    }
  };

  const pct = (v) => (typeof v === 'number' ? `${v}%` : '—');
  const num = (v) => (typeof v === 'number' ? String(v) : '—');

  return (
    <div
      className="friend-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={friend.displayName}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="friend-modal">
        <button
          type="button"
          className="friend-modal-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="friend-modal-header">
          <img
            src={friend.photoUrl || '/user_icon.png'}
            alt={friend.displayName}
            className="friend-modal-avatar"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = '/user_icon.png'; }}
          />
          <div>
            <h2 className="friend-modal-name">{friend.displayName}</h2>
            <p className="friend-modal-email">{friend.email}</p>
          </div>
        </div>

        {isLoading && (
          <div className="friend-modal-loading">
            <Dices size={20} className="friend-modal-spin" />
          </div>
        )}

        {!isLoading && !stats && (
          <p className="friend-modal-empty">{t('friends.profilePrivate')}</p>
        )}

        {!isLoading && stats && !stats.isPublic && (
          <p className="friend-modal-empty">{t('friends.profilePrivate')}</p>
        )}

        {!isLoading && stats && stats.isPublic && (
          <div className="friend-modal-body">
            {/* Activity */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <Dices size={14} /> {t('friends.recentActivity')}
              </h3>
              <StatRow label={t('friends.totalGames')} value={num(stats.totalGames)} />
              <StatRow label={t('friends.gamesLast30')} value={num(stats.gamesLast30Days)} />
              <StatRow label={t('friends.uniqueGames')} value={num(stats.uniquePlayedGames)} />
            </div>

            {/* Last game */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <BookOpen size={14} /> {t('friends.lastGame')}
              </h3>
              <StatRow label={t('friends.lastGameName')} value={stats.lastGame || '—'} />
              <StatRow label={t('friends.lastGameDate')} value={formatDate(stats.lastGameDate)} />
            </div>

            {/* Library */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <BookOpen size={14} /> {t('friends.library')}
              </h3>
              <StatRow label={t('friends.libraryCount')} value={num(stats.totalLibrary)} />
              <StatRow label={t('friends.topGame')} value={stats.topGame || '—'} />
            </div>

            {/* Competitive */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <Trophy size={14} /> {t('friends.competitive')}
              </h3>
              <StatRow label={t('friends.totalWins')} value={num(stats.totalWins)} />
              <StatRow label={t('friends.winRate')} value={pct(stats.competitiveWinRate)} />
              <StatRow label={t('friends.podiumGold')} value={num(stats.podiumGold)} />
              <StatRow label={t('friends.podiumSilver')} value={num(stats.podiumSilver)} />
              <StatRow label={t('friends.podiumBronze')} value={num(stats.podiumBronze)} />
            </div>

            {/* Cooperative */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <Handshake size={14} /> {t('friends.cooperative')}
              </h3>
              <StatRow label={t('friends.coopTotal')} value={num(stats.coopTotal)} />
              <StatRow label={t('friends.coopRate')} value={pct(stats.coopSuccessRate)} />
            </div>

            {/* Streak */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <Flame size={14} /> {t('friends.streak')}
              </h3>
              <StatRow label={t('friends.longestStreak')} value={num(stats.longestStreak)} />
            </div>

            {/* Level */}
            <div className="friend-stat-group">
              <h3 className="friend-stat-group-title">
                <Sparkles size={14} /> {t('friends.level')}
              </h3>
              <StatRow label={t('friends.levelLabel')} value={num(stats.level)} />
              <StatRow label={t('friends.xp')} value={num(stats.xp)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
