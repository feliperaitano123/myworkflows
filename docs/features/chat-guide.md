# Guia de Design - Sistema de Chat com IA (Refinado v2)

## 🚨 PRIORIDADE MÁXIMA: Sincronização Streaming/Banco de Dados

### Arquitetura de Estado Único (Single Source of Truth)

#### Princípios Fundamentais
1. **Banco de dados é a única fonte de verdade** - Nenhuma duplicação de estado
2. **Streaming é temporário** - Apenas visualização em tempo real, sem persistência local
3. **Transição sem re-renderização** - De streaming para persistido sem flicker
4. **WebSocket como canal único** - Toda comunicação por um canal só

### Implementação Crítica

#### Hook Principal - Gerenciamento de Estado

```typescript
// useChatWithPersistence.ts
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

export const useChatWithPersistence = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    streamingMessageId: null,
    streamingContent: '',
    toolStatuses: new Map()
  });

  // Referência para evitar atualizações duplicadas
  const processedMessageIds = useRef(new Set<string>());
  const wsRef = useRef<WebSocket | null>(null);

  // Handler unificado para eventos WebSocket
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'token':
        // Apenas acumular streaming, não criar mensagem
        setState(prev => ({
          ...prev,
          streamingContent: prev.streamingContent + data.content,
          streamingMessageId: data.messageId
        }));
        break;

      case 'message_saved':
        // Mensagem persistida no banco - substituir streaming
        if (!processedMessageIds.current.has(data.message.id)) {
          processedMessageIds.current.add(data.message.id);
          
          setState(prev => {
            // Remover streaming se for da mesma mensagem
            const isStreamingMessage = prev.streamingMessageId === data.message.id;
            
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
        // Tool foi chamada - adicionar ao tracking
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
        // Tool retornou resultado
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
    }
  }, []);

  // Função para obter mensagens renderizáveis
  const getRenderableMessages = useCallback(() => {
    const renderableMessages = [...state.messages];
    
    // Adicionar mensagem de streaming se existir
    if (state.streamingMessageId && state.streamingContent) {
      renderableMessages.push({
        id: state.streamingMessageId,
        role: 'assistant',
        content: state.streamingContent,
        isStreaming: true,
        metadata: {}
      });
    }
    
    return renderableMessages;
  }, [state]);

  // Função para obter status de uma tool
  const getToolStatus = useCallback((toolCallId: string): ToolStatus | undefined => {
    return state.toolStatuses.get(toolCallId);
  }, [state.toolStatuses]);

  return {
    messages: getRenderableMessages(),
    sendMessage: (content: string) => {
      wsRef.current?.send(JSON.stringify({ type: 'chat', content }));
    },
    getToolStatus,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};
```

### Prevenção de Duplicação - Regras Críticas

```typescript
// Componente de Mensagem - NUNCA re-renderizar desnecessariamente
const ChatMessage = React.memo(({ message }: { message: ChatMessage }) => {
  // Se é tool, não renderizar
  if (message.role === 'tool') return null;

  return (
    <div className={cn(
      "message",
      message.role === 'user' ? 'user-message' : 'assistant-message'
    )}>
      <MessageContent message={message} />
      {message.metadata?.toolCalls && (
        <ToolCallsDisplay toolCalls={message.metadata.toolCalls} />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada - evitar re-renders
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         !prevProps.message.isStreaming === !nextProps.message.isStreaming;
});
```

## Sistema Simplificado de Tool Calls

### Visual Minimalista - Apenas Nome + Ícone

```tsx
// ToolCallIndicator.tsx
interface ToolCallIndicatorProps {
  toolCall: {
    id: string;
    name: string;
  };
}

const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({ toolCall }) => {
  const { getToolStatus } = useChatWithPersistence();
  const status = getToolStatus(toolCall.id);

  const getIcon = () => {
    if (!status || status.status === 'executing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (status.status === 'success') {
      // Ícones específicos por tool
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

### CSS Essencial para Tools

```css
/* Tool indicator - super simples */
.tool-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: hsl(var(--muted));
  border-radius: 9999px;
  font-size: 0.875rem;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

