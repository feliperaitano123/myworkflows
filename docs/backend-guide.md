# 🔧 Backend Guide - MyWorkflows Chat Agent

## 📋 Visão Geral

Este documento descreve a arquitetura e implementação do back-end do agente de chat MyWorkflows. O sistema é baseado em **WebSocket** e fornece um assistente de IA integrado com **N8n workflows**, usando **OpenRouter** para processamento de linguagem natural e **MCP (Model Context Protocol)** para execução de ferramentas.

## 🏗️ Arquitetura Geral

```
┌─────────────────┐    WebSocket     ┌──────────────────┐
│   Frontend      │ ◄────────────── ► │   WebSocket      │
│   (React)       │                   │   Server         │
└─────────────────┘                   └──────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────┐
                          │        Core Services             │
                          │                                  │
                          │  • ChatSessionManager           │
                          │  • OpenRouterBridge             │
                          │  • JWT Authentication           │
                          │  • MCP Client                   │
                          └──────────────────────────────────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
                │   Supabase    │    │  OpenRouter  │    │   N8n APIs   │
                │   Database    │    │     AI       │    │  (External)  │
                └───────────────┘    └──────────────┘    └──────────────┘
```

## 🚀 Servidor Principal

### Entry Point: `server/src/index.ts`

O servidor inicia na porta configurada (padrão: 3001) e requer as seguintes variáveis de ambiente:

```env
# Obrigatórias
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Opcionais
OPENROUTER_API_KEY=your_openrouter_key  # Se não configurado, usa mock
PORT=3001
```

### Classe Principal: `AIWebSocketServer`

```typescript
export class AIWebSocketServer {
  private wss: WebSocket.Server;
  private openRouterBridge: OpenRouterBridge;
  private chatSessionManager: ChatSessionManager;
  private supabase: any;
  private activeSessions: Map<string, UserSession>;
  private mcpClient: MyWorkflowsMCPClient;
}
```

## 🔐 Sistema de Autenticação

### JWT Validation (`server/src/auth/jwt.ts`)

O sistema usa **Supabase Auth** para validação de tokens:

```typescript
export async function validateJWT(token: string): Promise<string | null> {
  const cleanToken = token.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(cleanToken);
  return user?.id || null;
}
```

### Fluxo de Conexão WebSocket

1. **Cliente envia token** via query string ou header Authorization
2. **Servidor valida token** com Supabase
3. **Cria sessão** se token válido
4. **Envia confirmação** de conexão
5. **Configura handlers** de mensagens

## 📡 WebSocket API

### URL de Conexão

```
ws://localhost:3001?token=YOUR_JWT_TOKEN
```

Ou via header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Tipos de Mensagens

#### 1. Mensagem de Chat

**FROM CLIENT:**
```typescript
interface ChatMessageRequest {
  type: 'chat';
  content: string;           // Mensagem do usuário
  workflowId?: string;       // ID do workflow (opcional)
  model?: string;            // Modelo IA (padrão: claude-3-haiku)
  attachments?: Array<{      // Anexos (futuro)
    id: string;
    name: string;
    type: 'document' | 'execution';
  }>;
}
```

**TO CLIENT:**
```typescript
interface WSChatMessage {
  type: 'token' | 'complete' | 'error' | 'ai_thinking' | 'tool_start' | 'tool_complete' | 'ai_responding';
  content?: string;          // Conteúdo da resposta
  sessionId?: string;        // ID da sessão WebSocket
  error?: string;            // Mensagem de erro
  messageId?: string;        // ID da mensagem salva
  timestamp?: string;        // Timestamp da mensagem
  stepData?: ProcessStep;    // Dados do processo em andamento
}
```

#### 2. Buscar Histórico

**FROM CLIENT:**
```typescript
interface ChatHistoryRequest {
  type: 'get_history';
  workflowId: string;        // Obrigatório
  limit?: number;            // Padrão: 50
}
```

