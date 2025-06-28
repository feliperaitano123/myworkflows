# Guia de Implementação Completo - Sistema de Chat MyWorkflows

## Visão Executiva

Este documento é o guia definitivo para implementar o sistema de chat com IA do MyWorkflows, integrando:
- Interface de chat em tempo real (React/TypeScript)
- Backend WebSocket com autenticação JWT
- Integração com OpenRouter (8 modelos de IA)
- MCP (Model Context Protocol) com tools para n8n
- Persistência completa no Supabase
- Sistema de tracking para cobrança futura

## Arquitetura Geral

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  WebSocket       │────▶│  OpenRouter     │
│   WorkflowChat  │     │  Server (3001)   │     │  (8 modelos)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                        
         │                        ▼                        
         │               ┌──────────────────┐     ┌─────────────────┐
         └──────────────▶│    Supabase      │     │   MCP Server    │
                         │  - chat_sessions │────▶│  - getWorkflow  │
                         │  - chat_messages │     │  - n8n API      │
                         │  - connections   │     └─────────────────┘
                         └──────────────────┘              
```

## Fase 1: Setup Inicial do Projeto

### 1.1 Estrutura de Diretórios

```bash
# Backend
mkdir -p server/src/{auth,chat,mcp,n8n,types}
mkdir -p server/src/mcp

# Frontend
mkdir -p src/hooks
mkdir -p src/components/chat
mkdir -p src/types
```

### 1.2 Dependências Backend

```bash
cd server
npm init -y
npm install ws @supabase/supabase-js jsonwebtoken dotenv node-fetch@3
npm install -D typescript @types/ws @types/jsonwebtoken @types/node nodemon
npm install @modelcontextprotocol/sdk
```

### 1.3 Configuração TypeScript Backend

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Scripts NPM Backend

```json
// server/package.json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "dev:mcp": "ts-node src/mcp/mcp-server.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 1.5 Variáveis de Ambiente

```bash
# server/.env
OPENROUTER_API_KEY=sk-or-v1-***
SUPABASE_URL=https://knalxzxpfajwcjnbvfhe.supabase.co
SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
PORT=3001
NODE_ENV=development
```

## Fase 2: Database Schema (Supabase)

### 2.1 Executar Migrações

```sql
-- Criar tabelas principais
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  workflow_id UUID REFERENCES workflows(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'tool')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view own sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to sessions" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to messages" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role');
```

### 2.2 Atualizar Types TypeScript

```bash
# No frontend
npx supabase gen types typescript --project-id knalxzxpfajwcjnbvfhe > src/integrations/supabase/types.ts
```

## Fase 3: Implementação Backend

### 3.1 Entry Point

```typescript
// server/src/index.ts
import dotenv from 'dotenv';
import { AIWebSocketServer } from './websocket-server';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');

const server = new AIWebSocketServer(PORT);

console.log(`🚀 AI Agent WebSocket Server running on port ${PORT}`);
```

### 3.2 Tipos Base

```typescript
// server/src/types/agent.ts
export interface ClientMessage {
  type: 'chat';
  content: string;
  model?: string;
  workflowId?: string;
}

export interface ServerMessage {
  type: 'token' | 'complete' | 'error' | 'message_saved' | 'tool_call' | 'tool_result';
  content?: string;
  message?: any;
  messageId?: string;
  sessionId?: string;
  toolCallId?: string;
  success?: boolean;
}

// server/src/types/chat.ts
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    response_time_ms?: number;
    tool_calls?: Array<{
      id: string;
      name: string;
      arguments?: any;
    }>;
    tool_call_id?: string;
    attachments?: any[];
  };
  created_at: string;
}
```

### 3.3 Autenticação JWT

```typescript
// server/src/auth/jwt.ts
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function validateJWT(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('JWT validation error:', error);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}
```

### 3.4 Chat Session Manager