## Fluxo de Dados Simplificado

### 1. Mensagem do Assistant com Tool Call

```typescript
// Backend envia
{
  type: 'message_saved',
  message: {
    id: 'msg_123',
    role: 'assistant',
    content: 'Vou buscar os dados do workflow...',
    metadata: {
      toolCalls: [{
        id: 'call_abc',
        name: 'getWorkflow'
      }]
    }
  }
}
```

### 2. Tool em Execução

```typescript
// Backend envia status
{
  type: 'tool_call',
  toolCallId: 'call_abc',
  status: 'executing'
}
```

### 3. Tool Concluída

```typescript
// Backend envia resultado (mas não mostramos o content)
{
  type: 'tool_result',
  toolCallId: 'call_abc',
  success: true,
  messageId: 'msg_124' // Referência à mensagem tool no banco
}
```

## Componente Principal do Chat

```tsx
// WorkflowChat.tsx
export const WorkflowChat: React.FC<{ workflowId: string }> = ({ workflowId }) => {
  const { messages, sendMessage, isConnected } = useChatWithPersistence();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll APENAS quando necessário
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming || lastMessage?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={!isConnected}
      />
    </div>
  );
};
```

## Checklist de Implementação Crítica

### Fase 1: Fundação (FAZER PRIMEIRO)
- [ ] Implementar `useChatWithPersistence` com deduplicação
- [ ] Configurar WebSocket com handlers únicos
- [ ] Implementar `processedMessageIds` para evitar duplicatas
- [ ] Testar transição streaming → persistido sem re-render

### Fase 2: Tool Calls Simples
- [ ] Criar `ToolCallIndicator` minimalista
- [ ] Implementar Map de `toolStatuses`
- [ ] Vincular por `toolCallId`
- [ ] Testar múltiplas tools simultâneas

### Fase 3: Polish Visual (DEPOIS)
- [ ] Remover avatares e ícones
- [ ] Aplicar backgrounds corretos
- [ ] Implementar cores cinzas nos hovers
- [ ] Limpar CSS desnecessário

## Testes Críticos

```typescript
// tests/chat-sync.test.ts
describe('Chat Synchronization', () => {
  it('should not duplicate messages when transitioning from streaming to saved', async () => {
    // Simular streaming
    ws.send({ type: 'token', content: 'Hello', messageId: 'msg_1' });
    ws.send({ type: 'token', content: ' world', messageId: 'msg_1' });
    
    // Simular salvamento
    ws.send({ 
      type: 'message_saved', 
      message: { id: 'msg_1', content: 'Hello world', role: 'assistant' }
    });
    
    // Verificar que há apenas 1 mensagem
    expect(getMessages()).toHaveLength(1);
    expect(getMessages()[0].content).toBe('Hello world');
    expect(getMessages()[0].isStreaming).toBe(false);
  });

  it('should track tool execution status correctly', async () => {
    // Tool call
    ws.send({ type: 'tool_call', toolCallId: 'call_1', status: 'executing' });
    expect(getToolStatus('call_1')).toBe('executing');
    
    // Tool result
    ws.send({ type: 'tool_result', toolCallId: 'call_1', success: true });
    expect(getToolStatus('call_1')).toBe('success');
  });
});
```

## Estrutura de Dados Final

```typescript
// types/chat.ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    toolCalls?: Array<{
      id: string;
      name: string;
    }>;
    toolCallId?: string; // Para mensagens tool
    status?: 'success' | 'error';
  };
  isStreaming?: boolean; // Apenas para renderização temporária
  created_at: string;
}
```

## Notas Importantes

1. **NUNCA** salvar estado de streaming no localStorage ou state persistente
2. **SEMPRE** usar o banco como fonte única de verdade
3. **Tool messages** existem no banco mas NÃO são renderizadas
4. **Streaming** é apenas visual temporário

5. **WebSocket** é o único canal de comunicação

---

Este documento prioriza a **funcionalidade correta** sobre aparência. A sincronização perfeita entre streaming e banco de dados é o requisito mais crítico. Aspectos visuais são secundários e devem ser implementados apenas após a funcionalidade estar 100% estável.