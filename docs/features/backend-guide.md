# Guia Técnico Completo - Backend do Chat MyWorkflows

## Visão Geral da Arquitetura

O backend do chat MyWorkflows é uma solução completa que integra:
- **WebSocket Server**: Comunicação em tempo real
- **OpenRouter**: Processamento de IA com múltiplos modelos
- **MCP (Model Context Protocol)**: Tools para interação com n8n
- **Supabase**: Persistência e autenticação
- **n8n API**: Integração com workflows reais

## Stack Tecnológica Detalhada

### Backend (Node.js/TypeScript)
```
/server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── websocket-server.ts         # WebSocket principal
│   ├── openrouter-bridge.ts        # Bridge SSE → WebSocket
│   ├── auth/
│   │   └── jwt.ts                  # Validação JWT Supabase
│   ├── chat/
│   │   └── session-manager.ts      # Gerenciamento de sessões
│   ├── mcp/
│   │   ├── mcp-server.ts          # Servidor MCP com tools
│   │   └── mcp-client.ts          # Cliente MCP
│   ├── n8n/
│   │   └── n8n-client.ts          # Cliente API n8n
│   └── types/
│       ├── agent.ts               # Tipos WebSocket
│       └── chat.ts                # Tipos Chat
```

### Dependências Principais
```json
{
  "dependencies": {
    "ws": "^8.16.0",                              // WebSocket
    "@supabase/supabase-js": "^2.39.1",          // Supabase client
    "@modelcontextprotocol/sdk": "^1.0.4",        // MCP SDK
    "jsonwebtoken": "^9.0.2",                     // JWT validation
    "node-fetch": "^3.3.2",                       // HTTP requests
    "dotenv": "^16.3.1"                          // Environment vars
  }
}
```

## Componentes Principais

### 1. WebSocket Server

**Arquivo**: `/server/src/websocket-server.ts`

#### Responsabilidades:
- Autenticação JWT de usuários
- Gerenciamento de sessões por usuário
- Roteamento de mensagens
- Integração com OpenRouter e MCP
- Persistência via ChatSessionManager

#### Fluxo de Mensagens:
```typescript
// 1. Conexão do cliente
ws://localhost:3001?token=<jwt_token>

// 2. Validação JWT
const userId = await validateJWT(token);

// 3. Mensagem recebida
{
  type: 'chat',
  content: 'Como está o webhook do meu workflow?',
  model?: 'anthropic/claude-3.5-sonnet'
}

// 4. Processamento
- Detecta necessidade de tool (getWorkflow)
- Executa tool via MCP
- Inclui resultado no contexto
- Chama OpenRouter com contexto completo
- Stream resposta para cliente
- Salva no Supabase
```

#### Eventos WebSocket:
```typescript
// Cliente → Servidor
interface ClientMessage {
  type: 'chat';
  content: string;
  model?: string;
  workflowId?: string;
}

// Servidor → Cliente
interface ServerMessage {
  type: 'token' | 'message_saved' | 'tool_call' | 'tool_result' | 'error';
  content?: string;
  message?: ChatMessage;
  toolCallId?: string;
  messageId?: string;
}
```

### 2. OpenRouter Bridge

**Arquivo**: `/server/src/openrouter-bridge.ts`

#### Funcionalidades:
- Conversão SSE → WebSocket
- Streaming em tempo real
- Suporte a 8 modelos Programming
- Fallback para mock em desenvolvimento
- Tracking de tokens (input/output)

#### Modelos Disponíveis:
```typescript
const PROGRAMMING_MODELS = {
  'anthropic/claude-3-haiku': 'Claude 3 Haiku',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet', 
  'openai/gpt-4o-mini': 'GPT-4o Mini',
  'openai/gpt-4o': 'GPT-4o',
  'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
  'deepseek/deepseek-coder': 'DeepSeek Coder V2',
  'microsoft/wizardcoder-2-8x22b': 'WizardCoder 2 8x22B'
};
```

#### Sistema de Contexto:
```typescript
// Inclui histórico automaticamente
const messages = [
  { role: 'system', content: systemPrompt },
  ...chatHistory, // Últimas 12 mensagens
  { role: 'user', content: userMessage }
];

// Com tool result
if (toolResult) {
  messages.splice(-1, 0, {
    role: 'assistant',
    content: `Tool ${toolName} result:\n${toolResult}`
  });
}
```

