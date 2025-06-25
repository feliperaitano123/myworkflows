# Arquiteturas e Implementações para Agente de IA com MCP, OpenRouter e WebSocket

## Visão Executiva

Esta pesquisa identificou as melhores arquiteturas e implementações para construir um agente de IA que atenda aos seus requisitos específicos: uso de OpenRouter, implementação do Model Context Protocol (MCP), comunicação em tempo real via WebSocket, e integração com sua stack existente (React/TypeScript/Supabase). A análise revela que uma abordagem modular combinando o SDK oficial do MCP com uma arquitetura de WebSocket customizada oferece o melhor equilíbrio entre simplicidade e escalabilidade.

## Arquitetura Recomendada

### Stack Tecnológica Proposta

**Backend (Node.js/TypeScript):**
- **MCP SDK**: `@modelcontextprotocol/sdk` para implementação de tools
- **WebSocket**: Biblioteca `ws` nativa para máximo controle
- **OpenRouter Bridge**: Conversão SSE→WebSocket customizada
- **Supabase**: Edge Functions para execução serverless
- **Segurança**: JWT para autenticação, sandboxing para execução de tools

**Frontend (React/TypeScript):**
- **Hook customizado** para gerenciamento de WebSocket
- **Context API** para estado global de streaming
- **React Markdown** para renderização de respostas

### Diagrama da Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  WebSocket       │────▶│  MCP Server     │
│   + TypeScript  │     │  Gateway         │     │  + Tools        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                          │
                                ▼                          ▼
                        ┌──────────────────┐      ┌─────────────────┐
                        │  OpenRouter      │      │  Supabase       │
                        │  SSE Bridge      │      │  Database       │
                        └──────────────────┘      └─────────────────┘
```

## Implementação do MCP (Model Context Protocol)

### Configuração Básica do Servidor MCP

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "agent-server",
  version: "1.0.0"
});

// Registrar tool para executar workflows n8n
server.tool("execute-n8n-workflow",
  { 
    workflowId: z.string(),
    parameters: z.record(z.any()).optional()
  },
  async ({ workflowId, parameters }) => {
    try {
      const result = await executeN8nWorkflow(workflowId, parameters);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Registrar tool para consultar Supabase
server.tool("query-database",
  {
    table: z.string(),
    filters: z.record(z.any()).optional(),
    limit: z.number().optional()
  },
  async ({ table, filters, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    let query = supabase.from(table).select();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (limit) query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);
```

### Gerenciamento de Sessões com Segurança

```typescript
interface SecureSession {
  id: string;
  userId: string;
  permissions: string[];
  expiresAt: Date;
}

class SecureMCPServer {
  private sessions = new Map<string, SecureSession>();
  
  async handleRequest(req: Request): Promise<Response> {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    
    if (!token || !await this.verifyToken(token)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const session = await this.getOrCreateSession(token);
    
    // Aplicar contexto de segurança nas tools
    this.server.setContext({
      userId: session.userId,
      permissions: session.permissions
    });
    
    return await this.transport.handleRequest(req);
  }
  
  private async verifyToken(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return !!decoded.userId;
    } catch {
      return false;
    }
  }
}
```

## Implementação WebSocket com Streaming

### Servidor WebSocket com Bridge para OpenRouter

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';

class AIStreamingServer extends EventEmitter {
  private wss: WebSocket.Server;
  private mcpClient: MCPClient;
  
