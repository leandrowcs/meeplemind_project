import { useRef, useState } from 'react';
import {
  DatabaseBackup,
  ExternalLink,
  Globe,
  House,
  RefreshCw,
  Settings,
  UserRound,
} from 'lucide-react';
import { Button } from './Button';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useLanguage } from '../hooks/useLanguage';
import './AppSettings.css';

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_PROXY_BASE = import.meta.env.DEV ? '/bggapi' : BGG_BASE;
const BGG_OFFLINE_CACHE_KEY = 'meeplemind-bgg-hot-offline';
const BGG_SITE_URL = 'https://boardgamegeek.com';

const LANGUAGES = [
  { code: 'pt-BR', labelKey: 'settings.languageOptionPtBr', flag: '🇧🇷' },
  { code: 'en-US', labelKey: 'settings.languageOptionEnUs', flag: '🇺🇸' },
  { code: 'fr-CA', labelKey: 'settings.languageOptionFrCa', flag: '🇨🇦' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchBGGHotXml = async (maxRetries = 4) => {
  const endpoint = `${BGG_PROXY_BASE}/hot?type=boardgame`;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const response = await fetch(endpoint, { credentials: 'omit' });

    // BGG may return transient responses while hot list is warming up.
    if (response.status === 202 || response.status === 401) {
      await sleep(1200 * (attempt + 1));
      continue;
    }

    if (!response.ok) throw new Error(`BGG ${response.status}`);
    return response.text();
  }

  throw new Error('BGG timeout');
};

const buildBGGOfflinePayload = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'))
    .map((item) => ({
      id: item.getAttribute('id') || '',
      rank: Number.parseInt(item.getAttribute('rank') || '', 10) || null,
      name: item.querySelector('name')?.getAttribute('value') || '',
      thumbnail: item.querySelector('thumbnail')?.getAttribute('value') || '',
      yearPublished: item.querySelector('yearpublished')?.getAttribute('value') || '',
    }))
    .filter((item) => item.name);

  return {
    generatedAt: new Date().toISOString(),
    source: 'bgg-hot-boardgames',
    total: items.length,
    items,
  };
};