**TO CLIENT:**
```typescript
{
  type: 'history';
  history: ChatMessage[];    // Array de mensagens
  sessionId: string;
}
```

#### 3. Limpar Chat

**FROM CLIENT:**
```typescript
interface ClearChatRequest {
  type: 'clear_chat';
  workflowId: string;
}
```

**TO CLIENT:**
```typescript
{
  type: 'complete';
  content: 'Chat limpo com sucesso';
  sessionId: string;
}
```

## 💾 Gerenciamento de Sessões

### ChatSessionManager (`server/src/chat/session-manager.ts`)

Responsável pela persistência no Supabase:

```typescript
export class ChatSessionManager {
  // Busca ou cria sessão para um workflow
  async getOrCreateSession(userId: string, workflowId: string, userToken: string): Promise<string>
  
  // Salva mensagem no banco
  async saveMessage(sessionId: string, role: 'user' | 'assistant' | 'tool', content: string, userToken: string, metadata?: any): Promise<string>
  
  // Busca histórico de mensagens
  async getSessionHistory(sessionId: string, userToken: string, limit?: number): Promise<ChatMessage[]>
  
  // Limpa chat de um workflow
  async clearWorkflowChat(userId: string, workflowId: string, userToken: string): Promise<boolean>
}
```

### Schema do Banco (Supabase)

```sql
-- Tabela de sessões de chat
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  workflow_id UUID REFERENCES workflows(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🤖 Integração com IA (OpenRouter)

### OpenRouterBridge (`server/src/openrouter-bridge.ts`)

```typescript
export class OpenRouterBridge {
  async streamResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    userId: string,
    sessionId: string,
    onToken?: (token: string) => void,
    model?: string,           // Padrão: 'anthropic/claude-3-haiku'
    workflowId?: string,
    chatSessionId?: string
  ): Promise<string>
}
```

### Modelos Suportados

- `anthropic/claude-3-haiku` (rápido, padrão)
- `anthropic/claude-3-sonnet` (balanceado)
- `anthropic/claude-3-opus` (mais poderoso)
- `openai/gpt-4` (OpenAI)

### Fluxo de Resposta Streaming

1. **Cliente envia mensagem**
2. **Servidor detecta necessidade de tools**
3. **Executa ferramentas MCP** (se necessário)
4. **Envia para OpenRouter** com histórico
5. **Stream de tokens** em tempo real
6. **Salva resposta completa** no banco

## 🔧 Sistema MCP (Model Context Protocol)

### O que é MCP?

MCP permite que a IA execute **ferramentas específicas** para buscar dados em tempo real, como informações de workflows N8n.

### MyWorkflowsMCPClient (`server/src/mcp/mcp-client.ts`)

```typescript
export class MyWorkflowsMCPClient {
  async connect(): Promise<void>
  async callTool(name: string, args: any): Promise<any>
  async getWorkflow(workflowId: string, userId: string): Promise<any>
  async listTools(): Promise<any>
  get connected(): boolean
}
```

### Ferramentas Disponíveis

#### getWorkflow
Busca dados completos de um workflow via N8n API:

```typescript
// Input
{
  workflowId: string;  // ID no sistema MyWorkflows
  userId: string;      // Para segurança
}