### 3. MCP Integration

**Arquivo**: `/server/src/mcp/mcp-server.ts`

#### Tool Implementada: getWorkflow
```typescript
{
  name: 'getWorkflow',
  description: 'Get the complete workflow JSON from n8n',
  parameters: {
    workflowId: { type: 'string', optional: true }
  },
  handler: async (params, context) => {
    // 1. Busca conexão n8n do usuário
    const connection = await getActiveConnection(userId);
    
    // 2. Chama API n8n real
    const workflow = await n8nClient.getWorkflow(
      connection.n8n_url,
      connection.n8n_api_key,
      workflowId
    );
    
    // 3. Retorna formatado
    return {
      summary: `Workflow: ${workflow.name}`,
      nodes: workflow.nodes.length,
      json: workflow
    };
  }
}
```

#### Detecção Automática de Tools:
```typescript
// Palavras-chave que ativam getWorkflow
const WORKFLOW_KEYWORDS = [
  'workflow', 'nodes', 'webhook', 'trigger',
  'http request', 'credentials', 'configurado',
  'configuração', 'fluxo', 'automação'
];

// Padrão explícito
if (message.includes('[getWorkflow]')) {
  // Ativa tool diretamente
}
```

### 4. Chat Session Manager

**Arquivo**: `/server/src/chat/session-manager.ts`

#### Responsabilidades:
- Criar/buscar sessões por workflow
- Salvar mensagens com metadados
- Carregar histórico de chat
- Gerenciar Service Role Key

#### Operações Principais:
```typescript
// Sessão única por workflow/usuário
async getOrCreateSession(userId: string, workflowId: string): Promise<ChatSession>

// Salva com tracking completo
async saveMessage(sessionId: string, message: {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    model?: string;
    tokens?: { input: number; output: number; };
    response_time_ms?: number;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
  };
}): Promise<ChatMessage>

// Histórico com limite
async getSessionHistory(sessionId: string, limit = 12): Promise<ChatMessage[]>
```

### 5. n8n API Client

**Arquivo**: `/server/src/n8n/n8n-client.ts`

#### Funcionalidades:
- Cliente REST para API n8n
- Autenticação via API Key
- Singleton pattern
- Tratamento de erros robusto

#### Endpoints Implementados:
```typescript
// GET /api/v1/workflows/{id}
async getWorkflow(url: string, apiKey: string, workflowId: string): Promise<N8nWorkflow>

// Futuro:
// POST /api/v1/workflows/{id}/execute
// GET /api/v1/executions/{id}
```

## Database Schema (Supabase)

### Tabelas Principais:

```sql
-- Sessões de chat (uma por workflow/usuário)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  workflow_id UUID REFERENCES workflows(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workflow_id)
);

-- Mensagens do chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'tool')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execuções de tools (para auditoria)
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_tool_executions_message_id ON tool_executions(message_id);
```

### Row Level Security (RLS):
```sql
-- Usuários só veem suas próprias sessões
CREATE POLICY "Users can view own sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Service Role tem acesso total
CREATE POLICY "Service role has full access" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

## Fluxo Completo de uma Mensagem

### 1. User envia mensagem
```typescript
// Frontend
ws.send(JSON.stringify({
  type: 'chat',
  content: 'Como está configurado o webhook?',
  model: 'anthropic/claude-3.5-sonnet'
}));
```

### 2. WebSocket processa
```typescript
// websocket-server.ts
- Valida JWT
- Busca/cria sessão
- Salva mensagem do usuário
- Detecta necessidade de tool
```

### 3. MCP executa tool
```typescript
// Se detectado "webhook" → getWorkflow
- Busca conexão n8n ativa
- Chama API: GET /api/v1/workflows/{id}
- Retorna JSON completo
```

### 4. OpenRouter processa
```typescript
// openrouter-bridge.ts
- Inclui histórico (12 msgs)
- Inclui resultado da tool
- Stream resposta via SSE
- Converte para WebSocket tokens
```

### 5. Persistência
```typescript
// session-manager.ts
- Salva resposta do assistant
- Inclui metadados (tokens, tempo, modelo)
- Envia confirmação ao cliente
```

### 6. Frontend atualiza
```typescript
// Cliente recebe:
{ type: 'token', content: '...' }          // Streaming
{ type: 'message_saved', message: {...} }  // Persistido
```

## Variáveis de Ambiente

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-***

# Supabase
SUPABASE_URL=https://knalxzxpfajwcjnbvfhe.supabase.co
SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=*** # Crítico para operações backend

# Server
PORT=3001
NODE_ENV=development

# MCP (opcional)
MCP_SERVER_PORT=3002
```

