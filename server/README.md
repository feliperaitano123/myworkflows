# MyWorkflows AI Agent Server

Servidor WebSocket para o agente de IA do MyWorkflows.

## Configuração Inicial

1. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` com as configurações reais:
   - `OPENROUTER_API_KEY`: Sua chave da OpenRouter
   - `SUPABASE_URL` e `SUPABASE_ANON_KEY`: Já configurados
   - `JWT_SECRET`: Usar o mesmo do Supabase

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Compilar:**
   ```bash
   npm run build
   ```

## Executar

### Desenvolvimento (com hot reload):
```bash
npm run dev
```

### Produção:
```bash
npm start
```

## Teste de Conexão

O servidor roda na porta 3001. Para testar:

1. Inicie o servidor: `npm run dev`
2. Inicie o frontend: `npm run dev` (no diretório raiz)
3. Faça login no frontend
4. Acesse um workflow na tela de chat

## Logs

O servidor mostra:
- ✅ Conexões de usuários
- 📊 Estatísticas a cada 30 segundos
- ❌ Erros de conexão ou processamento

## API

### WebSocket Endpoint
- **URL**: `ws://localhost:3001`
- **Auth**: Token JWT via query string `?token=xxx`

### Mensagens

**Enviar (Client → Server):**
```json
{
  "type": "chat",
  "content": "Mensagem do usuário",
  "workflowId": "workflow-id-opcional"
}
```

**Receber (Server → Client):**
```json
{
  "type": "token|complete|error|connected",
  "content": "Conteúdo da resposta",
  "sessionId": "session-id"
}
```