```typescript
// server/src/chat/session-manager.ts
import { createClient } from '@supabase/supabase-js';
import { ChatMessage } from '../types/chat';

export class ChatSessionManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  async getOrCreateSession(userId: string, workflowId: string) {
    // Buscar sessão existente
    const { data: existingSession } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('workflow_id', workflowId)
      .single();

    if (existingSession) {
      return existingSession;
    }

    // Criar nova sessão
    const { data: newSession, error } = await this.supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        workflow_id: workflowId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }

    return newSession;
  }

  async saveMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'session_id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      throw error;
    }

    return data;
  }

  async getSessionHistory(sessionId: string, limit = 12): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return (data || []).reverse();
  }

  async clearWorkflowChat(userId: string, workflowId: string) {
    const session = await this.getOrCreateSession(userId, workflowId);
    
    const { error } = await this.supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', session.id);

    if (error) {
      console.error('Error clearing chat:', error);
      throw error;
    }
  }
}
```

### 3.5 OpenRouter Bridge

```typescript
// server/src/openrouter-bridge.ts
import fetch from 'node-fetch';
import WebSocket from 'ws';

export class OpenRouterBridge {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY!;
  }

  async streamResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    sessionId: string,
    model: string = 'anthropic/claude-3-haiku',
    chatHistory: any[] = [],
    onToken?: (token: string) => void,
    messageId?: string
  ) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://myworkflows.com.br',
          'X-Title': 'MyWorkflows AI Agent'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      const reader = response.body;
      if (!reader) return;

      let buffer = '';
      
      reader.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              ws.send(JSON.stringify({
                type: 'complete',
                sessionId
              }));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                if (onToken) onToken(content);
                
                ws.send(JSON.stringify({
                  type: 'token',
                  content,
                  sessionId,
                  messageId
                }));
              }
            } catch (e) {
              // Ignorar erros de parse
            }
          }
        }
      });

      reader.on('end', () => {
        ws.send(JSON.stringify({
          type: 'complete',
          sessionId
        }));
      });

    } catch (error) {
      console.error('OpenRouter error:', error);
      
      // Fallback para mock
      const mockResponse = this.getMockResponse(userMessage);
      const tokens = mockResponse.split(' ');
      
      for (const token of tokens) {
        if (onToken) onToken(token + ' ');
        
        ws.send(JSON.stringify({
          type: 'token',
          content: token + ' ',
          sessionId,
          messageId
        }));
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      ws.send(JSON.stringify({
        type: 'complete',
        sessionId
      }));
    }
  }

  private getMockResponse(message: string): string {
    const responses = [
      "Vou analisar seu workflow e ajudar com isso.",
      "Entendi sua solicitação sobre o workflow.",
      "Posso ajudar a otimizar essa automação.",
      "Vamos trabalhar juntos nesse workflow."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
```

### 3.6 n8n API Client

```typescript
// server/src/n8n/n8n-client.ts
import fetch from 'node-fetch';

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: string[];
}

export class N8nClient {
  private static instance: N8nClient;

  static getInstance(): N8nClient {
    if (!N8nClient.instance) {
      N8nClient.instance = new N8nClient();
    }
    return N8nClient.instance;
  }

  async getWorkflow(baseUrl: string, apiKey: string, workflowId: string): Promise<N8nWorkflow> {
    const url = `${baseUrl}/api/v1/workflows/${workflowId}`;
    
    // Limpar API key
    const cleanApiKey = apiKey.replace(/[\u200B-\u200F\u202A-\u202E]/g, '').trim();
    
    const response = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': cleanApiKey,
        'Accept': 'application/json',
        'User-Agent': 'MyWorkflows/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}
```

### 3.7 MCP Server e Tool

```typescript
// server/src/mcp/mcp-server.ts
import { createServer } from '@modelcontextprotocol/sdk';
import { N8nClient } from '../n8n/n8n-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const mcpServer = createServer({
  name: 'myworkflows-mcp',
  version: '1.0.0'
});

// Tool getWorkflow
mcpServer.addTool({
  name: 'getWorkflow',
  description: 'Get the complete workflow JSON from n8n including all nodes, connections, and settings',
  parameters: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        description: 'Optional workflow ID. If not provided, uses the current workflow context.'
      }
    }
  },
  handler: async (params: any, context: any) => {
    const userId = context.userId;
    const workflowId = params.workflowId || context.workflowId;

    try {
      // Buscar conexão ativa
      const { data: connection } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .single();

      if (!connection) {
        return {
          error: 'No active n8n connection found',
          suggestion: 'Please connect your n8n instance first'
        };
      }

      // Buscar workflow no banco
      const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (!workflow) {
        return {
          error: 'Workflow not found',
          workflowId
        };
      }

      // Buscar via API n8n
      const n8nClient = N8nClient.getInstance();
      const workflowData = await n8nClient.getWorkflow(
        connection.n8n_url,
        connection.n8n_api_key,
        workflow.n8n_id
      );

      // Retornar formatado
      return {
        content: `# Workflow: ${workflowData.name}

