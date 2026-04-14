# 🚀 Guia de Deploy - MeepleMind

## Opção 1: GitHub Pages com GitHub Actions (Recomendado)

### Passo 1: Preparar o repositório

```bash
cd d:\Projects\MeepleMind_project

# Inicializar git
git init
git add .
git commit -m "Initial commit: MeepleMind MVP"

# Criar remoto
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/MeepleMind_project.git

# Push
git push -u origin main
```

### Passo 2: Criar arquivo de workflow

Crie a pasta `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Passo 3: Configurar GitHub Pages

1. Vá para **Settings** → **Pages**
2. Em **Source**, selecione **GitHub Actions**
3. Clique em **Save**

### Passo 4: Push e Deploy

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

O GitHub Actions executará automaticamente! Verifique em **Actions** tab.

### Acessar o site

- URL padrão: `https://SEU_USUARIO.github.io/MeepleMind_project/`
- Verifique em Settings → Pages para a URL exata

---

## Opção 2: Vercel (Ainda mais fácil!)

### Passo 1: Push para GitHub (como acima)

### Passo 2: Conectar no Vercel

1. Acesse https://vercel.com/
2. Clique em **New Project**
3. Selecione seu repositório GitHub
4. Clique em **Import**
5. Vercel detecta automaticamente Vite ✓
6. Clique em **Deploy**

### Acessar

- URL automática: `meeplemind-project.vercel.app` (ou customizável)

---

## Opção 3: Deploy Manual (GitHub Pages)

Se preferir controlar totalmente:

```bash
# Build
npm run build

# Criar branch gh-pages se não existir
git checkout --orphan gh-pages

# Limpar tudo
git rm -rf .

# Copiar dist
cp -r dist/* .

# Commit e push
git add .
git commit -m "Deploy"
git push -u origin gh-pages

# Voltar para main
git checkout main
```

---

## Configuração de Domínio Customizado

### Para GitHub Pages:

1. Settings → Pages
2. Em **Custom domain**, coloque seu domínio
3. Configure DNS (CNAME)

### Para Vercel:

1. Project Settings → Domains
2. Add Custom Domain
3. Configure DNS

---

## Troubleshooting

### Blank page ao acessar?

```bash
# Verifique o base path em vite.config.js
# Se usar subdomain:
base: '/MeepleMind_project/'

# Se usar domínio raiz:
base: '/'
```

### Assets não carregam?

Limpe cache do navegador e faça rebuild:

```bash
npm run build
git add .
git commit -m "Rebuild"
git push
```

---

## Monitorar Deploy

### GitHub Actions
- Vá para **Actions** tab
- Veja workflows em tempo real
- Clique em commits para ver logs

### Vercel
- Dashboard mostra deploys recentes
- Vercel Analytics disponível

---

## Backup Local

Sempre mantenha backup:

```bash
# Criar zip
tar -czf MeepleMind_backup.tar.gz .

# Ou apenas:
git clone SEU_REPO repo_backup
```

---

## Próximos Passos

Depois do deploy:

- ✅ Teste todas as funcionalidades no seu domínio
- ✅ Compartilhe com amigos
- ✅ Registre partidas!
- 🔄 Iteração: mude código, push, auto-deploy

---

**Sucesso no deploy! 🚀**
