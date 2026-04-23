import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Languages,
  Menu,
  Newspaper,
  Settings,
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
}) => {
  const { t, language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const displayName = userName || auth?.user?.name || 'MeepleMind Player';
  const profilePhoto = userPhotoUrl || auth?.user?.picture || '/user_icon.png';
  const whatsNew = getChangelog(language, 5);

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
