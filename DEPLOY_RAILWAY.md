# 🚂 Deploy no Railway - MyWorkflows

## Arquitetura de Deploy

O MyWorkflows é deployado como uma aplicação monolítica no Railway:
- **Frontend**: React/Vite servido estaticamente
- **Backend**: Node.js com Express (API + WebSocket)
- **Tudo em um único serviço** para simplicidade

## Como Funciona

1. **Build Phase**:
   - Constrói o frontend (Vite) → `/dist`
   - Instala dependências do servidor
   - Compila TypeScript do servidor → `/server/dist`

2. **Runtime**:
   - Servidor Node.js roda na porta configurada
   - API REST em `/api/*`
   - WebSocket Server na mesma porta
   - Frontend servido estaticamente de `/dist`

## Configuração do Railway

### 1. Conectar Repositório
```
- GitHub: feliperaitano123/myworkflows
- Branch: main (auto-deploy habilitado)
```

### 2. Variáveis de Ambiente

```env
# Supabase (obrigatórias)
SUPABASE_URL=https://knalxzxpfajwcjnbvfhe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua_service_role_key]
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenRouter AI
OPENROUTER_API_KEY=[sua_openrouter_key]

# JWT & Security
JWT_SECRET=myworkflows-super-secret-key-2025

# Server Config
PORT=3001
API_PORT=3002
NODE_ENV=production

# Stripe (opcional)
STRIPE_PUBLISHABLE_KEY=[se_tiver]
STRIPE_SECRET_KEY=[se_tiver]
STRIPE_WEBHOOK_SECRET=[se_tiver]
```

### 3. Deploy Settings

O Railway detecta automaticamente:
- **Builder**: Nixpacks (Node.js)
- **Build Command**: Auto-detectado do nixpacks.toml
- **Start Command**: `npm start`

## Comandos

### Build
```bash
npm run build:all
# Equivale a:
# 1. npm run build (frontend)
# 2. npm run build:server (backend)
```

### Start
```bash
npm start
# Inicia o servidor que serve API + WebSocket + Frontend
```

## Estrutura de Arquivos

```
myworkflows/
├── dist/                 # Frontend buildado
├── server/
│   ├── dist/            # Backend compilado
│   └── src/
│       ├── api-server.ts
│       ├── websocket-server.ts
│       └── static-server.ts  # Serve o frontend
├── railway.json         # Config do Railway
├── nixpacks.toml       # Build config
└── package.json         # Scripts principais
```

## Fluxo de Deploy

1. **Push para `main`** → Trigger automático
2. **Railway detecta mudanças**
3. **Executa build** via nixpacks.toml
4. **Deploy do serviço**
5. **Health check** em `/health`

## URLs de Produção

Após deploy:
- **App**: `https://myworkflows.railway.app`
- **API**: `https://myworkflows.railway.app/api/*`
- **WebSocket**: `wss://myworkflows.railway.app`
- **Health**: `https://myworkflows.railway.app/health`

## Troubleshooting

### Build Failures
```bash
# Verificar logs no Railway Dashboard
# Comum: falta de memória, dependências
```

### Runtime Errors
```bash
# Verificar environment variables
# Logs: Railway Dashboard → Deployments → View Logs
```

### WebSocket Issues
```bash
# Railway suporta WebSocket nativamente
# Certificar que PORT está configurada
```

## Monitoramento

- **Logs**: Railway Dashboard → Observability
- **Métricas**: CPU, Memory, Network
- **Alerts**: Configurar no Railway (opcional)

## Rollback

Se algo der errado:
1. Railway Dashboard → Deployments
2. Encontrar último deploy funcional
3. Click → "Redeploy"

---
✅ **Configuração simples e sólida para deploy contínuo!**