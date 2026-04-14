import { useState } from 'react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import logoImage from '../assets/meeplemind_logo.png';
import './Home.css';

export const Home = ({ onNavigate, exportToCSV, exportToJSON, importFromJSON }) => {
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromJSON(file);
      e.target.value = '';
    }
  };

  return (
    <>
      <ThemeToggle />
      <div className="home-container fade-in">
        <header className="home-header">
          <div className="logo">
            <img src={logoImage} alt="MeepleMind Logo" className="logo-image" />
          </div>
          <p className="tagline">Registre suas partidas • Veja suas estatísticas • Divirta-se</p>
        </header>

        <main className="home-content">
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-icon">🎮</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-games">0</span>
                <span className="stat-label">Partidas</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-winner">—</span>
                <span className="stat-label">Top Jogador</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎯</span>
              <div className="stat-info">
                <span className="stat-value" id="stat-game">—</span>
                <span className="stat-label">Mais Jogado</span>
              </div>
            </div>
          </div>

          <button
            className="btn-new-game"
            onClick={() => onNavigate('newgame')}
          >
            <span className="btn-icon">➕</span>
            <span>Nova Partida</span>
          </button>

          <div className="navigation-buttons">
            <Button
              variant="primary"
              onClick={() => onNavigate('history')}
              className="nav-btn"
            >
              📜 Histórico
            </Button>
            <Button
              variant="primary"
              onClick={() => onNavigate('stats')}
              className="nav-btn"
            >
              🏅 Estatísticas
            </Button>
          </div>

          {/* Export/Import Section */}
          <div className="export-section">
            <h3>Gerenciar Dados</h3>
            <div className="export-buttons">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToCSV}
                title="Exportar como CSV para planilha"
              >
                📊 Exportar CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToJSON}
                title="Backup dos seus dados em JSON"
              >
                💾 Backup JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('import-input').click()}
                title="Restaurar dados de um arquivo"
              >
                📥 Restaurar
              </Button>
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
