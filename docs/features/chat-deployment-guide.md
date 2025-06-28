# Guia de Deploy e Monitoramento do Chat

## Pré-requisitos

1. **Variáveis de Ambiente**
   ```bash
   # Frontend (.env)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Backend (server/.env)
   OPENROUTER_API_KEY=your_openrouter_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret
   ```

2. **Banco de Dados**
   - Tabelas `chat_sessions` e `chat_messages` criadas
   - RLS policies configuradas
   - Índices para performance

## Deploy Backend (WebSocket Server)

### Opção 1: PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Build e start
cd server
npm run build
pm2 start dist/index.js --name myworkflows-ws

# Configurar restart automático
pm2 startup
pm2 save
```

### Opção 2: Docker

```dockerfile
# server/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

```bash
# Build e run
docker build -t myworkflows-ws .
docker run -p 3001:3001 --env-file .env myworkflows-ws
```

### Opção 3: Railway/Render/Fly.io

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Deploy Frontend

### Opção 1: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Opção 2: Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

### Opção 3: Cloudflare Pages

```bash
# Build command
npm run build

# Output directory
dist
```

## Configuração de Proxy WebSocket

### Nginx

```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
}
```

### Caddy

```
myworkflows.com {
    handle /ws/* {
        reverse_proxy localhost:3001
    }
    handle {
        reverse_proxy localhost:8080
    }
}
```

## Monitoramento

### 1. Logs Estruturados

```typescript
// server/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Health Check Endpoint

```typescript
// server/src/health.ts
app.get('/health', (req, res) => {
  const stats = aiWebSocketServer.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connections: stats.activeConnections,
    sessions: stats.activeSessions,
    memory: process.memoryUsage()
  });
});
```

### 3. Métricas com Prometheus

```typescript
import { register, Counter, Gauge } from 'prom-client';

const wsConnections = new Gauge({
  name: 'websocket_connections_total',
  help: 'Total WebSocket connections'
});

const messagesProcessed = new Counter({
  name: 'chat_messages_processed_total',
  help: 'Total chat messages processed'
});
```

### 4. Alertas

```yaml
# prometheus-alerts.yml
groups:
  - name: chat_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(chat_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate in chat service"
      
      - alert: LowWebSocketConnections
        expr: websocket_connections_total < 1
        for: 5m
        annotations:
          summary: "No active WebSocket connections"
```

## Segurança

1. **Rate Limiting**
   ```typescript
   const limiter = new RateLimiter({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

2. **CORS Configuration**
   ```typescript
   const corsOptions = {
     origin: process.env.FRONTEND_URL,
     credentials: true
   };
   ```

3. **SSL/TLS**
   - Use HTTPS em produção
   - WSS para WebSocket seguro
   - Certificados Let's Encrypt

## Otimizações

1. **Connection Pooling**
   ```typescript
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

2. **Message Compression**
   ```typescript
   const wss = new WebSocket.Server({
     perMessageDeflate: {
       zlibDeflateOptions: {
         level: zlib.Z_BEST_COMPRESSION,
       },
       threshold: 1024,
     }
   });
   ```

3. **Caching Strategy**
   - Cache histórico de mensagens no Redis
   - Cache de workflows ativos
   - TTL apropriado para cada tipo

## Troubleshooting

### WebSocket não conecta
1. Verificar firewall/proxy
2. Confirmar URL do WebSocket
3. Validar token JWT

### Mensagens não persistem
1. Verificar Service Role Key
2. Confirmar RLS policies
3. Logs do Supabase

### Performance lenta
1. Adicionar índices no banco
2. Implementar paginação
3. Otimizar queries

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Build de produção testado
- [ ] SSL/TLS configurado
- [ ] Backup do banco configurado
- [ ] Monitoramento ativo
- [ ] Logs centralizados
- [ ] Rate limiting implementado
- [ ] Health checks funcionando
- [ ] Documentação atualizada
- [ ] Plano de rollback definido