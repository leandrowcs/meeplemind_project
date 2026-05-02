# 🎲 MeepleMind

Um web app simples e rápido para registrar partidas de boardgames com amigos, consultar histórico e acompanhar estatísticas.

## ✨ Características

- **Registrar Partidas**: Nome do jogo, jogadores, pontuação, vencedor e duração
- **Histórico**: Lista todas as partidas com filtro por jogo
- **Estatísticas**: Top vencedores, jogos mais jogados e participações
- **Autocomplete**: Sugere jogos e jogadores já cadastrados
- **Backend Opcional**: OAuth seguro da Ludopedia via BFF Node local
- **Dark Mode**: Interface escura com tema azul + laranja
- **Responsivo**: Funciona perfeitamente em mobile

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Backend OAuth Ludopedia (terminal separado)
npm run dev:ludopedia

# Build para produção
npm run build

# Preview do build
npm run preview
```

O app estará disponível em `http://localhost:5173`

## 📦 Stack

- **Frontend**: React 18 + Vite
- **Backend opcional**: Node.js (BFF OAuth para Ludopedia)
- **Armazenamento**: localStorage
- **Styling**: CSS vanilla com variáveis de cor
- **Build Tool**: Vite

## OAuth Ludopedia (Fase 2)

Configure variáveis de ambiente antes de iniciar o backend local:

O backend `npm run dev:ludopedia` carrega automaticamente `.env` e `.env.local`.

```bash
LUDOPEDIA_APP_ID=seu_app_id
LUDOPEDIA_REDIRECT_URI=http://localhost:8787/api/ludopedia/oauth/callback
LUDOPEDIA_FRONTEND_RETURN_URL=http://localhost:5173
LUDOPEDIA_SESSION_SECRET=troque_por_um_segredo_longo
MEEPLEMIND_ALLOWED_ORIGINS=http://localhost:5173
LUDOPEDIA_BACKEND_PORT=8787
LUDOPEDIA_COOKIE_SECURE=0

# Opcional (frontend): recomendado em localhost para usar proxy do Vite
VITE_LUDOPEDIA_BFF_BASE=/api/ludopedia
```

Se usar URL absoluta (`http://localhost:8787/api/ludopedia`), ajuste o `connect-src` da CSP em `index.html`.

Fluxo OAuth oficial aplicado no backend:

- `GET /oauth?app_id=...&redirect_uri=...`
- callback com `code`
- `POST /tokenrequest` enviando apenas `code`

Endpoints principais do backend:

- `GET /api/ludopedia/oauth/start`
- `GET /api/ludopedia/oauth/callback`
- `GET /api/ludopedia/oauth/session`
- `POST /api/ludopedia/oauth/logout`
- `GET /api/ludopedia/jogos`
- `GET /api/ludopedia/jogos/{id_jogo}`

## Deploy na Vercel (passo a passo)

Para `https://meeplemind.vercel.app` funcionar com Ludopedia, o frontend precisa de um backend OAuth publico.

### 1. Subir o backend OAuth (Railway, Render, Fly.io ou VPS)

Use este comando de start no backend:

```bash
node server/ludopedia-oauth-server.mjs
```

Configure variaveis no backend:

```bash
LUDOPEDIA_APP_ID=seu_app_id
LUDOPEDIA_REDIRECT_URI=https://meeplemind.vercel.app/api/ludopedia/oauth/callback
LUDOPEDIA_FRONTEND_RETURN_URL=https://meeplemind.vercel.app
MEEPLEMIND_ALLOWED_ORIGINS=https://meeplemind.vercel.app
LUDOPEDIA_SESSION_SECRET=troque_por_um_segredo_longo
LUDOPEDIA_COOKIE_SECURE=1
```

Observacoes:

- `LUDOPEDIA_REDIRECT_URI` deve ser igual no backend e no cadastro do app Ludopedia.
- `LUDOPEDIA_COOKIE_SECURE=1` e obrigatorio em producao HTTPS.

### 2. Criar rewrite na Vercel para manter mesma origem

Crie `vercel.json` na raiz do projeto:

```json
{
  "rewrites": [
    {
      "source": "/api/ludopedia/:path*",
      "destination": "https://SEU_BACKEND_PUBLICO/api/ludopedia/:path*"
    }
  ]
}
```

Isso faz o app chamar `meeplemind.vercel.app/api/ludopedia/...` e a Vercel encaminhar para seu backend.

### 3. Configurar variavel do frontend na Vercel

No projeto Vercel (Settings > Environment Variables):

```bash
VITE_LUDOPEDIA_BFF_BASE=/api/ludopedia
```

Depois, redeploy do frontend.

### 4. Validar endpoints em producao

Teste no terminal:

```bash
curl -s https://meeplemind.vercel.app/api/ludopedia/health
curl -s https://meeplemind.vercel.app/api/ludopedia/oauth/session
```

Esperado:

- `health` com `"ok": true` e `"oauthConfigured": true`
- `session` com `"available": true`

### 5. Testar no app

No app publicado:

1. Abra Configuracoes.
2. Verifique status Ludopedia como disponivel.
3. Clique em Conectar Ludopedia.
4. Autorize na Ludopedia e volte ao app.

### 6. Erros comuns

- `available: false`: faltam `LUDOPEDIA_APP_ID` ou `LUDOPEDIA_REDIRECT_URI` no backend.
- callback falha: redirect URI diferente entre Ludopedia e backend.
- sem sessao apos conectar: rewrite ausente ou backend fora do ar.

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

## 📝 Licença

Uso pessoal - sinta-se livre para modificar e personalizar!

---

### **Desenvolvido com ❤️ para amigos e boardgames**
