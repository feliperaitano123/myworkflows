# Feature Agent - Plano de Implementação

## Objetivo da Vitória Fácil

Implementar um agente de IA que:
- Conecte com OpenRouter para processamento LLM
- Tenha acesso ao JSON do workflow n8n atual
- Permita conversa com o agente sobre o workflow
- Interface de chat em tempo real

## Fases de Implementação

### Fase 1: Base WebSocket + OpenRouter (Vitória Fácil)
**Objetivo**: Agente básico funcional em 1-2 dias

#### 1.1 Configuração Inicial do Backend
- [ ] Criar pasta `/server` na raiz do projeto
- [ ] Configurar Node.js com TypeScript 
- [ ] Instalar dependências básicas: `ws`, `openai`, `cors`, `jsonwebtoken`
- [ ] Setup ambiente (.env) com `OPENROUTER_API_KEY`

#### 1.2 Servidor WebSocket Básico
- [ ] Implementar servidor WebSocket simples em `/server/websocket.ts`
- [ ] Sistema de autenticação JWT básica
- [ ] Bridge SSE→WebSocket para OpenRouter
- [ ] Handler para mensagens de chat

#### 1.3 Integração com Workflow n8n
- [ ] Função para buscar workflow atual do Supabase
- [ ] Incluir JSON do workflow no contexto do agente
- [ ] Sistema básico de contexto de sessão

#### 1.4 Frontend - Hook de Chat
- [ ] Criar `useAIAgent` hook para WebSocket
- [ ] Integrar na interface de chat existente (`WorkflowChat.tsx`)
- [ ] Streaming de respostas em tempo real
- [ ] Estado de conexão e reconexão automática

#### 1.5 Testes da Vitória Fácil
- [ ] Testar conexão WebSocket frontend↔backend
- [ ] Testar streaming de resposta do OpenRouter
- [ ] Testar acesso ao JSON do workflow
- [ ] Validar conversa sobre o workflow

### Fase 2: MCP Tools Básicas
**Objetivo**: Agente com capacidades de ação em 3-5 dias

#### 2.1 Setup MCP Server
- [ ] Instalar `@modelcontextprotocol/sdk`
- [ ] Configurar servidor MCP em `/server/mcp-server.ts`
- [ ] Integrar MCP server com WebSocket gateway

#### 2.2 Tools Essenciais n8n
- [ ] **Tool 1**: `get-workflow-details` - detalhes do workflow atual
- [ ] **Tool 2**: `analyze-workflow` - análise de nodes e conexões
- [ ] **Tool 3**: `suggest-improvements` - sugestões de otimização
- [ ] **Tool 4**: `validate-workflow` - verificar problemas

#### 2.3 Tools Básicas de Database
- [ ] **Tool 5**: `query-connections` - listar conexões n8n do usuário
- [ ] **Tool 6**: `get-workflow-history` - histórico de execuções
- [ ] Validação de permissões por usuário

#### 2.4 Integração Frontend
- [ ] Interface para habilitar/desabilitar tools
- [ ] Exibição de resultados de tools no chat
- [ ] Loading states durante execução de tools

### Fase 3: Integração n8n API (Opcional - Futuro)
**Objetivo**: Agente com acesso real ao n8n

#### 3.1 Client n8n API
- [ ] Implementar client para n8n API REST
- [ ] Autenticação com instâncias n8n via conexões salvas
- [ ] Tools para execução de workflows

#### 3.2 Tools Avançadas n8n
- [ ] **Tool**: `execute-workflow` - executar workflow via API
- [ ] **Tool**: `get-execution-logs` - logs de execução
- [ ] **Tool**: `modify-workflow` - sugestões de modificação

## Estrutura de Arquivos

```
/server/
├── src/
│   ├── websocket.ts          # Servidor WebSocket principal
│   ├── mcp-server.ts        # Servidor MCP com tools
│   ├── openrouter-bridge.ts # Bridge SSE → WebSocket
│   ├── auth/
│   │   └── jwt.ts           # Validação JWT
│   ├── tools/
│   │   ├── workflow-tools.ts # Tools relacionadas a workflows
│   │   └── database-tools.ts # Tools de consulta ao Supabase
│   └── types/
│       └── agent.ts         # Tipos TypeScript
├── package.json
├── tsconfig.json
└── .env

/src/hooks/
└── useAIAgent.ts           # Hook React para WebSocket

/src/components/chat/
├── AgentMessage.tsx        # Componente para mensagens do agente
└── ToolResult.tsx         # Exibição de resultados de tools
```

## Implementação Detalhada - Fase 1

### 1. Servidor WebSocket (`/server/src/websocket.ts`)