const downloadBGGOfflinePayload = (payload) => {
  const stamp = (payload.generatedAt || new Date().toISOString()).slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = `meeplemind-bgg-offline-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(blobUrl);
};

const getPreferredBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return 'pt-BR';
  return (
    navigator.languages?.[0] ||
    navigator.language ||
    navigator.userLanguage ||
    'pt-BR'
  );
};

export const AppSettings = ({
  onNavigate,
  displayPlayerName,
  googlePhotoUrl,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  clearAllData,
  auth,
  syncStatus,
}) => {
  const { language, changeLanguage, t } = useLanguage();
  const importInputRef = useRef(null);
  const [bggSyncState, setBggSyncState] = useState('idle');
  const browserLanguage = getPreferredBrowserLanguage();

  const selectedLanguage = LANGUAGES.find((item) => item.code === language);
  const currentLanguageLabel = selectedLanguage
    ? t(selectedLanguage.labelKey)
    : language;

  const profilePhoto = googlePhotoUrl || auth?.user?.picture || '/user_icon.png';
  const profileName = displayPlayerName || auth?.user?.name || 'MeepleMind Player';
  const isGoogleConfigured = Boolean(auth?.isConfigured);
  const isGoogleConnected = Boolean(auth?.isSignedIn);

  const googleConnectionLabel = !isGoogleConfigured
    ? t('settings.googleConnectionUnavailable')
    : isGoogleConnected
      ? t('settings.googleConnectionActive')
      : t('settings.googleConnectionInactive');

  const bggSyncFeedback = {
    loading: t('settings.bggSyncGenerating'),
    success: t('settings.bggSyncSuccess'),
    error: t('settings.bggSyncError'),
  }[bggSyncState] || '';

  const handleLanguageChange = (newLanguage) => {
    if (newLanguage === language) return;
    changeLanguage(newLanguage);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      importFromJSON(file);
      event.target.value = '';
    }
  };

  const handleClearData = () => {
    const confirmed = window.confirm(
      `${t('menu.clearDataWarning')}\n${t('menu.clearDataConfirm')}`
    );
    if (confirmed) {
      clearAllData();
    }
  };

  const handleSyncWithBGG = async () => {
    if (bggSyncState === 'loading') return;

    setBggSyncState('loading');
    try {
      const xml = await fetchBGGHotXml();
      const payload = buildBGGOfflinePayload(xml);
      localStorage.setItem(BGG_OFFLINE_CACHE_KEY, JSON.stringify(payload));
      downloadBGGOfflinePayload(payload);
      setBggSyncState('success');
    } catch {
      setBggSyncState('error');
    }
  };

  return (
    <div className="settings-page fade-in">
      <header className="settings-header">
        <div className="settings-title-wrap">
          <span className="settings-title-icon">
            <Settings size={18} />
          </span>
          <h1>{t('settings.title')}</h1>
        </div>
      </header>

      <main className="settings-content">
        <section className="settings-card">
          <h2>
            <UserRound size={16} /> {t('settings.accountTitle')}
          </h2>

          <div className="settings-profile-row">
            <img
              src={profilePhoto}
              alt={profileName}
              className="settings-profile-avatar"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.src = '/user_icon.png';
              }}
            />
            <strong>{profileName}</strong>
          </div>

          <div className="settings-google-connection">
            <p className="settings-google-status">
              <span>{t('settings.googleConnectionLabel')}</span>
              <strong
                className={`settings-google-status-badge ${
                  !isGoogleConfigured
                    ? 'unavailable'
                    : isGoogleConnected
                      ? 'active'
                      : 'inactive'
                }`}
              >
                {googleConnectionLabel}
              </strong>
            </p>

            {isGoogleConfigured ? (
              <div className="settings-google-auth">
                <GoogleAuthButton auth={auth} syncStatus={syncStatus} />
              </div>
            ) : (
              <p className="settings-google-hint">{t('settings.googleConnectionHint')}</p>
            )}
            <p className="settings-google-info">{t('settings.googleConnectionAccessInfo')}</p>
            <p className="settings-google-info">{t('settings.googleConnectionDurationInfo')}</p>
          </div>
        </section>

        <section className="settings-card">
          <h2>
            <RefreshCw size={16} /> {t('settings.bggSyncTitle')}
          </h2>

          <div className="settings-bgg-brand">
            <img
              src="/bgg-logo.svg"
              alt={t('settings.bggLogoAlt')}
              className="settings-bgg-logo"
            />
            <div className="settings-bgg-brand-copy">
              <p className="settings-bgg-brand-title">
                <a
                  href={BGG_SITE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="settings-bgg-link"
                >
                  BoardGameGeek
                </a>
                <ExternalLink size={13} aria-hidden="true" />
              </p>
              <p>{t('settings.bggExternalDescription')}</p>
            </div>
          </div>

          <p className="settings-bgg-legal">{t('settings.bggLegalNotice')}</p>
          <p className="settings-card-note">{t('settings.bggSyncOfflineHint')}</p>

          <button
            type="button"
            className="settings-sync-btn"
            onClick={handleSyncWithBGG}
            disabled={bggSyncState === 'loading'}
          >
            <RefreshCw
              size={14}
              className={bggSyncState === 'loading' ? 'settings-spin' : ''}
            />
            {bggSyncState === 'loading'
              ? t('settings.bggSyncGenerating')
              : t('settings.bggSyncButton')}
          </button>

          {bggSyncFeedback && (
            <p className={`settings-sync-feedback ${bggSyncState}`}>{bggSyncFeedback}</p>
          )}
        </section>

        <section className="settings-card">
          <h2>
            <DatabaseBackup size={16} /> {t('menu.dataBackup')}
          </h2>

          <div className="settings-actions-list">
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => exportToCSV(language)}
              title={t('home.exportCSVTitle')}
            >
              <span className="settings-action-title">{t('home.exportCSV')}</span>
              <span className="settings-action-description">
                {t('settings.backupCsvDescription')}
              </span>
            </button>

            <button
              type="button"
              className="settings-action-btn"
              onClick={() => exportToJSON()}
              title={t('home.backupJSONTitle')}
            >
              <span className="settings-action-title">{t('home.backupJSON')}</span>
              <span className="settings-action-description">
                {t('settings.backupJsonDescription')}
              </span>
            </button>

            <button
              type="button"
              className="settings-action-btn"
              onClick={() => importInputRef.current?.click()}
              title={t('home.importJSONTitle')}
            >
              <span className="settings-action-title">{t('home.importJSON')}</span>
              <span className="settings-action-description">
                {t('settings.backupImportDescription')}
              </span>
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="settings-import-input"
            />

            <button
              type="button"
              className="settings-action-btn danger"
              onClick={handleClearData}
              title={t('menu.clearDataTitle')}
            >
              <span className="settings-action-title">{t('menu.clearData')}</span>
              <span className="settings-action-description">
                {t('settings.backupClearDescription')}
              </span>
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>
            <Globe size={16} /> {t('settings.languageTitle')}
          </h2>
          <p>{t('settings.languageDescription')}</p>

          <div
            className="settings-language-grid"
            role="group"
            aria-label={t('settings.languageTitle')}
          >
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`settings-language-btn ${
                  language === item.code ? 'active' : ''
                }`}
                onClick={() => handleLanguageChange(item.code)}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
              >
                <span className="settings-language-flag" aria-hidden="true">
                  {item.flag}
                </span>
                <span className="settings-language-label">{t(item.labelKey)}</span>
              </button>
            ))}
          </div>

          <div className="settings-language-meta">
            <p>
              <span>{t('settings.currentLanguage')}</span>
              <strong>{currentLanguageLabel}</strong>
            </p>
            <p>
              <span>{t('settings.deviceLanguage')}</span>
              <strong>{browserLanguage}</strong>
            </p>
          </div>
        </section>

        <Button
          variant="primary"
          onClick={() => onNavigate('home')}
          className="settings-back-btn"
        >
          <House size={16} /> {t('settings.backHome')}
        </Button>
      </main>
    </div>
  );
};