// Output
{
  content: [{
    type: 'text',
    text: `✅ Workflow obtido com sucesso!
    
📋 **Nome do Workflow**
Status: 🟢 Ativo
Nodes: 5
ID Sistema: uuid-123
ID n8n: workflow-456
Conexão: Minha Instância N8n

🔧 **Nodes do Workflow:**
1. Webhook (Webhook)
2. Set Data (Set)
3. HTTP Request (HttpRequest)
4. Database Query (PostgreSQL)
5. Send Email (EmailSend)

📋 JSON completo:
{...dados completos do workflow...}`
  }]
}
```

## 🌐 Integração N8n

### N8nAPIClient (`server/src/n8n/n8n-client.ts`)

```typescript
export class N8nAPIClient {
  async getWorkflow(workflowId: string, userId: string): Promise<any>
  async testConnection(userId: string): Promise<boolean>
  async listWorkflows(userId: string): Promise<any[]>
}
```

### Fluxo de Busca de Workflow

1. **Busca conexão N8n** ativa do usuário no Supabase
2. **Valida credenciais** (URL + API Key)
3. **Busca workflow** no sistema MyWorkflows
4. **Faz chamada** para API N8n externa
5. **Retorna dados combinados** (sistema + N8n)

## 🔄 Fluxo Completo de Chat

### 1. Conexão Inicial

```typescript
// Frontend conecta via WebSocket
const ws = new WebSocket(`ws://localhost:3001?token=${userToken}`);

// Backend responde
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'connected') {
    console.log('✅ Conectado:', data.sessionId);
  }
};
```

### 2. Envio de Mensagem

```typescript
// Frontend envia mensagem
ws.send(JSON.stringify({
  type: 'chat',
  content: 'Me explique como este workflow funciona',
  workflowId: 'workflow-uuid-123',
  model: 'anthropic/claude-3-haiku'
}));
```

### 3. Processamento no Backend

```typescript
// 1. Validar sessão e workflow
// 2. Criar/buscar sessão de chat no banco
// 3. Salvar mensagem do usuário
// 4. Detectar necessidade de ferramentas MCP
// 5. Executar getWorkflow (se necessário)
// 6. Enviar contexto + pergunta para OpenRouter
// 7. Stream resposta em tempo real
// 8. Salvar resposta completa no banco
```

### 4. Resposta Streaming

```typescript
// Backend envia tokens em tempo real
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'ai_thinking':
      // IA está processando
      break;
      
    case 'tool_start':
      // Iniciou execução de ferramenta
      console.log('🔧', data.stepData.title);
      break;
      
    case 'tool_complete':
      // Ferramenta executada
      console.log('✅', data.content);
      break;
      
    case 'token':
      // Token da resposta IA
      appendToChat(data.content);
      break;
      
    case 'complete':
      // Resposta completa
      console.log('✅ Mensagem salva:', data.messageId);
      break;
      
    case 'error':
      // Erro
      console.error('❌', data.error);
      break;
  }
};
```

## 📱 Como Conectar o Frontend

### 1. Hook React Recomendado

```typescript
import { useEffect, useState, useRef } from 'react';

export function useWebSocketChat() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const connect = (token: string) => {
    const websocket = new WebSocket(`ws://localhost:3001?token=${token}`);
    
    websocket.onopen = () => {
      setIsConnected(true);
      console.log('🔗 WebSocket conectado');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
    
    websocket.onclose = () => {
      setIsConnected(false);
      console.log('🔌 WebSocket desconectado');
    };
    
    websocket.onerror = (error) => {
      console.error('❌ WebSocket erro:', error);
    };
    
    setWs(websocket);
  };

  const sendMessage = (content: string, workflowId?: string, model?: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'chat',
        content,
        workflowId,
        model: model || 'anthropic/claude-3-haiku'
      }));
      setIsLoading(true);
    }
  };

  const getHistory = (workflowId: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'get_history',
        workflowId
      }));
    }
  };

  const clearChat = (workflowId: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'clear_chat',
        workflowId
      }));
    }
  };

  return {
    connect,
    sendMessage,
    getHistory,
    clearChat,
    messages,
    isConnected,
    isLoading
  };
}
```

### 2. Componente de Chat

```typescript
import { useWebSocketChat } from './hooks/useWebSocketChat';