## Logs e Debugging

### Níveis de Log:
```typescript
// Conexão
🚀 AI Agent WebSocket Server running on port 3001
✅ User be1e435b connected

// Mensagens
📨 Mensagem recebida: "Como está o webhook?"
🔍 Tool detection: getWorkflow necessária

// MCP
🔧 Executando tool: getWorkflow
✅ Tool result: 3.5KB workflow JSON

// OpenRouter
🤖 Processando com modelo: anthropic/claude-3.5-sonnet
📊 Tokens: input=245, output=189

// Persistência
💾 Mensagem salva: user (15 tokens)
💾 Mensagem salva: assistant (189 tokens)
```

## Tratamento de Erros

### Erros Comuns:
```typescript
// Autenticação
if (!userId) {
  ws.close(1008, 'Unauthorized');
}

// OpenRouter
if (response.status === 429) {
  // Rate limit - usar fallback
  return mockResponse();
}

// n8n API
if (error.code === 'ECONNREFUSED') {
  throw new Error('n8n server offline');
}

// MCP Tool
if (!connection.active) {
  return 'No active n8n connection found';
}
```

## Performance e Otimizações

### 1. Limite de Histórico
- Máximo 12 mensagens para evitar context overflow
- ~4K tokens de contexto máximo

### 2. Cache de Conexões
- n8nClient usa singleton pattern
- Reutiliza conexões HTTP

### 3. Streaming Eficiente
- Chunks processados individualmente
- Sem buffer completo na memória

### 4. Deduplicação
- processedMessageIds evita duplicatas
- WebSocket single source of truth

## Segurança

### 1. Autenticação JWT
- Validação em toda conexão WebSocket
- Token Supabase reutilizado

### 2. Service Role Key
- Apenas no backend
- Operações privilegiadas isoladas

### 3. Sanitização
- API Keys limpos de caracteres especiais
- Inputs validados antes de tools

### 4. RLS (Row Level Security)
- Usuários veem apenas seus dados
- Isolamento completo por user_id

## Scripts de Desenvolvimento

```bash
# Desenvolvimento paralelo
npm run dev          # Frontend (porta 8080)
npm run dev:server   # WebSocket (porta 3001)
npm run dev:mcp      # MCP Server (porta 3002)

# Build
npm run build:server # Compila TypeScript

# Logs
npm run logs:server  # Logs em tempo real
```

## Monitoramento e Métricas

### Dados Coletados:
- Tokens por mensagem (input/output)
- Tempo de resposta por modelo
- Uso por usuário/mês
- Erros e fallbacks

### Preparado para Cobrança:
```typescript
// Estrutura no metadata
{
  model: 'anthropic/claude-3.5-sonnet',
  tokens: {
    input: 245,
    output: 189,
    total: 434
  },
  response_time_ms: 2340,
  cost_estimate: 0.0026 // Calculado com base no modelo
}
```

## Próximos Passos

### Tools MCP Planejadas:
1. `executeWorkflow` - Executar workflow via API
2. `getExecutionLogs` - Buscar logs de execução
3. `listWorkflows` - Listar todos workflows
4. `analyzePerformance` - Métricas de performance

### Melhorias de Infraestrutura:
1. Redis para cache de sessões
2. Rate limiting por usuário
3. Webhook para updates em tempo real
4. Métricas com Prometheus

---

Este guia técnico fornece uma visão completa do backend do chat MyWorkflows, incluindo arquitetura, implementação, fluxos e melhores práticas. Use-o como referência para manutenção e expansão do sistema.