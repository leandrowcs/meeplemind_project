import { useState } from 'react';
import { Button } from './Button';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useLanguage } from '../hooks/useLanguage';
import './SideMenu.css';

const APP_VERSION = '1.0.0';

const LANGUAGES = [
  { code: 'pt-BR', label: '🇧🇷 Português' },
  { code: 'en-US', label: '🇺🇸 English' },
  { code: 'fr-CA', label: '🇨🇦 Français' },
];

export const SideMenu = ({ onExportCSV, onExportJSON, onImportJSON, onClearData, auth, syncStatus }) => {
  const { t, language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  const handleClearData = () => {
    const confirmed = window.confirm(
      `${t('menu.clearDataWarning')}\n${t('menu.clearDataConfirm')}`
    );
    if (confirmed) {
      onClearData();
      setIsOpen(false);
    }
  };

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    // Pequeno delay para garantir que a mudança foi processada
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay */}
      {isOpen && <div className="menu-overlay" onClick={() => setIsOpen(false)} />}

      {/* Side Menu */}
      <div className={`side-menu ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3>⚙️ {t('menu.settings', 'Configurações')}</h3>
          <button
            className="close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="menu-content">
          {/* Dados & Backup Section */}
          <div className="menu-section">
            <h4 className="section-title">💾 {t('menu.dataBackup', 'Dados & Backup')}</h4>
            <div className="section-items">
              <button
                className="menu-item"
                onClick={() => {
                  onExportCSV(language);
                  setIsOpen(false);
                }}
                title={t('home.exportCSVTitle')}
              >
                <span className="menu-icon">📊</span>
                <span>{t('home.exportCSV')}</span>
              </button>

              <button
                className="menu-item"
                onClick={() => {
                  onExportJSON();
                  setIsOpen(false);
                }}
                title={t('home.backupJSONTitle')}
              >
                <span className="menu-icon">💾</span>
                <span>{t('home.backupJSON')}</span>
              </button>

              <button
                className="menu-item"
                onClick={() => document.getElementById('import-input-menu').click()}
                title={t('home.importJSONTitle')}
              >
                <span className="menu-icon">📂</span>
                <span>{t('home.importJSON')}</span>
              </button>

              <input
                id="import-input-menu"
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />

              <button
                className="menu-item danger"
                onClick={handleClearData}
                title={t('menu.clearDataTitle')}
              >
                <span className="menu-icon">🗑️</span>
                <span>{t('menu.clearData')}</span>
              </button>
            </div>
          </div>

          {/* Language Section */}
          <div className="menu-section">
            <h4 className="section-title">🌐 {t('common.language')}</h4>
            <div className="section-items">
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="language-select-menu"
                title={t('common.language')}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
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