export function WorkflowChat({ workflowId }: { workflowId: string }) {
  const { 
    connect, 
    sendMessage, 
    getHistory,
    messages, 
    isConnected, 
    isLoading 
  } = useWebSocketChat();

  useEffect(() => {
    // Conectar com token do usuário
    const token = getUserToken(); // Implementar
    connect(token);
    
    // Buscar histórico do workflow
    if (workflowId) {
      getHistory(workflowId);
    }
  }, [workflowId]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, workflowId, 'anthropic/claude-3-haiku');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>
      
      <ChatInput 
        onSend={handleSendMessage} 
        disabled={!isConnected || isLoading} 
      />
    </div>
  );
}
```

### 3. Estados de Loading

O backend envia diferentes tipos de mensagem para mostrar progresso:

```typescript
const handleMessage = (data: WSChatMessage) => {
  switch (data.type) {
    case 'ai_thinking':
      setCurrentStep({ type: 'thinking', message: 'IA está pensando...' });
      break;
      
    case 'tool_start':
      setCurrentStep({ 
        type: 'tool', 
        message: data.stepData?.title || 'Executando ferramenta...' 
      });
      break;
      
    case 'tool_complete':
      setCurrentStep({ type: 'complete', message: data.content });
      break;
      
    case 'token':
      appendToCurrentMessage(data.content);
      break;
      
    case 'complete':
      setIsLoading(false);
      setCurrentStep(null);
      break;
  }
};
```

## 🛠️ Variáveis de Ambiente

### Servidor (.env)

```env
# Supabase (Obrigatório)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter (Opcional - usa mock se não configurado)
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Servidor
PORT=3001
NODE_ENV=development
```

### Frontend (.env)

```env
# WebSocket
VITE_WS_URL=ws://localhost:3001

# Supabase (mesmo do servidor)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Como Iniciar

### Backend

```bash
cd server
npm install
npm run dev  # ou npm run dev:mcp para MCP standalone
```

### Frontend

```bash
npm install
npm run dev
```

## 🐛 Debug e Logs

O servidor fornece logs detalhados:

```bash
🚀 AI Agent WebSocket Server running on port 3001
🔗 Inicializando MCP Client...
✅ MCP Client conectado e pronto!
🔑 Token extraído: Presente
✅ User user-123 connected with session session-456
📨 Mensagem recebida do usuário user-123: "Como funciona este workflow?"
🔧 MCP: Detectado necessidade de tool
🌐 MCP: Fazendo chamada real para n8n API...
✅ MCP: Dados do workflow obtidos com sucesso!
💾 Mensagem salva (assistant): msg-789
```

## ⚠️ Tratamento de Erros

### Erros Comuns

1. **Token inválido**: `{ type: 'error', error: 'Token de autenticação inválido' }`
2. **Conexão N8n**: `{ type: 'error', error: 'Nenhuma conexão n8n ativa encontrada' }`
3. **API Key**: `{ type: 'error', error: 'API Key inválida ou expirada' }`
4. **Workflow não encontrado**: `{ type: 'error', error: 'Workflow não encontrado' }`

### Fallbacks

- **OpenRouter falha** → Usa resposta mock
- **MCP falha** → Funciona sem ferramentas
- **N8n API falha** → Retorna erro específico para usuário

## 📊 Métricas e Stats

```typescript
// Stats do servidor
const stats = server.getStats();
// {
//   activeConnections: 5,
//   activeSessions: 3,
//   uptime: 1234 // segundos
// }
```

## 🔄 Graceful Shutdown

O servidor implementa shutdown limpo:

```typescript
process.on('SIGINT', async () => {
  console.log('🛑 Iniciando shutdown...');
  await server.shutdown();
  process.exit(0);
});
```

---

## 📚 Próximos Passos

1. **Implementar frontend** usando este guia
2. **Adicionar mais ferramentas MCP** (executar workflows, etc.)
3. **Implementar anexos** (documentos, execuções)
4. **Adicionar websockets** para notificações em tempo real
5. **Implementar rate limiting** e caching

---

**💡 Dica:** Este documento é o guia definitivo para implementar o frontend do chat. Todos os tipos, interfaces e fluxos estão documentados e podem ser copiados diretamente para o código React! 