import { useState, useEffect } from 'react';
import { Button } from './Button';
import { useLanguage } from '../hooks/useLanguage';
import './SideMenu.css';

export const SideMenu = ({ onExportCSV, onExportJSON, onImportJSON, onClearData }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when language changes to ensure proper re-render
  useEffect(() => {
    setIsOpen(false);
  }, [language]);

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
          <h3>{t('home.manageData')}</h3>
          <button
            className="close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="menu-content">
          <button
            className="menu-item"
            onClick={() => {
              onExportCSV();
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
    </>
  );
};