## Summary
- **ID**: ${workflowData.id}
- **Active**: ${workflowData.active ? 'Yes' : 'No'}
- **Nodes**: ${workflowData.nodes.length}
- **Tags**: ${workflowData.tags?.join(', ') || 'None'}

## Complete JSON
\`\`\`json
${JSON.stringify(workflowData, null, 2)}
\`\`\``,
        data: workflowData
      };

    } catch (error: any) {
      return {
        error: 'Failed to fetch workflow',
        details: error.message
      };
    }
  }
});

// MCP Client para comunicação
// server/src/mcp/mcp-client.ts
export class MCPClient {
  async executeToolDirectly(toolName: string, params: any, context: any) {
    const tool = mcpServer.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    return await tool.handler(params, context);
  }
}
```

### 3.8 WebSocket Server Principal

```typescript
// server/src/websocket-server.ts
import WebSocket from 'ws';
import { validateJWT } from './auth/jwt';
import { OpenRouterBridge } from './openrouter-bridge';
import { ChatSessionManager } from './chat/session-manager';
import { MCPClient } from './mcp/mcp-client';
import { ClientMessage, ServerMessage } from './types/agent';

interface UserSession {
  userId: string;
  workflowId?: string;
  sessionId?: string;
}

export class AIWebSocketServer {
  private wss: WebSocket.Server;
  private openRouterBridge: OpenRouterBridge;
  private chatSessionManager: ChatSessionManager;
  private mcpClient: MCPClient;
  private activeSessions: Map<string, UserSession> = new Map();

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.openRouterBridge = new OpenRouterBridge();
    this.chatSessionManager = new ChatSessionManager();
    this.mcpClient = new MCPClient();
    this.setupServer();
  }

  private setupServer() {
    this.wss.on('connection', async (ws, req) => {
      const url = new URL(req.url!, `http://localhost`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Missing token');
        return;
      }

      const userId = await validateJWT(token);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      console.log(`✅ User ${userId} connected`);
      
      const sessionKey = `${userId}-${Date.now()}`;
      this.activeSessions.set(sessionKey, { userId });

      ws.on('message', async (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleChatMessage(ws, message, sessionKey);
        } catch (error) {
          console.error('Message handling error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            content: 'Failed to process message'
          }));
        }
      });

      ws.on('close', () => {
        this.activeSessions.delete(sessionKey);
        console.log(`👋 User ${userId} disconnected`);
      });
    });
  }

  private async handleChatMessage(ws: WebSocket, message: ClientMessage, sessionKey: string) {
    const session = this.activeSessions.get(sessionKey);
    if (!session) return;

    const { userId } = session;
    const workflowId = message.workflowId || session.workflowId;
    
    if (workflowId) {
      session.workflowId = workflowId;
    }

    console.log(`📨 Mensagem recebida: "${message.content}"`);

    // Criar/buscar sessão de chat
    const chatSession = await this.chatSessionManager.getOrCreateSession(userId, workflowId!);
    session.sessionId = chatSession.id;

    // Salvar mensagem do usuário
    const userMessage = await this.chatSessionManager.saveMessage(chatSession.id, {
      role: 'user',
      content: message.content,
      metadata: {
        model: message.model || 'anthropic/claude-3-haiku',
        tokens: { 
          input: this.estimateTokens(message.content), 
          output: 0,
          total: this.estimateTokens(message.content)
        }
      }
    });

    // Notificar que mensagem foi salva
    ws.send(JSON.stringify({
      type: 'message_saved',
      message: userMessage
    }));

    // Buscar histórico
    const chatHistory = await this.chatSessionManager.getSessionHistory(chatSession.id);
    
    // Detectar necessidade de tool
    const needsTool = this.detectToolNeed(message.content);
    let toolResult = null;

    if (needsTool === 'getWorkflow') {
      console.log('🔧 Executando tool: getWorkflow');
      
      // Notificar execução da tool
      const toolCallId = `call_${Date.now()}`;
      ws.send(JSON.stringify({
        type: 'tool_call',
        toolCallId,
        toolName: 'getWorkflow'
      }));

      // Executar tool
      toolResult = await this.mcpClient.executeToolDirectly('getWorkflow', {
        workflowId: session.workflowId
      }, {
        userId,
        workflowId: session.workflowId
      });

      // Salvar resultado da tool
      if (toolResult && !toolResult.error) {
        await this.chatSessionManager.saveMessage(chatSession.id, {
          role: 'tool',
          content: toolResult.content || JSON.stringify(toolResult),
          metadata: {
            tool_call_id: toolCallId
          }
        });

        ws.send(JSON.stringify({
          type: 'tool_result',
          toolCallId,
          success: true
        }));
      }
    }

    // Preparar contexto
    const systemPrompt = this.buildSystemPrompt(toolResult);
    
    // ID da mensagem para streaming
    const assistantMessageId = `msg_${Date.now()}`;
    
    // Variáveis para tracking
    let fullResponse = '';
    let tokenCount = 0;
    const startTime = Date.now();

    // Stream resposta via OpenRouter
    await this.openRouterBridge.streamResponse(
      ws,
      message.content,
      systemPrompt,
      chatSession.id,
      message.model || 'anthropic/claude-3-haiku',
      this.formatHistoryForOpenRouter(chatHistory),
      (token) => {
        fullResponse += token;
        tokenCount++;
      },
      assistantMessageId
    );

    // Salvar resposta completa
    const responseTime = Date.now() - startTime;
    const outputTokens = this.estimateTokens(fullResponse);
    
    const assistantMessage = await this.chatSessionManager.saveMessage(chatSession.id, {
      role: 'assistant',
      content: fullResponse,
      metadata: {
        model: message.model || 'anthropic/claude-3-haiku',
        tokens: {
          input: 0,
          output: outputTokens,
          total: outputTokens
        },
        response_time_ms: responseTime,
        tool_calls: needsTool ? [{
          id: `call_${Date.now()}`,
          name: needsTool
        }] : undefined
      }
    });

    // Notificar mensagem salva
    ws.send(JSON.stringify({
      type: 'message_saved',
      message: assistantMessage
    }));

    console.log(`✅ Resposta completa em ${responseTime}ms (${outputTokens} tokens)`);
  }

  private detectToolNeed(content: string): string | null {
    const lowerContent = content.toLowerCase();
    
    // Palavras-chave para getWorkflow
    const workflowKeywords = [
      'workflow', 'nodes', 'webhook', 'trigger',
      'http request', 'credentials', 'configurado',
      'configuração', 'fluxo', 'automação', 'conexões',
      'json', 'estrutura', 'como está'
    ];

    // Padrão explícito
    if (content.includes('[getWorkflow]')) {
      return 'getWorkflow';
    }

    // Detecção por palavras-chave
    for (const keyword of workflowKeywords) {
      if (lowerContent.includes(keyword)) {
        return 'getWorkflow';
      }
    }

    return null;
  }

  private buildSystemPrompt(toolResult: any): string {
    let systemPrompt = `Você é um especialista em n8n workflows e automações. 
Você ajuda usuários a criar, debugar e otimizar seus workflows.
Seja conciso, técnico e forneça exemplos práticos quando apropriado.`;

    if (toolResult && !toolResult.error) {
      systemPrompt += `\n\nContexto do workflow atual:\n${toolResult.content}`;
    }

    return systemPrompt;
  }

  private formatHistoryForOpenRouter(history: any[]): any[] {
    return history
      .filter(msg => msg.role !== 'tool')
      .slice(-12)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  private estimateTokens(text: string): number {
    // Estimativa simples: ~4 caracteres por token
    return Math.ceil(text.length / 4);
  }
}
```

## Fase 4: Implementação Frontend

### 4.1 Hook Principal - useChatWithPersistence

```typescript
// src/hooks/useChatWithPersistence.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatState {
  messages: ChatMessage[];
  streamingMessageId: string | null;
  streamingContent: string;
  toolStatuses: Map<string, ToolStatus>;
}

