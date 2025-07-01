# 🚀 Deploy na Vercel - MyWorkflows

## ✅ Arquivos Criados

- `vercel.json` - Configuração da Vercel
- `.vercelignore` - Arquivos ignorados no deploy
- `.env.example` - Exemplo de variáveis de ambiente
- `src/integrations/supabase/client.ts` - Atualizado para usar env vars

## 📋 Passo a Passo

### 1. **Conectar Repositório GitHub**
```bash
# Na Vercel Dashboard:
1. Clique "New Project"
2. Conecte com GitHub (feliperaitano123/myworkflows)
3. Selecione o repositório
```

### 2. **Configurar Variáveis de Ambiente**
Na Vercel Dashboard, adicione estas Environment Variables:

```env
# Supabase (obrigatórias)
VITE_SUPABASE_URL=https://knalxzxpfajwcjnbvfhe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYWx4enhwZmFqd2NqbmJ2ZmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NDk0MTQsImV4cCI6MjA2NDAyNTQxNH0.rxzOeHTDexnlXumZ5iS-s-V3ly_GbCH13S05NDAotSE

# URLs Backend (configurar depois do deploy do backend)
VITE_API_URL=https://sua-api.vercel.app
VITE_WEBSOCKET_URL=wss://seu-websocket.vercel.app
```

### 3. **Deploy Frontend**
```bash
# Build Settings automáticas (já configuradas no vercel.json):
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4. **Deploy Backend (Separadamente)**
O backend precisa ser deployado separadamente:

```bash
# Opções para o backend:
1. Railway.app (recomendado para Node.js + WebSocket)
2. Render.com (suporte completo a WebSocket)
3. Heroku (clássico, funciona bem)
4. DigitalOcean App Platform
```

### 5. **Domínio Personalizado (Opcional)**
```bash
# Na Vercel Dashboard:
1. Vá em "Domains"
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções
```

## 🔧 Configurações Importantes

### Frontend (Vercel)
- ✅ **Build Command**: `npm run build`
- ✅ **Output Directory**: `dist`
- ✅ **Node Version**: 18.x (automático)
- ✅ **SPA Routing**: Configurado (rewrites para /index.html)

### Backend (Deploy Separado)
- 🔄 **WebSocket Server**: Porta 3001
- 🔄 **REST API Server**: Porta 3002
- 🔄 **Environment Variables**: Copiar de server/.env

## 🌍 URLs Finais

Após deploy completo:
- **Frontend**: `https://myworkflows.vercel.app`
- **Backend API**: `https://sua-api-backend.com`
- **WebSocket**: `wss://seu-websocket-backend.com`

## ⚠️ Próximos Passos

1. **Fazer commit e push** dos arquivos criados
2. **Conectar repositório na Vercel**
3. **Configurar environment variables**
4. **Deploy do backend** (Railway/Render)
5. **Atualizar URLs** do backend no frontend
6. **Testar aplicação completa**

## 🆘 Troubleshooting

### Build Errors
```bash
# Se der erro de build:
npm run build

# Se der erro de TypeScript:
npm run lint
```

### Environment Variables
```bash
# Verificar se as env vars estão corretas:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### CORS Issues
```bash
# Configurar CORS no backend para o domínio da Vercel:
origin: ["https://myworkflows.vercel.app"]
```

---
✅ **Projeto pronto para deploy na Vercel!**