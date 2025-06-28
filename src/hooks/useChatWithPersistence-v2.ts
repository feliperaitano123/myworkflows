import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    toolCalls?: Array<{
      id: string;
      name: string;
    }>;
    toolCallId?: string;
    status?: 'success' | 'error';
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
  };
  isStreaming?: boolean;
  created_at: string;
}

export const useChatWithPersistence = (workflowId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<ChatState>({
    messages: [],
    streamingMessageId: null,
    streamingContent: '',
    toolStatuses: new Map()
  });

  const processedMessageIds = useRef(new Set<string>());
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Carregar histórico do banco
  useEffect(() => {
    if (!workflowId || !user) return;

    const loadHistory = async () => {
      // Primeiro buscar a sessão
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId)
        .single();

      if (!session) return;

      // Buscar mensagens da sessão
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (data && !error) {
        // Filtrar apenas mensagens não-tool
        const validMessages = data.filter(msg => msg.role !== 'tool');
        
        setState(prev => ({
          ...prev,
          messages: validMessages
        }));
        
        // Marcar como processadas
        validMessages.forEach(msg => processedMessageIds.current.add(msg.id));
      }
    };

    loadHistory();
  }, [workflowId, user]);

  // Conectar WebSocket
  useEffect(() => {
    if (!user) return;

    const connectWebSocket = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const ws = new WebSocket(
        `ws://localhost:3001?token=${session.access_token}`
      );

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event);
      };

      ws.onerror = (error) => {
        console.error('WebSocket erro:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [user, workflowId]);

  // Handler unificado para WebSocket
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'token':
        // Streaming de tokens
        setState(prev => ({
          ...prev,
          streamingContent: prev.streamingContent + data.content,
          streamingMessageId: data.messageId
        }));
        break;

      case 'message_saved':
        // Mensagem salva no banco
        if (!processedMessageIds.current.has(data.message.id)) {
          processedMessageIds.current.add(data.message.id);
          
          setState(prev => {
            const isStreamingMessage = prev.streamingMessageId === data.message.id;
            
            // Não adicionar mensagens tool
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
        // Tool sendo executada
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
        // Resultado da tool
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

  // Obter mensagens renderizáveis
  const getRenderableMessages = useCallback(() => {
    const renderableMessages = [...state.messages];
    
    // Adicionar streaming se existir
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
      console.error('WebSocket não conectado');
      return;
    }

    wsRef.current.send(JSON.stringify({ 
      type: 'chat', 
      content,
      workflowId,
      model 
    }));
  }, [workflowId]);

  // Obter status de tool
  const getToolStatus = useCallback((toolCallId: string): ToolStatus | undefined => {
    return state.toolStatuses.get(toolCallId);
  }, [state.toolStatuses]);

  return {
    messages: getRenderableMessages(),
    sendMessage,
    getToolStatus,
    isConnected
  };
};