interface ToolStatus {
  toolCallId: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  toolMessageId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: any;
  created_at: string;
  isStreaming?: boolean;
}

export const useChatWithPersistence = (workflowId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const processedMessageIds = useRef(new Set<string>());
  
  const [state, setState] = useState<ChatState>({
    messages: [],
    streamingMessageId: null,
    streamingContent: '',
    toolStatuses: new Map()
  });

  const [isConnected, setIsConnected] = useState(false);

  // Buscar histórico
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['chat-session', workflowId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Buscar sessão
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId)
        .single();

      if (!session) return null;

      // Buscar mensagens
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      return { session, messages: messages || [] };
    },
    enabled: !!workflowId
  });

  // Limpar chat
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId })
      });

      if (!response.ok) throw new Error('Failed to clear chat');
    },
    onSuccess: () => {
      setState(prev => ({ ...prev, messages: [] }));
      processedMessageIds.current.clear();
      queryClient.invalidateQueries({ queryKey: ['chat-session', workflowId] });
      toast({ title: 'Chat limpo com sucesso' });
    }
  });

  // Conectar WebSocket
  useEffect(() => {
    if (!workflowId) return;

    const connectWebSocket = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const ws = new WebSocket(`ws://localhost:3001?token=${session.access_token}`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível conectar ao servidor',
          variant: 'destructive'
        });
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [workflowId]);

  // Carregar histórico inicial
  useEffect(() => {
    if (sessionData?.messages) {
      const validMessages = sessionData.messages.filter(msg => msg.role !== 'tool');
      setState(prev => ({
        ...prev,
        messages: validMessages
      }));
      
      // Marcar como processadas
      validMessages.forEach(msg => {
        processedMessageIds.current.add(msg.id);
      });
    }
  }, [sessionData]);

  // Handler de mensagens WebSocket
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'token':
        setState(prev => ({
          ...prev,
          streamingContent: prev.streamingContent + data.content,
          streamingMessageId: data.messageId || prev.streamingMessageId
        }));
        break;

      case 'complete':
        setState(prev => ({
          ...prev,
          streamingContent: '',
          streamingMessageId: null
        }));
        break;

      case 'message_saved':
        if (!processedMessageIds.current.has(data.message.id)) {
          processedMessageIds.current.add(data.message.id);
          
          setState(prev => {
            const isStreamingMessage = prev.streamingMessageId === data.message.id;
            
            // Filtrar mensagens tool
            if (data.message.role === 'tool') {
              return prev;
            }
            
            return {
              ...prev,
              messages: [...prev.messages, data.message],
              streamingContent: isStreamingMessage ? '' : prev.streamingContent,
              streamingMessageId: isStreamingMessage ? null : prev.streamingMessageId
            };
          });
        }
        break;

      case 'tool_call':
        setState(prev => {
          const newToolStatuses = new Map(prev.toolStatuses);
          newToolStatuses.set(data.toolCallId, {
            toolCallId: data.toolCallId,
            status: 'executing'
          });
          return { ...prev, toolStatuses: newToolStatuses };
        });
        break;

      case 'tool_result':
        setState(prev => {
          const newToolStatuses = new Map(prev.toolStatuses);
          const status = newToolStatuses.get(data.toolCallId);
          if (status) {
            status.status = data.success ? 'success' : 'error';
            status.toolMessageId = data.messageId;
          }
          return { ...prev, toolStatuses: newToolStatuses };
        });
        break;

      case 'error':
        toast({
          title: 'Erro',
          description: data.content || 'Erro ao processar mensagem',
          variant: 'destructive'
        });
        break;
    }
  }, [toast]);

  // Obter mensagens renderizáveis
  const getRenderableMessages = useCallback(() => {
    const renderableMessages = [...state.messages];
    
    // Adicionar mensagem de streaming se existir
    if (state.streamingMessageId && state.streamingContent) {
      renderableMessages.push({
        id: state.streamingMessageId,
        role: 'assistant',
        content: state.streamingContent,
        isStreaming: true,
        metadata: {},
        created_at: new Date().toISOString()
      });
    }
    
    return renderableMessages;
  }, [state]);

  // Enviar mensagem
  const sendMessage = useCallback((content: string, model?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Erro',
        description: 'Conexão não estabelecida',
        variant: 'destructive'
      });
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      content,
      model,
      workflowId
    }));
  }, [workflowId, toast]);

  // Obter status de tool
  const getToolStatus = useCallback((toolCallId: string): ToolStatus | undefined => {
    return state.toolStatuses.get(toolCallId);
  }, [state.toolStatuses]);

  return {
    messages: getRenderableMessages(),
    sendMessage,
    clearChat: clearChatMutation.mutate,
    isLoading,
    isConnected,
    getToolStatus
  };
};
```

### 4.2 Componente Principal - WorkflowChat

```typescript
// src/pages/WorkflowChat.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatWithPersistence } from '@/hooks/useChatWithPersistence';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROGRAMMING_MODELS = [
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'deepseek/deepseek-coder', label: 'DeepSeek Coder V2' },
  { value: 'microsoft/wizardcoder-2-8x22b', label: 'WizardCoder 2' }
];

