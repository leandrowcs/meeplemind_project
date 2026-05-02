import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  DatabaseBackup,
  Dices,
  ExternalLink,
  Globe,
  House,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from './Button';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useLanguage } from '../hooks/useLanguage';
import {
  BGG_OFFLINE_CACHE_KEY,
  GAME_DATA_PROVIDER,
  LUDOPEDIA_BFF_BASE,
  buildCatalogOfflinePayload,
  fetchProviderHotCatalogGames,
} from '../utils/gameDataProviders';
import './AppSettings.css';

const BGG_SITE_URL = 'https://boardgamegeek.com';
const LUDOPEDIA_SITE_URL = 'https://ludopedia.com.br';
const SHARE_TOGGLE_MAX_WAIT_MS = 15000;

const LANGUAGES = [
  { code: 'pt-BR', labelKey: 'settings.languageOptionPtBr', flag: '🇧🇷' },
  { code: 'en-US', labelKey: 'settings.languageOptionEnUs', flag: '🇺🇸' },
  { code: 'fr-CA', labelKey: 'settings.languageOptionFrCa', flag: '🇨🇦' },
];

const PROVIDER_MODE_OPTIONS = [
  { value: GAME_DATA_PROVIDER.AUTO, labelKey: 'settings.providerModeAuto' },
  { value: GAME_DATA_PROVIDER.BGG, labelKey: 'settings.providerModeBgg' },
  { value: GAME_DATA_PROVIDER.LUDOPEDIA, labelKey: 'settings.providerModeLudopedia' },
  { value: GAME_DATA_PROVIDER.BOTH, labelKey: 'settings.providerModeBoth' },
];

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
  gameDataProviderMode = GAME_DATA_PROVIDER.BGG,
  onChangeGameDataProviderMode,
  isPublic,
  publicShareError,
  setProfilePublic,
}) => {
  const { language, changeLanguage, t } = useLanguage();
  const importInputRef = useRef(null);
  const shareToggleGuardRef = useRef(null);
  const [bggSyncState, setBggSyncState] = useState('idle');
  const [ludopediaSession, setLudopediaSession] = useState({
    loading: true,
    available: false,
    connected: false,
  });
  const [ludopediaActionState, setLudopediaActionState] = useState('idle');
  const [ludopediaCallbackState, setLudopediaCallbackState] = useState('');
  const [isUpdatingPublicShare, setIsUpdatingPublicShare] = useState(false);
  const browserLanguage = getPreferredBrowserLanguage();

  useEffect(
    () => () => {
      if (shareToggleGuardRef.current) {
        clearTimeout(shareToggleGuardRef.current);
      }
    },
    []
  );

  const selectedLanguage = LANGUAGES.find((item) => item.code === language);
  const selectedProviderMode = PROVIDER_MODE_OPTIONS.find((item) => item.value === gameDataProviderMode);
  const currentLanguageLabel = selectedLanguage
    ? t(selectedLanguage.labelKey)
    : language;
  const currentProviderModeLabel = selectedProviderMode
    ? t(selectedProviderMode.labelKey)
    : t('settings.providerModeBgg');

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

  const loadLudopediaSession = useCallback(async () => {
    try {
      const response = await fetch(`${LUDOPEDIA_BFF_BASE}/oauth/session`, {
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const nextState = {
          loading: false,
          available: false,
          connected: false,
        };
        setLudopediaSession(nextState);
        return nextState;
      }

      const nextState = {
        loading: false,
        available: Boolean(payload?.available),
        connected: Boolean(payload?.connected),
      };
      setLudopediaSession(nextState);
      return nextState;
    } catch {
      const nextState = {
        loading: false,
        available: false,
        connected: false,
      };
      setLudopediaSession(nextState);
      return nextState;
    }
  }, []);

  useEffect(() => {
    const pageUrl = new URL(window.location.href);
    const callbackState = pageUrl.searchParams.get('ludopedia');
    if (!callbackState) return;

    if (callbackState === 'connected') {
      setLudopediaCallbackState('success');
    } else if (callbackState === 'error') {
      setLudopediaCallbackState('error');
    }

    pageUrl.searchParams.delete('ludopedia');
    pageUrl.searchParams.delete('reason');
    window.history.replaceState({}, '', `${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`);
  }, []);

  useEffect(() => {
    loadLudopediaSession();
  }, [loadLudopediaSession]);

  const handleConnectLudopedia = async () => {
    if (ludopediaActionState === 'loading') return;

    setLudopediaActionState('loading');
    const sessionState = await loadLudopediaSession();
    if (!sessionState?.available) {
      setLudopediaActionState('error');
      return;
    }

    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    const endpoint = `${LUDOPEDIA_BFF_BASE}/oauth/start?return_to=${encodeURIComponent(returnTo)}`;
    window.location.assign(endpoint);
  };

  const handleDisconnectLudopedia = async () => {
    if (ludopediaActionState === 'loading') return;

    setLudopediaActionState('loading');
    try {
      await fetch(`${LUDOPEDIA_BFF_BASE}/oauth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      await loadLudopediaSession();
      setLudopediaCallbackState('');
      setLudopediaActionState('success');
    } catch {
      setLudopediaActionState('error');
    }
  };

  const ludopediaStatusKey = ludopediaSession.loading
    ? 'settings.ludopediaConnecting'
    : !ludopediaSession.available
      ? 'settings.ludopediaStatusUnavailable'
      : ludopediaSession.connected
        ? 'settings.ludopediaStatusConnected'
        : 'settings.ludopediaStatusDisconnected';

  const ludopediaStatusClass = ludopediaSession.loading
    ? 'inactive'
    : !ludopediaSession.available
      ? 'unavailable'
      : ludopediaSession.connected
        ? 'active'
        : 'inactive';

  const ludopediaFeedback = (() => {
    if (ludopediaActionState === 'loading') return t('settings.ludopediaConnecting');
    if (ludopediaActionState === 'error') return t('settings.ludopediaActionError');
    if (ludopediaActionState === 'success') return t('settings.ludopediaDisconnectedFeedback');
    if (ludopediaCallbackState === 'success') return t('settings.ludopediaConnectedFeedback');
    if (ludopediaCallbackState === 'error') return t('settings.ludopediaActionError');
    return '';
  })();

  const ludopediaFeedbackClass = (() => {
    if (ludopediaActionState === 'loading') return 'loading';
    if (ludopediaActionState === 'error') return 'error';
    if (ludopediaActionState === 'success') return 'success';
    if (ludopediaCallbackState === 'success') return 'success';
    if (ludopediaCallbackState === 'error') return 'error';
    return '';
  })();

  const handleLanguageChange = (newLanguage) => {
    if (newLanguage === language) return;
    changeLanguage(newLanguage);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleProviderModeChange = (nextMode) => {
    if (!onChangeGameDataProviderMode) return;
    onChangeGameDataProviderMode(nextMode);
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
      const { items } = await fetchProviderHotCatalogGames({
        mode: GAME_DATA_PROVIDER.BGG,
        language,
      });
      const payload = buildCatalogOfflinePayload({
        providerId: GAME_DATA_PROVIDER.BGG,
        items,
      });
      localStorage.setItem(BGG_OFFLINE_CACHE_KEY, JSON.stringify(payload));
      downloadBGGOfflinePayload(payload);
      setBggSyncState('success');
    } catch {
      setBggSyncState('error');
    }
  };

  const handleShareToggle = async (event) => {
    const nextValue = event.target.checked;
    if (!setProfilePublic || isUpdatingPublicShare) return;

    setIsUpdatingPublicShare(true);
    if (shareToggleGuardRef.current) {
      clearTimeout(shareToggleGuardRef.current);
    }
    // Defensive unlock in case a promise hangs indefinitely.
    shareToggleGuardRef.current = setTimeout(() => {
      setIsUpdatingPublicShare(false);
    }, SHARE_TOGGLE_MAX_WAIT_MS);

    try {
      await setProfilePublic(nextValue);
    } catch {
      // The hook owns error state and rollback handling for this flow.
    } finally {
      if (shareToggleGuardRef.current) {
        clearTimeout(shareToggleGuardRef.current);
        shareToggleGuardRef.current = null;
      }
      setIsUpdatingPublicShare(false);
    }
  };

  return (
    <>
      <header className="settings-header">
        <div className="settings-title-wrap">
          <span className="settings-title-icon">
            <Settings size={18} />
          </span>
          <h1>{t('settings.title')}</h1>
        </div>
        <button
          type="button"
          className="newgame-header-back"
          onClick={() => onNavigate('home')}
        >
          <ChevronLeft size={16} />
          {t('common.back')}
        </button>
      </header>
      <div className="settings-page fade-in">
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

              <p className="settings-card-note">{t('settings.googleConnectionInfo')}</p>
              <p className="settings-card-note rules">{t('settings.googleConnectionSession')}</p>

              {isGoogleConfigured ? (
                <div className="settings-google-auth">
                  <GoogleAuthButton auth={auth} syncStatus={syncStatus} />

                  {isGoogleConnected && (
                    <div className="settings-share-toggle">
                      <label className="settings-share-label" htmlFor="settings-share-profile">
                        <span className="settings-share-text">
                          <strong>{t('friends.shareProfile')}</strong>
                          <span className="settings-card-note">{t('friends.shareProfileHint')}</span>
                        </span>
                        <input
                          id="settings-share-profile"
                          type="checkbox"
                          className="settings-share-checkbox"
                          checked={Boolean(isPublic)}
                          onChange={handleShareToggle}
                          disabled={isUpdatingPublicShare}
                          aria-label={t('friends.shareProfile')}
                        />
                        <span className="settings-share-switch" aria-hidden="true" />
                      </label>
                      {publicShareError && (
                        <p className="settings-share-error">{t('friends.shareProfileError')}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="settings-google-hint">{t('settings.googleConnectionHint')}</p>
              )}
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
              <ShieldCheck size={16} /> {t('settings.ludopediaOAuthTitle')}
            </h2>

            <div className="settings-bgg-brand">
              <img
                src="/ludopedia-logo.svg"
                alt="Ludopedia"
                className="settings-bgg-logo"
              />
              <div className="settings-bgg-brand-copy">
                <p className="settings-bgg-brand-title">
                  <a
                    href={LUDOPEDIA_SITE_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="settings-bgg-link"
                  >
                    Ludopedia
                  </a>
                  <ExternalLink size={13} aria-hidden="true" />
                </p>
                <p>{t('settings.ludopediaExternalDescription')}</p>
              </div>
            </div>

            <p className="settings-bgg-legal">{t('settings.ludopediaLegalNotice')}</p>
            <p className="settings-card-note">{t('settings.ludopediaOAuthHint')}</p>

            <p className="settings-google-status">
              <span>{t('settings.ludopediaStatusLabel')}</span>
              <strong className={`settings-google-status-badge ${ludopediaStatusClass}`}>
                {t(ludopediaStatusKey)}
              </strong>
            </p>

            <div className="settings-ludopedia-actions">
              <button
                type="button"
                className="settings-sync-btn"
                onClick={handleConnectLudopedia}
                disabled={ludopediaActionState === 'loading'}
              >
                <ShieldCheck size={14} />
                {ludopediaActionState === 'loading'
                  ? t('settings.ludopediaConnecting')
                  : t('settings.ludopediaConnectButton')}
              </button>

              <button
                type="button"
                className="settings-action-btn"
                onClick={handleDisconnectLudopedia}
                disabled={ludopediaActionState === 'loading' || !ludopediaSession.connected}
              >
                <span className="settings-action-title">{t('settings.ludopediaDisconnectButton')}</span>
              </button>
            </div>

            {ludopediaFeedback && (
              <p className={`settings-sync-feedback ${ludopediaFeedbackClass}`}>{ludopediaFeedback}</p>
            )}
          </section>

          <section className="settings-card">
            <h2>
              <Dices size={16} /> {t('settings.providerModeTitle')}
            </h2>

            <p>{t('settings.providerModeDescription')}</p>

            <div
              className="settings-provider-grid"
              role="group"
              aria-label={t('settings.providerModeTitle')}
            >
              {PROVIDER_MODE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`settings-provider-btn ${
                    gameDataProviderMode === item.value ? 'active' : ''
                  }`}
                  onClick={() => handleProviderModeChange(item.value)}
                  aria-pressed={gameDataProviderMode === item.value}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>

            <p className="settings-card-note">{t('settings.providerModeHint')}</p>

            <p className="settings-provider-current">
              <span>{t('settings.providerModeCurrent')}</span>
              <strong>{currentProviderModeLabel}</strong>
            </p>
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
    </>
  );
};
