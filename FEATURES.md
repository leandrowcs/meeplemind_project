# ✨ MeepleMind - Feature Reference

## 🎮 Telas Principais

### 🏠 Home
Visão geral rápida do seu histórico:
- Total de partidas registradas
- Jogador com mais vitórias
- Jogo mais jogado
- Botão grande para nova partida
- Links para Histórico e Stats

### ➕ Nova Partida
Registro rápido de partidas:
- **Autocomplete de Jogos**: Seleciona ou cria novo
- **Adição de Jogadores**: Autocomplete + botão +, mínimo 2 jogadores
- **Pontuação**: Campo numérico para cada jogador
- **Seleção do Vencedor**: Destaque visual entre os jogadores
- **Duração**: Présets (30, 60, 90, 120 min) + campo livre
- **Submissão**: Salva no localStorage e volta para home

### 📜 Histórico
Visualização de todas as partidas:
- **Ordem**: Mais recentes primeiro
- **Filtro por Jogo**: Botões de filtro rápido
- **Cards com Info**: Jogo, vencedor, jogadores, duração, data
- **Ranking de Jogadores**: Mostra posição de cada um
- **Delete**: Botão 🗑️ para remover partidas
- **Stats do Jogo Filtrado**: Quando seleciona um jogo

### 🏆 Estatísticas
Análise completa dos dados:
- **Resumo**: Total de partidas, jogos diferentes, jogadores únicos
- **Top Vencedores**: Ranking com barras de progresso
- **Jogos Mais Jogados**: Frequência de cada jogo
- **Participações**: Cada jogador com participações e taxa de vitória

---

## 💾 Dados & localStorage

### Estrutura de um Jogo
```javascript
{
  id: "uuid-unique-id",
  game: "Nome do Jogo",
  players: ["Jogador 1", "Jogador 2", "Jogador 3"],
  points: [100, 95, 80],
  winner: "Jogador 1",
  duration: 120, // em minutos, pode ser null
  date: "2026-04-14T20:30:00.000Z"
}
```

### Key no localStorage
- **Key**: `meeplemind_games`
- **Value**: Array JSON de todo o histórico

### Como testar dados
1. Cole o código de [SAMPLE_DATA.js](SAMPLE_DATA.js) no console (F12)
2. Atualize a página
3. Verá dados de exemplo

---

## 🎨 Design System

### Cores
| Uso | Hex | RGB |
|---|---|---|
| Primary | #1e40af | 30, 64, 175 |
| Accent | #ea580c | 234, 88, 12 |
| Background | #0f172a | 15, 23, 42 |
| Secondary BG | #1a2744 | 26, 39, 68 |
| Text Primary | #f1f5f9 | 241, 245, 249 |
| Text Secondary | #cbd5e1 | 203, 213, 225 |
| Border | #334155 | 51, 65, 85 |
| Success | #10b981 | 16, 185, 129 |
| Error | #ef4444 | 239, 68, 68 |

### Spacing (em rem)
- xs: 0.25rem
- sm: 0.5rem
- md: 1rem
- lg: 1.5rem
- xl: 2rem
- 2xl: 3rem

### Border Radius
- sm: 0.375rem
- md: 0.5rem ⭐ padrão
- lg: 0.75rem
- full: 9999px (pills)

---

## 🪤 Componentes React

### Home.jsx
Props: `onNavigate(page)`
- Renderiza stats do hook
- Botões de navegação

### NewGame.jsx
Props: `onNavigate`, `onSave(gameData)`, `uniqueGames`, `uniquePlayers`
- Form controlado com state local
- Suggestions com autocomplete
- Validação básica

### History.jsx
Props: `onNavigate`, `games`, `onDelete(id)`, `uniqueGames`
- Renderiza lista de cards
- Filtro dinâmico
- Delete com confirmação

### Stats.jsx
Props: `onNavigate`, `games`, `stats (objeto)`
- Cards de resumo
- Leaderboards com progressbars
- Cálculos de participação

---

## 🔧 Hook useGames

### Retorna
```javascript
{
  games: [],              // Array de todos os games
  isLoading: false,       // Carregando do localStorage
  addGame(data),          // Salva novo game
  deleteGame(id),         // Remove por ID
  updateGame(id, updates),// Atualiza parcialmente
  getStats(),             // Retorna stats object
  getUniqueGames(),       // Array de nomes únicos
  getUniquePlayers(),     // Array de jogadores únicos
  filterGamesByName(name) // Filter helper
}
```

### Stats Object
```javascript
{
  totalGames: 5,
  uniqueGames: 3,
  totalPlayers: 4,
  topWinner: "Leandro",
  topWinnerWins: 3,
  mostPlayedGame: "Terraforming Mars",
  mostPlayedGameCount: 2
}
```

---

## 📱 Responsividade

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

Layouts ajustados em:
- `.home-container`
- `.newgame-container`
- `.history-container`
- `.stats-container`

---

## 🚀 Performance

- Build: 209 KB (gzip 64 KB) ⚡
- Zero dependencies críticas
- localStorage nativo do navegador
- React 19 com React.StrictMode

---

## 🐛 Debugging

### Console
```javascript
// Ver todos os games
JSON.parse(localStorage.getItem('meeplemind_games'))

// Limpar todos os dados
localStorage.removeItem('meeplemind_games')

// Exportar dados
copy(JSON.parse(localStorage.getItem('meeplemind_games')))
```

### React DevTools
- Check component tree
- Inspecione state por pagina
- Verify useGames hook data

---

**Tudo pronto para começar a registrar partidas! 🎲**
