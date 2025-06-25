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
- [x] Criar pasta `/server` na raiz do projeto
- [x] Configurar Node.js com TypeScript 
- [x] Instalar dependências básicas: `ws`, `openai`, `cors`, `jsonwebtoken`
- [x] Setup ambiente (.env) com `OPENROUTER_API_KEY`

#### 1.2 Servidor WebSocket Básico
- [x] Implementar servidor WebSocket simples em `/server/websocket.ts`
- [x] Sistema de autenticação JWT básica
- [x] Bridge SSE→WebSocket para OpenRouter
- [x] Handler para mensagens de chat

#### 1.3 Integração com Workflow n8n
- [x] Função para buscar workflow atual do Supabase
- [x] Incluir JSON do workflow no contexto do agente
- [x] Sistema básico de contexto de sessão

#### 1.4 Frontend - Hook de Chat
- [x] Criar `useAIAgent` hook para WebSocket
- [x] Integrar na interface de chat existente (`WorkflowChat.tsx`)
- [x] Streaming de respostas em tempo real
- [x] Estado de conexão e reconexão automática

#### 1.5 Testes da Vitória Fácil
- [x] Testar conexão WebSocket frontend↔backend
- [x] Testar streaming de resposta do OpenRouter
- [x] Testar acesso ao JSON do workflow
- [x] Validar conversa sobre o workflow

### Fase 2: Chat Persistente por Workflow (PRIORIDADE MÁXIMA)
**Objetivo**: Sistema de chat que mantém histórico por workflow em 6-9 horas

#### 2.1 Database Schema (Supabase)
- [ ] Criar tabela `chat_sessions` - uma sessão por workflow/usuário
- [ ] Criar tabela `chat_messages` - mensagens do chat (user/assistant)
- [ ] Configurar políticas RLS para segurança
- [ ] Atualizar types TypeScript com novas interfaces

#### 2.2 Backend - Persistência de Mensagens  
- [ ] Criar `ChatSessionManager` para gerenciar sessões
- [ ] Modificar WebSocket server para salvar mensagens do usuário
- [ ] Salvar respostas do agente no banco automaticamente
- [ ] API para buscar histórico de mensagens de uma sessão

#### 2.3 Frontend - Chat Persistente
- [ ] Criar hook `useChatWithPersistence` para carregar histórico
- [ ] Modificar WorkflowChat para usar chat persistente
- [ ] Loading states para carregar histórico ao trocar de workflow
- [ ] Indicadores de que mensagens foram salvas

#### 2.4 UX e Melhorias
- [ ] Botão "Limpar Chat" opcional
- [ ] Cache inteligente no frontend
- [ ] Tratamento de erros de persistência

### Fase 3: MCP Tools Básicas (EM PARALELO - FUTURO)
**Objetivo**: Agente com capacidades de ação avançadas

#### 3.1 Setup MCP Server
- [ ] Instalar `@modelcontextprotocol/sdk`
- [ ] Configurar servidor MCP em `/server/mcp-server.ts`
- [ ] Integrar MCP server com WebSocket gateway

#### 3.2 Tools Essenciais n8n
- [ ] **Tool 1**: `get-workflow-details` - detalhes do workflow atual
- [ ] **Tool 2**: `analyze-workflow` - análise de nodes e conexões
- [ ] **Tool 3**: `suggest-improvements` - sugestões de otimização
- [ ] **Tool 4**: `validate-workflow` - verificar problemas

#### 3.3 Tools Básicas de Database
- [ ] **Tool 5**: `query-connections` - listar conexões n8n do usuário
- [ ] **Tool 6**: `get-workflow-history` - histórico de execuções
- [ ] Validação de permissões por usuário

#### 3.4 Integração Frontend
- [ ] Interface para habilitar/desabilitar tools
- [ ] Exibição de resultados de tools no chat
- [ ] Loading states durante execução de tools

### Fase 4: Integração n8n API (Opcional - Futuro)
**Objetivo**: Agente com acesso real ao n8n

#### 4.1 Client n8n API
- [ ] Implementar client para n8n API REST
- [ ] Autenticação com instâncias n8n via conexões salvas
- [ ] Tools para execução de workflows

#### 4.2 Tools Avançadas n8n
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

### Fase 1 - Vitória Fácil ✅
- [x] Chat em tempo real funcionando
- [x] Agente tem acesso ao JSON do workflow
- [x] Respostas streaming do OpenRouter
- [x] Perguntas sobre workflow são respondidas corretamente

### Fase 2 - Chat Persistente 🚧
- [ ] Chat mantém histórico por workflow
- [ ] Mensagens salvas no banco de dados
- [ ] Interface carrega conversas anteriores
- [ ] UX profissional como ChatGPT/Claude

### Fase 3 - MCP Tools ⏳
- [ ] Tools MCP executando
- [ ] Análise de workflows funcionando
- [ ] Sugestões de melhorias relevantes
- [ ] Interface de tools integrada

Esta implementação gradual garante que você tenha uma vitória fácil rapidamente, podendo depois expandir com as capacidades MCP de forma incremental.