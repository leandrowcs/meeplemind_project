# 🎲 MeepleMind

Um web app simples e rápido para registrar partidas de boardgames com amigos, consultar histórico e acompanhar estatísticas.

## ✨ Características

- **Registrar Partidas**: Nome do jogo, jogadores, pontuação, vencedor e duração
- **Histórico**: Lista todas as partidas com filtro por jogo
- **Estatísticas**: Top vencedores, jogos mais jogados e participações
- **Autocomplete**: Sugere jogos e jogadores já cadastrados
- **Sem Backend**: Dados salvos 100% em localStorage do navegador
- **Dark Mode**: Interface escura com tema azul + laranja
- **Responsivo**: Funciona perfeitamente em mobile

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

O app estará disponível em `http://localhost:5173`

## 📦 Stack

- **Frontend**: React 18 + Vite
- **Armazenamento**: localStorage
- **Styling**: CSS vanilla com variáveis de cor
- **Build Tool**: Vite

## 🌐 Deploy no GitHub Pages

### 1. Preparar o repositório

```bash
git init
git add .
git commit -m "Initial commit: MeepleMind MVP"
git remote add origin https://github.com/SEU_USUARIO/MeepleMind_project.git
git branch -M main
git push -u origin main
```

### 2. Configurar vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MeepleMind_project/', // Se for subdomain, ajuste conforme necessário
})
```

### 3. Build e Deploy

```bash
npm run build

# Instalar gh-pages (opcional, para deploy automático)
npm install --save-dev gh-pages
```

### 4. Opção A: Deploy manual

```bash
# Build local
npm run build

# Copiar pasta dist para gh-pages branch
git worktree add dist gh-pages
cp -r dist/* dist/
cd dist && git add . && git commit -m "Deploy" && git push
cd .. && git worktree remove dist
```

### 5. Opção B: GitHub Actions (automático)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Depois push para main e o GitHub Actions fará o deploy automaticamente!

## 📱 Como Usar

### Home
- Veja resumo de partidas, top vencedor e jogo mais jogado
- Clique no botão grande "Nova Partida" para registrar

### Nova Partida
1. Selecione o jogo (autocomplete)
2. Adicione jogadores (autocomplete)
3. Coloque pontuação de cada um
4. Selecione o vencedor
5. (Opcional) Coloque duração da partida
6. Clique em "Registrar Partida"

### Histórico
- Veja todas as partidas em ordem reversa (mais recente primeiro)
- Filtre por jogo
- Delete partidas se necessário

### Statistics
- Top vencedores com número de vitórias
- Jogos mais jogados
- Participações e taxa de vitória de cada jogador

## 📊 Modelo de Dados

```json
{
  "id": "uuid",
  "game": "Terraforming Mars",
  "players": ["Leandro", "João", "Maria"],
  "points": [100, 90, 75],
  "winner": "Leandro",
  "duration": 120,
  "date": "2026-04-14T20:30:00.000Z"
}
```

## 🎨 Cores

- **Primary**: Azul `#1e40af`
- **Accent**: Laranja `#ea580c`
- **Background**: Dark Navy `#0f172a`
- **Text Primary**: Slate Light `#f1f5f9`

## 🔮 Melhorias Futuras

- [ ] Adicionar imagem do jogo (URL)
- [ ] Classificação/rating de partidas
- [ ] Notas sobre a partida
- [ ] Export de dados (CSV/JSON)
- [ ] Backup para nuvem
- [ ] Modo claro
- [ ] PWA - funcionar offline
- [ ] Multiplayer sincronizado

## 📝 Licença

Uso pessoal - sinta-se livre para modificar e personalizar!

---

**Desenvolvido com ❤️ para amigos e boardgames**
