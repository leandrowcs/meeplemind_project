# 🚀 MeepleMind - Quick Start (5 minutos)

## 1️⃣ Rodar a App

```bash
cd d:\Projects\MeepleMind_project

# Instalar deps (primeira vez)
npm install

# Rodar dev
npm run dev
```

Pronto! Abra: **http://localhost:5173/**

---

## 2️⃣ Testar com Dados

Cole isso no **Console do Navegador** (F12):

```javascript
const data = [
  {
    id: "1", game: "Terraforming Mars", 
    players: ["Você", "Amigo"], points: [100, 90],
    winner: "Você", duration: 120,
    date: new Date().toISOString()
  }
];
localStorage.setItem('meeplemind_games', JSON.stringify(data));
location.reload();
```

---

## 3️⃣ Principais Funcionalidades

### 🏠 Home
- Clique no **botão laranja gigante** → Nova Partida

### ➕ Nova Partida
1. Escreva nome do jogo (autocomplete)
2. Clique **+** para adicionar jogadores
3. Coloque pontuação
4. Selecione o vencedor
5. Clique em verde **✓ Registrar Partida**

### 📜 Histórico
- Veja todas as partidas
- Filtre por jogo
- Delete com 🗑️

### 🏆 Stats
- Top vencedores
- Jogos mais jogados
- Taxa de vitória

---

## 4️⃣ Deploy (Escolha um)

### GitHub Pages (Automático)
```bash
# 1. Push para GitHub
git add .
git commit -m "Initial"
git push

# 2. Em Settings → Pages → GitHub Actions
# 3. Pronto! Estará em: https://user.github.io/MeepleMind_project/
```

### Vercel (Ultra fácil)
```bash
# 1. npm install -g vercel
# 2. vercel
# 3. Siga os prompts - Done!
```

---

## 5️⃣ Customizar

### Mudar cores (azul + laranja)
**src/index.css**, linhas 1-25:
```css
--color-primary: #1e40af;      /* Azul */
--color-accent: #ea580c;       /* Laranja */
```

### Adicionar novo jogo ao histórico
Simplesmente registre uma nova partida - tudo salva automaticamente no localStorage

---

## 📱 Pronto!

✅ App rodando
✅ Dados sendo salvos no localStorage
✅ Pronto para deploy

**Comece a registrar suas partidas! 🎲**

---

## 🆘 Troubleshooting

**"Porta 5173 em uso"**
```bash
npm run dev -- --port 5174
```

**"Dados desapareceram"**
```bash
# Recuperar do console:
JSON.parse(localStorage.getItem('meeplemind_games'))
```

**"Build falha"**
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

**Documentação Completa:**
- 📖 [README.md](README.md) - Visão geral
- 🎨 [FEATURES.md](FEATURES.md) - Funcionalidades detalhadas
- 🏗️ [STRUCTURE.md](STRUCTURE.md) - Arquitetura
- 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - Deploy em produção

**Bora começar! 🎮**