  constructor(port: number) {
    super();
    this.wss = new WebSocket.Server({ port });
    this.setupWebSocketServer();
  }
  
  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = this.extractSessionId(req);
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message, sessionId);
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });
      
      ws.on('close', () => {
        this.cleanupSession(sessionId);
      });
    });
  }
  
  private async handleMessage(
    ws: WebSocket, 
    message: any, 
    sessionId: string
  ) {
    const { type, content, tools } = message;
    
    if (type === 'chat') {
      // Processar com OpenRouter e MCP tools
      await this.streamResponse(ws, content, tools, sessionId);
    }
  }
  
  private async streamResponse(
    ws: WebSocket,
    userMessage: string,
    enabledTools: string[],
    sessionId: string
  ) {
    // Criar bridge SSE → WebSocket para OpenRouter
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
          tools: await this.getMCPTools(enabledTools)
        })
      }
    );
    
    const reader = openRouterResponse.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            
            // Verificar se precisa executar tool
            if (parsed.choices?.[0]?.delta?.tool_calls) {
              const toolResult = await this.executeMCPTool(
                parsed.choices[0].delta.tool_calls[0]
              );
              
              ws.send(JSON.stringify({
                type: 'tool_result',
                content: toolResult,
                sessionId
              }));
            } else if (parsed.choices?.[0]?.delta?.content) {
              // Enviar token via WebSocket
              ws.send(JSON.stringify({
                type: 'token',
                content: parsed.choices[0].delta.content,
                sessionId
              }));
            }
          } catch (error) {
            console.error('Error parsing SSE chunk:', error);
          }
        }
      }
    }
    
    ws.send(JSON.stringify({
      type: 'complete',
      sessionId
    }));
  }
  
  private async getMCPTools(enabledTools: string[]) {
    // Obter schemas das tools do MCP server
    const tools = await this.mcpClient.listTools();
    return tools
      .filter(tool => enabledTools.includes(tool.name))
      .map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));
  }
  
  private async executeMCPTool(toolCall: any) {
    return await this.mcpClient.callTool({
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments)
    });
  }
}
```

### Hook React para WebSocket com Reconexão Automática

```typescript
interface UseAIAgentOptions {
  url: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface AIMessage {
  type: 'token' | 'tool_result' | 'complete' | 'error';
  content?: string;
  sessionId: string;
}

const useAIAgent = ({ 
  url, 
  autoReconnect = true,
  maxReconnectAttempts = 5 
}: UseAIAgentOptions) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const reconnectAttemptsRef = useRef(0);
  
  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };
    
    ws.onmessage = (event) => {
      const message: AIMessage = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
      
      if (message.type === 'token') {
        setCurrentResponse(prev => prev + message.content);
      } else if (message.type === 'complete') {
        setCurrentResponse('');
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        setTimeout(connect, Math.pow(2, reconnectAttemptsRef.current) * 1000);
      }
    };
    
    setSocket(ws);
  }, [url, autoReconnect, maxReconnectAttempts]);
  
  const sendMessage = useCallback((message: string, enabledTools: string[] = []) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat',
        content: message,
        tools: enabledTools
      }));
    }
  }, [socket]);
  
  useEffect(() => {
    connect();
    return () => socket?.close();
  }, [connect]);
  
  return {
    isConnected,
    messages,
    currentResponse,
    sendMessage
  };
};
```

## Arquitetura de Segurança e Execução de Tools

### Padrão de Contenção para Execução Segura

```typescript
class SecureToolExecutor {
  private dockerClient: Docker;
  
  async executeInSandbox(
    toolName: string, 
    parameters: any,
    userId: string
  ): Promise<any> {
    // Validar permissões do usuário
    if (!await this.checkUserPermissions(userId, toolName)) {
      throw new Error('Unauthorized tool execution');
    }
    
    // Criar container isolado
    const container = await this.dockerClient.createContainer({
      Image: 'node:18-alpine',
      Cmd: ['node', 'tool-runner.js'],
      Env: [
        `TOOL_NAME=${toolName}`,
        `TOOL_PARAMS=${JSON.stringify(parameters)}`
      ],
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB limit
        CpuShares: 512,
        NetworkMode: 'none', // Sem acesso à rede
        ReadonlyRootfs: true
      }
    });
    
    try {
      await container.start();
      const result = await container.wait();
      const logs = await container.logs({ stdout: true });
      
      return JSON.parse(logs.toString());
    } finally {
      await container.remove();
    }
  }
  
  private async checkUserPermissions(
    userId: string, 
    toolName: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('user_permissions')
      .select('tools')
      .eq('user_id', userId)
      .single();
    
    return data?.tools?.includes(toolName) || false;
  }
}
```

### Rate Limiting e Monitoramento

```typescript
class AIAgentRateLimiter {
  private tokenBuckets = new Map<string, TokenBucket>();
  
  async checkLimit(userId: string, tokens: number): Promise<boolean> {
    const bucket = this.getOrCreateBucket(userId);
    
    if (!bucket.consume(tokens)) {
      // Log para monitoramento
      await this.logRateLimitExceeded(userId, tokens);
      return false;
    }
    
    // Métricas de uso
    await this.recordUsage(userId, tokens);
    return true;
  }
  
  private getOrCreateBucket(userId: string): TokenBucket {
    if (!this.tokenBuckets.has(userId)) {
      this.tokenBuckets.set(userId, new TokenBucket({
        capacity: 100000, // 100k tokens
        refillRate: 1000, // 1k tokens por minuto
        refillInterval: 60000 // 1 minuto
      }));
    }
    
    return this.tokenBuckets.get(userId)!;
  }
  