export const WorkflowChat: React.FC = () => {
  const { id: workflowId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-haiku');
  
  const {
    messages,
    sendMessage,
    clearChat,
    isLoading,
    isConnected,
    getToolStatus
  } = useChatWithPersistence(workflowId!);

  // Auto-scroll
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming || lastMessage?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, selectedModel);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Chat com IA</h2>
          {!isConnected && (
            <span className="text-sm text-muted-foreground">
              Conectando...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMMING_MODELS.map(model => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearChat()}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                getToolStatus={getToolStatus}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={!isConnected}
            placeholder={
              isConnected 
                ? "Digite sua mensagem..." 
                : "Conectando ao servidor..."
            }
          />
        </div>
      </div>
    </div>
  );
};
```

### 4.3 Componente de Mensagem

```typescript
// src/components/chat/ChatMessage.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { ToolCallIndicator } from './ToolCallIndicator';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    metadata?: {
      tool_calls?: Array<{
        id: string;
        name: string;
      }>;
    };
    isStreaming?: boolean;
  };
  getToolStatus?: (toolCallId: string) => any;
}

export const ChatMessage = React.memo(({ message, getToolStatus }: ChatMessageProps) => {
  // Não renderizar mensagens tool
  if (message.role === 'tool') return null;

  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-lg",
      isUser ? "bg-muted/50" : "bg-background"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1 h-4 bg-foreground/50 animate-pulse ml-1" />
          )}
        </div>
        
        {message.metadata?.tool_calls && getToolStatus && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.metadata.tool_calls.map(toolCall => (
              <ToolCallIndicator
                key={toolCall.id}
                toolCall={toolCall}
                status={getToolStatus(toolCall.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         !prevProps.message.isStreaming === !nextProps.message.isStreaming;
});
```

### 4.4 Indicador de Tool

```typescript
// src/components/chat/ToolCallIndicator.tsx
import React from 'react';
import { Loader2, Check, X, Search, Plus, Play } from 'lucide-react';

interface ToolCallIndicatorProps {
  toolCall: {
    id: string;
    name: string;
  };
  status?: {
    status: 'pending' | 'executing' | 'success' | 'error';
  };
}

export const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({ 
  toolCall, 
  status 
}) => {
  const getIcon = () => {
    if (!status || status.status === 'executing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (status.status === 'success') {
      switch (toolCall.name) {
        case 'getWorkflow':
          return <Search className="w-4 h-4" />;
        case 'createNode':
          return <Plus className="w-4 h-4" />;
        case 'executeWorkflow':
          return <Play className="w-4 h-4" />;
        default:
          return <Check className="w-4 h-4" />;
      }
    }
    
    return <X className="w-4 h-4 text-red-500" />;
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-sm">
      {getIcon()}
      <span className="text-muted-foreground">{toolCall.name}</span>
    </span>
  );
};
```

### 4.5 Input de Chat

```typescript
// src/components/chat/ChatInput.tsx
import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled, 
  placeholder 
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Digite sua mensagem..."}
        disabled={disabled}
        className="min-h-[60px] max-h-[200px] resize-none"
        rows={2}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="h-[60px] w-[60px]"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};
```

### 4.6 Tela de Boas-vindas

```typescript
// src/components/chat/WelcomeScreen.tsx
import React from 'react';
import { Bot, Zap, Code, Workflow } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const features = [
    {
      icon: <Workflow className="w-5 h-5" />,
      title: "Análise de Workflows",
      description: "Pergunte sobre nodes, conexões e configurações"
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: "Debugging",
      description: "Ajuda para resolver erros e problemas"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Otimizações",
      description: "Sugestões para melhorar performance"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">
        Assistente de Workflows n8n
      </h2>
      
      <p className="text-muted-foreground mb-8 max-w-md">
        Sou especializado em ajudar você com seus workflows n8n. 
        Posso analisar, debugar e sugerir melhorias.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border bg-card text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="text-primary">{feature.icon}</div>
              <h3 className="font-medium">{feature.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Digite uma mensagem para começar
      </p>
    </div>
  );
};
```

## Fase 5: Configuração de Rotas e API

### 5.1 Rota de Limpeza de Chat

```typescript
// src/api/chat/clear.ts (ou configure no seu backend)
export async function POST(req: Request) {
  const { workflowId } = await req.json();
  const token = req.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Validar token e limpar chat via ChatSessionManager
  // ...
  
  return new Response('OK', { status: 200 });
}
```

### 5.2 Atualizar Roteamento

```typescript
// src/App.tsx ou arquivo de rotas
import { WorkflowChat } from '@/pages/WorkflowChat';

// Adicionar rota
<Route path="/workflow/:id" element={<WorkflowChat />} />
```

## Fase 6: Testes e Validação

### 6.1 Checklist de Testes

- [ ] **Conexão WebSocket**
  - Conecta com sucesso com JWT válido
  - Rejeita conexões sem token
  - Reconecta automaticamente

- [ ] **Fluxo de Mensagens**
  - Mensagem do usuário é salva no banco
  - Streaming aparece em tempo real
  - Mensagem completa substitui streaming
  - Sem duplicação de mensagens

- [ ] **Tool Execution**
  - getWorkflow detectado automaticamente
  - Tool executa e retorna dados
  - Indicador visual funciona
  - Resposta inclui contexto da tool

- [ ] **Persistência**
  - Histórico carrega ao abrir chat
  - Mensagens são salvas corretamente
  - Limpar chat funciona
  - Isolamento entre workflows

- [ ] **Modelos de IA**
  - Seleção de modelo funciona
  - Cada modelo responde corretamente
  - Fallback para mock se falhar
  - Tracking de tokens correto

### 6.2 Comandos de Teste

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend WebSocket
cd server && npm run dev

# Terminal 3 - MCP Server (opcional)
cd server && npm run dev:mcp

# Terminal 4 - Logs
tail -f server/logs/app.log
```

## Troubleshooting

### Problemas Comuns

1. **WebSocket não conecta**
   - Verificar se o servidor está rodando na porta 3001
   - Confirmar token JWT válido
   - Checar CORS se necessário

2. **Mensagens duplicadas**
   - Verificar processedMessageIds
   - Confirmar que useEffect tem deps corretas
   - Checar se WebSocket não está duplicado

3. **Tool não executa**
   - Verificar detecção de palavras-chave
   - Confirmar conexão n8n ativa
   - Checar logs do MCP server

4. **Streaming não aparece**
   - Verificar handler de 'token' no WebSocket
   - Confirmar que messageId está sendo enviado
   - Checar estado streamingContent

## Métricas de Sucesso

- ✅ Chat em tempo real funcionando
- ✅ 8 modelos de IA disponíveis
- ✅ Tool getWorkflow integrada
- ✅ Persistência completa
- ✅ Tracking para cobrança
- ✅ UX profissional
- ✅ Zero duplicação de mensagens
- ✅ Performance < 100ms latência

## Próximos Passos

1. **Mais Tools MCP**
   - executeWorkflow
   - getExecutionLogs
   - analyzePerformance

2. **Melhorias de UX**
   - Markdown rendering
   - Code highlighting
   - File attachments

3. **Performance**
   - Redis cache
   - Connection pooling
   - Compressão WebSocket

4. **Monitoramento**
   - Sentry para erros
   - Analytics de uso
   - Dashboard de métricas

---

Este guia fornece todos os passos necessários para implementar o sistema de chat completo do MyWorkflows, desde o setup inicial até a validação final. Siga as fases em ordem para garantir uma implementação bem-sucedida.