# 📚 Estrutura do Projeto MeepleMind

```
MeepleMind_project/
├── 📄 index.html                    # Entrada HTML
├── 📄 package.json                  # Dependências e scripts
├── 📄 vite.config.js                # Configuração Vite
├── 📄 eslint.config.js              # Linting config
├── 🚀 README.md                     # Guia principal
├── 📋 FEATURES.md                   # Referência de features
├── 🚀 DEPLOYMENT.md                 # Guia de deploy
├── 💾 SAMPLE_DATA.js                # Dados de exemplo
│
├── 📁 src/
│   ├── 📄 main.jsx                  # Entry point React
│   ├── 📄 App.jsx                   # Root component c/ navegação
│   ├── 🎨 App.css                   # App styles
│   ├── 🎨 index.css                 # Global styles + theme
│   │
│   ├── 📁 components/
│   │   ├── Button.jsx               # Componentes reutilizáveis
│   │   ├── Button.css               # Estilos de buttons
│   │   ├── Home.jsx                 # Tela inicial
│   │   ├── Home.css                 # Estilos home
│   │   ├── NewGame.jsx              # Registro de partidas
│   │   ├── NewGame.css              # Estilos form
│   │   ├── History.jsx              # Histórico com filtro
│   │   ├── History.css              # Estilos histórico
│   │   ├── Stats.jsx                # Estatísticas completas
│   │   └── Stats.css                # Estilos stats
│   │
│   ├── 📁 hooks/
│   │   └── useGames.js              # Hook localStorage + lógica
│   │
│   ├── 📁 utils/                    # (vazio, pronto p/ expansão)
│   │
│   └── 📁 assets/                   # (imagens futuras)
│
├── 📁 dist/                         # Build output (criado por npm run build)
├── 📁 node_modules/                 # Dependencies
│
├── 📁 public/                       # Assets estáticos
│
└── 📁 .github/
    └── 📁 workflows/
        └── 📄 deploy.yml            # GitHub Actions workflow
```

---

## 🎯 Componentes Principais

### **src/App.jsx**
- Estado de navegação (currentPage)
- Conecta com useGames hook
- Renderiza componentes por página
- Atualiza stats da Home

### **src/hooks/useGames.js** (❤️ Coração da app)
- Carrega/salva do localStorage
- CRUD de games (add, delete, update)
- Calcula stats
- Retorna unique values para autocomplete

### **src/components/**
- **Home.jsx**: Dashboard inicial
- **NewGame.jsx**: Form inteligente com autocomplete
- **History.jsx**: Lista filtrável com cards elegantes
- **Stats.jsx**: Leaderboards e análises
- **Button.jsx**: Botões reutilizáveis em múltiplas variações

---

## 📊 Data Flow

```
useGames Hook
    ↓
App.jsx (state + deriving stats)
    ├→ Home (lê stats)
    ├→ NewGame (recebe unique games/players, onSave)
    ├→ History (lê games, onDelete)
    └→ Stats (lê games, stats)
```

---

## 🔄 Ciclo de vida de uma Partida

1. **User clica "+ Nova Partida"** → `onNavigate('newgame')`
2. **NewGame carrega** com `uniqueGames` e `uniquePlayers`
3. **User preenche form** → state local em NewGame.jsx
4. **Submit** → `onSave(gameData)` chama `addGame()`
5. **addGame()** → cria UUID + timestamp, salva no localStorage
6. **useGames recarrega** → atualiza `games` state
7. **App detecta mudança** → recalcula `stats`
8. **Navigate para home** → mostra novo total

---

## 💻 Tech Stack Resumido

```
┌─────────────────────────────────┐
│       MeepleMind App            │
├─────────────────────────────────┤
│     React 19.2 Components       │
├─────────────────────────────────┤
│  Custom Hooks (useGames)        │
├─────────────────────────────────┤
│   CSS Variables + Grid/Flex     │
├─────────────────────────────────┤
│  localStorage (Browser APIs)    │
├─────────────────────────────────┤
│    Vite Build Tool              │
└─────────────────────────────────┘
```

**Zero servidor, zero database, zero custo! 🎉**

---

## 📦 Dependências

```json
{
  "dependencies": {
    "react": "^19.2.4",        // UI library
    "react-dom": "^19.2.4",    // React DOM
    "uuid": "^13.0.0"          // ID generation
  }
}
```

Tudo rodandodesde o navegador! 🚀

---

## 🎨 CSS Architecture

```
index.css (Global)
├── CSS Variables (--color-*, --spacing-*, etc)
├── Base styles (*, html, body)
├── Typography (h1, h2, h3, p)
├── Animations (@keyframes)
└── Utilities (.fade-in, .slide-in)

Button.css
├── .btn-* variants (primary, accent, danger, etc)
├── .btn-* sizes (sm, md, lg, xl)
└── .icon-btn

Home.css, NewGame.css, History.css, Stats.css
└── Specific component styles
```

---

## 🔐 Security Notes

- ✅ localStorage apenas no dispositivo do user
- ✅ Sem envio de dados para servidor
- ✅ UUID gerado no client
- ✅ JSON stringified localmente
- ⚠️ Dados persistem se clear cache/cookies

---

## 🚀 Build & Deploy

```bash
# Development
npm install      # Once
npm run dev      # Repeat

# Production
npm run build    # Creates /dist
npm run preview  # Test build locally

# Deploy (escolhi um)
# Option 1: GitHub Pages + Actions
# Option 2: Vercel (1-click)
# Option 3: Manual upload
```

---

## 📝 Extensões Futuras (Fáceis!)

1. **Export CSV**
   ```javascript
   // Em utils/export.js
   const downloadCSV = (games) => { ... }
   ```

2. **Dark/Light mode**
   ```css
   html[data-theme="light"] { --color-bg: #fff; ... }
   ```

3. **Rating de partidas**
   ```javascript
   // Adicionar field "rating: 1-5" no game object
   ```

4. **Sync entre dispositivos**
   ```javascript
   // localStorage → Cloud (Firebase, Supabase)
   ```

---

**Estrutura simples, escalável e pronta para evolutções! 🎯**