  private async recordUsage(userId: string, tokens: number) {
    await supabase
      .from('usage_metrics')
      .insert({
        user_id: userId,
        tokens_used: tokens,
        timestamp: new Date().toISOString()
      });
  }
}
```

## Integração com Supabase

### Edge Functions para Processamento de IA

```typescript
// supabase/functions/ai-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { message, sessionId } = await req.json()
  
  // Autenticação
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Processar com MCP
  const mcpResponse = await fetch(`${MCP_SERVER_URL}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': user.id
    },
    body: JSON.stringify({ message, sessionId })
  })
  
  const result = await mcpResponse.json()
  
  // Salvar no histórico
  await supabase
    .from('chat_history')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      message: message,
      response: result.response,
      tools_used: result.toolsUsed
    })
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Realtime Subscriptions para Estado do Agente

```typescript
// Frontend React
const AgentStateManager = () => {
  const supabase = useSupabaseClient();
  const [agentState, setAgentState] = useState<AgentState>();
  
  useEffect(() => {
    const subscription = supabase
      .channel('agent-state')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setAgentState(payload.new as AgentState);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
  
  return agentState;
};
```

## Alternativas Leves ao LangChain

### Abordagem Framework-Less Recomendada

```typescript
class LightweightAIAgent {
  private openRouterClient: OpenRouterClient;
  private mcpServer: MCPServer;
  private memoryStore: MemoryStore;
  
  async processMessage(
    message: string,
    context: ConversationContext
  ): Promise<AgentResponse> {
    // 1. Enriquecer contexto com memória
    const enrichedContext = await this.memoryStore.getRelevantContext(
      message,
      context.sessionId
    );
    
    // 2. Determinar tools necessárias
    const availableTools = await this.mcpServer.getToolsForContext(
      enrichedContext
    );
    
    // 3. Construir prompt
    const prompt = this.buildPrompt(message, enrichedContext, availableTools);
    
    // 4. Chamar LLM com streaming
    const response = await this.openRouterClient.chat({
      messages: prompt,
      tools: availableTools,
      stream: true,
      onToken: (token) => this.emit('token', token)
    });
    
    // 5. Executar tools se necessário
    if (response.toolCalls) {
      const toolResults = await this.executeTools(response.toolCalls);
      return this.processMessage(
        this.formatToolResults(toolResults),
        context
      );
    }
    
    // 6. Salvar na memória
    await this.memoryStore.save(context.sessionId, message, response);
    
    return response;
  }
}
```

### Uso do Vercel AI SDK como Alternativa

```typescript
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openrouter('anthropic/claude-3-haiku'),
    messages,
    tools: {
      executeN8nWorkflow: {
        description: 'Execute n8n workflow',
        parameters: z.object({
          workflowId: z.string()
        }),
        execute: async ({ workflowId }) => {
          const result = await n8nClient.executeWorkflow(workflowId);
          return result;
        }
      }
    },
    maxSteps: 5
  });
  
  return result.toDataStreamResponse();
}
```

## Padrões de Deployment e Escalabilidade

### Arquitetura de Microserviços para Agentes

```typescript
// Agent Orchestrator Service
class AgentOrchestrator {
  private services = {
    mcp: new MCPService(),
    streaming: new StreamingService(),
    tools: new ToolExecutionService(),
    memory: new MemoryService()
  };
  
  async handleRequest(request: AgentRequest): Promise<void> {
    const { message, sessionId, userId } = request;
    
    // 1. Validar e autorizar
    await this.validateRequest(userId, sessionId);
    
    // 2. Processar em pipeline assíncrono
    const pipeline = [
      () => this.services.memory.loadContext(sessionId),
      (context) => this.services.mcp.determineTools(message, context),
      (tools) => this.services.streaming.processWithTools(message, tools),
      (response) => this.services.tools.executeIfNeeded(response),
      (result) => this.services.memory.save(sessionId, result)
    ];
    
    await this.executePipeline(pipeline);
  }
}
```

### Deployment com Docker e Kubernetes

```yaml
# docker-compose.yml para desenvolvimento
version: '3.8'
services:
  mcp-server:
    build: ./mcp-server
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    ports:
      - "3001:3001"
    
  websocket-gateway:
    build: ./websocket-gateway
    ports:
      - "8080:8080"
    depends_on:
      - mcp-server
      - redis
    
  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data
```

## Recomendações Finais

### Para Implementação Imediata

1. **Comece com o básico**: Implemente primeiro um servidor WebSocket simples com bridge SSE para OpenRouter
2. **Adicione MCP gradualmente**: Integre o SDK oficial do MCP com tools básicas
3. **Segurança desde o início**: Implemente autenticação JWT e rate limiting
4. **Use Supabase Edge Functions**: Para processamento serverless e integração com seu backend existente

### Stack Recomendada Final

- **Backend**: Node.js + TypeScript + MCP SDK oficial + WebSocket nativo
- **Segurança**: JWT + Docker sandboxing + Rate limiting por token
- **Deployment**: Supabase Edge Functions + containerização Docker
- **Monitoramento**: Logs estruturados + métricas de uso + alertas

### Próximos Passos

1. Configurar ambiente de desenvolvimento com as dependências necessárias
2. Implementar servidor MCP básico com uma tool de teste
3. Criar bridge WebSocket-SSE para OpenRouter
4. Desenvolver hook React para consumo no frontend
5. Adicionar camadas de segurança e monitoramento
6. Testar integração com n8n e Supabase
7. Preparar deployment com Docker/Kubernetes

Esta arquitetura oferece o melhor equilíbrio entre simplicidade inicial e capacidade de escalar conforme necessário, mantendo controle total sobre a implementação sem depender de frameworks pesados.