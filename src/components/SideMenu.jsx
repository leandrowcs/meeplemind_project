import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Languages,
  Menu,
  Newspaper,
  Settings,
  UserPlus,
  X,
} from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useLanguage } from '../hooks/useLanguage';
import { getChangelog } from '../data/changelog';
import { version as APP_VERSION } from '../../package.json';
import './SideMenu.css';

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷', shortLabel: 'PT-BR' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸', shortLabel: 'EN-US' },
  { code: 'fr-CA', label: 'Français (Canada)', flag: '🇨🇦', shortLabel: 'FR-CA' },
];

export const SideMenu = ({
  onOpenSettings,
  userName,
  userPhotoUrl,
  auth,
  syncStatus,
  compact = false,
  openFrom = 'right',
  notifications = [],
  pendingNotificationsCount = 0,
  hasLoadedNotifications = false,
  isLoadingNotifications = false,
  notificationsError = null,
  onRefreshNotifications,
  onAcceptFriendNotification,
  onAcceptGameInviteNotification,
  onDismissNotification,
}) => {
  const { t, language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [processingNotificationId, setProcessingNotificationId] = useState('');
  const displayName = userName || auth?.user?.name || 'MeepleMind Player';
  const profilePhoto = userPhotoUrl || auth?.user?.picture || '/user_icon.png';
  const whatsNew = getChangelog(language, 4);
  const pendingNotifications = (Array.isArray(notifications) ? notifications : []).filter(
    (item) => item.status === 'pending'
  );
  const shouldShowNotificationsLoading = isLoadingNotifications && !hasLoadedNotifications;
  const unreadCount = Number.isFinite(pendingNotificationsCount)
    ? pendingNotificationsCount
    : pendingNotifications.length;

  useEffect(() => {
    if (!isOpen || !onRefreshNotifications) return;
    onRefreshNotifications();
  }, [isOpen, onRefreshNotifications]);

  const formatTemplate = (key, replacements = {}) => {
    let text = t(key);
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replaceAll(`{${placeholder}}`, String(value));
    });
    return text;
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Intl.DateTimeFormat(language, {
        day: '2-digit',
        month: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return '';
    }
  };

  const handleAcceptNotification = async (notification) => {
    if (!notification?.id) return;

    const action =
      notification.type === 'friend-request'
        ? onAcceptFriendNotification
        : onAcceptGameInviteNotification;

    if (!action) return;

    setProcessingNotificationId(notification.id);
    try {
      await action(notification.id);
      if (onRefreshNotifications) {
        await onRefreshNotifications({ silent: true });
      }
    } finally {
      setProcessingNotificationId('');
    }
  };

  const handleDismissNotification = async (notificationId) => {
    if (!notificationId || !onDismissNotification) return;
    setProcessingNotificationId(notificationId);
    try {
      await onDismissNotification(notificationId);
      if (onRefreshNotifications) {
        await onRefreshNotifications({ silent: true });
      }
    } finally {
      setProcessingNotificationId('');
    }
  };

  const handleLanguageChange = (newLanguage) => {
    if (newLanguage === language) return;
    changeLanguage(newLanguage);
    // Pequeno delay para garantir que a mudança foi processada
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <>
      {/* Menu trigger */}
      <button
        className={`hamburger-btn ${compact ? 'compact' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('menu.settings')}
      >
        <Menu size={20} className="menu-trigger-icon" />
        {unreadCount > 0 && (
          <span className="menu-notification-badge" aria-label={t('menu.notifications')}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && <div className="menu-overlay" onClick={() => setIsOpen(false)} />}

      {/* Side Menu */}
      <div className={`side-menu ${openFrom === 'right' ? 'from-right' : 'from-left'} ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <button
            className="close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="menu-content">
          <div className="menu-profile-card">
            <img
              src={profilePhoto}
              alt={displayName}
              className="menu-user-avatar"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.src = '/user_icon.png';
              }}
            />
            <div className="menu-user-details">
              <strong className="menu-user-name">{displayName}</strong>
            </div>
          </div>

          <div className="menu-section">
            <div className="section-items">
              <button
                className="menu-item"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  setIsOpen(false);
                }}
                title={t('menu.settings')}
              >
                <Settings size={18} className="menu-icon" />
                <span>{t('menu.settings')}</span>
              </button>
            </div>
          </div>

          <div className="menu-section">
            <h4 className="section-title"><Bell size={14} /> {t('menu.notifications')}</h4>
            {shouldShowNotificationsLoading ? (
              <p className="menu-notification-empty">{t('menu.notificationsLoading')}</p>
            ) : notificationsError ? (
              <p className="menu-notification-empty error">{t('menu.notificationsLoadError')}</p>
            ) : pendingNotifications.length === 0 ? (
              <p className="menu-notification-empty">{t('menu.notificationsEmpty')}</p>
            ) : (
              <div className="menu-notification-list">
                {pendingNotifications.map((notification) => {
                  const fromName =
                    notification.fromDisplayName ||
                    notification.friend?.displayName ||
                    t('stats.notAvailable');
                  const gameName = notification.game?.game || t('stats.notAvailable');
                  const isFriendRequest = notification.type === 'friend-request';
                  const isProcessing = processingNotificationId === notification.id;

                  return (
                    <article key={notification.id} className="menu-notification-item">
                      <div className="menu-notification-header">
                        <strong>
                          {isFriendRequest
                            ? t('menu.notificationFriendRequestTitle')
                            : t('menu.notificationGameInviteTitle')}
                        </strong>
                        <span>{formatNotificationDate(notification.createdAt)}</span>
                      </div>

                      <p className="menu-notification-message">
                        {isFriendRequest
                          ? formatTemplate('menu.notificationFriendRequestBody', {
                            name: fromName,
                          })
                          : formatTemplate('menu.notificationGameInviteBody', {
                            name: fromName,
                            game: gameName,
                          })}
                      </p>

                      <div className="menu-notification-actions">
                        <button
                          type="button"
                          className="menu-notification-btn accept"
                          onClick={() => handleAcceptNotification(notification)}
                          disabled={isProcessing}
                        >
                          {isFriendRequest ? <UserPlus size={13} /> : <Gamepad2 size={13} />}
                          {isFriendRequest
                            ? t('menu.notificationAcceptFriend')
                            : t('menu.notificationRegisterGame')}
                        </button>

                        <button
                          type="button"
                          className="menu-notification-btn dismiss"
                          onClick={() => handleDismissNotification(notification.id)}
                          disabled={isProcessing}
                        >
                          <X size={13} />
                          {t('menu.notificationDismiss')}
                        </button>
                      </div>

                      {isProcessing && (
                        <p className="menu-notification-status">
                          <Check size={12} /> {t('menu.notificationProcessing')}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="menu-section">
            <button
              type="button"
              className="menu-collapsible-btn"
              onClick={() => setIsWhatsNewOpen((prev) => !prev)}
              aria-expanded={isWhatsNewOpen}
            >
              <span className="menu-collapsible-title">
                <Newspaper size={14} />
                {whatsNew.title}
              </span>
              {isWhatsNewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isWhatsNewOpen && (
              <ul className="menu-whats-new-list">
                {whatsNew.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Language Section */}
          <div className="menu-section">
            <h4 className="section-title"><Languages size={14} /> {t('common.language')}</h4>
            <div className="section-items">
              <div className="language-flags-menu" role="group" aria-label={t('common.language')}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`language-flag-btn ${language === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    title={lang.label}
                    aria-label={lang.label}
                  >
                    <span className="language-flag-icon" aria-hidden="true">{lang.flag}</span>
                    <span className="language-flag-label">{lang.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {auth?.isConfigured && (
          <div className="menu-footer">
            <GoogleAuthButton auth={auth} syncStatus={syncStatus} />
            <div className="app-version">
              <span>{t('menu.version', 'Versão')} {APP_VERSION}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