```typescript
import WebSocket from 'ws';
import { validateJWT } from './auth/jwt';
import { OpenRouterBridge } from './openrouter-bridge';

interface ChatMessage {
  type: 'chat';
  content: string;
  workflowId?: string;
}

interface WSMessage {
  type: 'token' | 'complete' | 'error';
  content: string;
  sessionId: string;
}

class AIWebSocketServer {
  private wss: WebSocket.Server;
  private openRouterBridge: OpenRouterBridge;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.openRouterBridge = new OpenRouterBridge();
    this.setupServer();
  }

  private setupServer() {
    this.wss.on('connection', async (ws, req) => {
      // Validar JWT do query string ou header
      const token = this.extractToken(req);
      const userId = await validateJWT(token);
      
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      ws.on('message', async (data) => {
        try {
          const message: ChatMessage = JSON.parse(data.toString());
          await this.handleChatMessage(ws, message, userId);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            content: 'Invalid message format'
          }));
        }
      });
    });
  }

  private async handleChatMessage(
    ws: WebSocket, 
    message: ChatMessage, 
    userId: string
  ) {
    // Buscar contexto do workflow se fornecido
    let workflowContext = '';
    if (message.workflowId) {
      workflowContext = await this.getWorkflowContext(message.workflowId, userId);
    }

    // Construir prompt com contexto
    const systemPrompt = `Você é um especialista em n8n workflows. ${workflowContext ? `Contexto do workflow atual: ${workflowContext}` : ''}`;

    // Stream resposta via OpenRouter
    await this.openRouterBridge.streamResponse(
      ws,
      message.content,
      systemPrompt,
      userId
    );
  }

  private async getWorkflowContext(workflowId: string, userId: string): Promise<string> {
    // Buscar no Supabase
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    return data ? JSON.stringify(data) : '';
  }
}
```

### 2. Bridge OpenRouter (`/server/src/openrouter-bridge.ts`)

```typescript
export class OpenRouterBridge {
  async streamResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    userId: string
  ) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            ws.send(JSON.stringify({ type: 'complete' }));
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              ws.send(JSON.stringify({
                type: 'token',
                content: content
              }));
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
    }
  }
}
```

### 3. Hook React (`/src/hooks/useAIAgent.ts`)

```typescript
interface UseAIAgentReturn {
  isConnected: boolean;
  sendMessage: (message: string, workflowId?: string) => void;
  messages: Array<{type: string, content: string}>;
  currentResponse: string;
}

export const useAIAgent = (wsUrl: string): UseAIAgentReturn => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Array<{type: string, content: string}>>([]);
  const [currentResponse, setCurrentResponse] = useState('');

  useEffect(() => {
    // Usar token do Supabase para autenticação
    const token = supabase.auth.getSession()?.access_token;
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'token') {
        setCurrentResponse(prev => prev + message.content);
      } else if (message.type === 'complete') {
        setMessages(prev => [...prev, {
          type: 'agent',
          content: currentResponse
        }]);
        setCurrentResponse('');
      }
    };

    setSocket(ws);
    
    return () => ws.close();
  }, [wsUrl]);

  const sendMessage = useCallback((message: string, workflowId?: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      setMessages(prev => [...prev, { type: 'user', content: message }]);
      
      socket.send(JSON.stringify({
        type: 'chat',
        content: message,
        workflowId
      }));
    }
  }, [socket]);

  return {
    isConnected,
    sendMessage,
    messages,
    currentResponse
  };
};
```

### 4. Integração no Frontend (`/src/pages/WorkflowChat.tsx`)

```typescript
// Adicionar no componente existente
const { isConnected, sendMessage, messages, currentResponse } = useAIAgent(
  'ws://localhost:3001'
);

// Modificar a função handleSendMessage para usar o WebSocket
const handleSendMessage = (message: string) => {
  if (selectedWorkflow) {
    sendMessage(message, selectedWorkflow.id);
  } else {
    sendMessage(message);
  }
};
```

## Cronograma de Implementação

### Semana 1 (Vitória Fácil)
- **Dias 1-2**: Setup inicial + WebSocket básico + OpenRouter bridge
- **Dias 3-4**: Hook React + integração frontend
- **Dia 5**: Testes e ajustes da vitória fácil

### Semana 2 (MCP Tools)
- **Dias 1-3**: Setup MCP + tools básicas de workflow
- **Dias 4-5**: Tools de database + interface de tools

### Futuro (Fase 3)
- Integração real com n8n API
- Tools avançadas de execução
- Melhorias de UX e performance

## Validação de Sucesso

### Vitória Fácil ✅
- [ ] Chat em tempo real funcionando
- [ ] Agente tem acesso ao JSON do workflow
- [ ] Respostas streaming do OpenRouter
- [ ] Perguntas sobre workflow são respondidas corretamente

### Fase 2 ✅
- [ ] Tools MCP executando
- [ ] Análise de workflows funcionando
- [ ] Sugestões de melhorias relevantes
- [ ] Interface de tools integrada

Esta implementação gradual garante que você tenha uma vitória fácil rapidamente, podendo depois expandir com as capacidades MCP de forma incremental.