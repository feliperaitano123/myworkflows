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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const historyTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);
  const previousWorkflowIdRef = useRef<string | null>(null);
  const pendingHistoryRequestRef = useRef<string | null>(null);
  const historyRetryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Carregar histórico do banco (comentado - agora usamos WebSocket)
  // O histórico agora é carregado via WebSocket após conectar
  // Isso evita duplicação e garante consistência
  /*
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
  */

  // Conectar WebSocket
  useEffect(() => {
    if (!user || !workflowId) return;

    // Verificar se realmente mudou de workflow
    const workflowChanged = previousWorkflowIdRef.current !== workflowId;
    previousWorkflowIdRef.current = workflowId;

    // Se não mudou de workflow, não fazer nada
    if (!workflowChanged && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Mesmo workflow e WebSocket conectado, mantendo conexão');
      return;
    }

    // Evitar múltiplas conexões simultâneas
    if (isConnectingRef.current) {
      console.log('Já existe uma conexão em andamento, ignorando...');
      return;
    }

    isConnectingRef.current = true;

    // Cancelar qualquer conexão anterior
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Limpar estado apenas quando trocar de workflow
    if (workflowChanged) {
      setState({
        messages: [],
        streamingMessageId: null,
        streamingContent: '',
        toolStatuses: new Map()
      });
      processedMessageIds.current.clear();
      setIsLoadingHistory(true);
    }

    const connectWebSocket = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const ws = new WebSocket(
        `ws://localhost:3001?token=${session.access_token}`
      );

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        isConnectingRef.current = false;
        
        // Armazenar workflowId para solicitar histórico após "connected"
        pendingHistoryRequestRef.current = workflowId;
        console.log('Aguardando confirmação "connected" para solicitar histórico...');
      };

      ws.onmessage = (event) => {
        console.log('WebSocket mensagem recebida:', event.data);
        handleWebSocketMessage(event);
      };

      ws.onerror = (error) => {
        console.error('WebSocket erro:', error);
        setIsLoadingHistory(false);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason);
        setIsConnected(false);
        setIsLoadingHistory(false);
        isConnectingRef.current = false;
      };

      wsRef.current = ws;
    };

    // Adicionar delay maior para evitar múltiplas conexões rápidas
    const connectionDelay = setTimeout(() => {
      connectWebSocket();
    }, 300);

    return () => {
      isConnectingRef.current = false;
      pendingHistoryRequestRef.current = null;
      clearTimeout(connectionDelay);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [user, workflowId]);

  // Função para solicitar histórico
  const requestHistory = useCallback((workflowId: string, retryCount = 0) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket não está pronto para solicitar histórico');
      return;
    }

    console.log(`Solicitando histórico (tentativa ${retryCount + 1}):`, workflowId);
    wsRef.current.send(JSON.stringify({
      type: 'get_history',
      workflowId: workflowId,
      limit: 50
    }));

    // Timeout com retry
    historyTimeoutRef.current = setTimeout(() => {
      if (retryCount < 2) { // Máximo 3 tentativas
        console.warn(`Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
        historyRetryCountRef.current = retryCount + 1;
        requestHistory(workflowId, retryCount + 1);
      } else {
        console.error('Timeout final no carregamento do histórico após 3 tentativas');
        setIsLoadingHistory(false);
        setState(prev => ({
          ...prev,
          messages: []
        }));
      }
    }, 5000); // 5 segundos por tentativa
  }, []);

  // Handler unificado para WebSocket
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Processando mensagem tipo:', data.type);

      switch (data.type) {
      case 'token':
        // Streaming de tokens
        setState(prev => ({
          ...prev,
          streamingContent: prev.streamingContent + data.content,
          streamingMessageId: 'streaming'
        }));
        break;

      case 'message_saved':
        // Mensagem salva no banco
        if (!processedMessageIds.current.has(data.message.id)) {
          processedMessageIds.current.add(data.message.id);
          
          setState(prev => {
            // Não adicionar mensagens tool
            if (data.message.role === 'tool') {
              return prev;
            }
            
            // Se é uma mensagem do assistant e estamos fazendo streaming, limpar o streaming
            const shouldClearStreaming = data.message.role === 'assistant' && prev.streamingContent;
            
            return {
              ...prev,
              messages: [...prev.messages, data.message],
              streamingContent: shouldClearStreaming ? '' : prev.streamingContent,
              streamingMessageId: shouldClearStreaming ? null : prev.streamingMessageId
            };
          });
        }
        break;

      case 'complete':
        // Chat cleared successfully
        console.log('Chat cleared:', data.content);
        break;

      case 'tool_call':
        // Tool sendo executada
        console.log('Tool call received:', data);
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
        console.log('Tool result received:', data);
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

      case 'history':
        // Histórico recebido
        console.log('Histórico recebido:', data.history?.length || 0, 'mensagens');
        console.log('Dados brutos do histórico:', data.history);
        
        // Cancelar timeout e resetar contador se histórico foi recebido
        if (historyTimeoutRef.current) {
          clearTimeout(historyTimeoutRef.current);
          historyTimeoutRef.current = undefined;
        }
        historyRetryCountRef.current = 0;
        
        setIsLoadingHistory(false);
        
        if (data.history && Array.isArray(data.history)) {
          // Filtrar apenas mensagens válidas (user e assistant)
          const validMessages = data.history.filter((msg: any) => {
            const isValid = msg.role === 'user' || msg.role === 'assistant';
            if (!isValid) {
              console.log('Mensagem filtrada (role inválido):', msg.role, msg.id);
            }
            return isValid;
          });
          
          console.log('Mensagens após filtro:', validMessages.length, 'de', data.history.length);
          
          // Criar status para tool calls antigas (assumir sucesso)
          const newToolStatuses = new Map<string, ToolStatus>();
          validMessages.forEach((msg: any) => {
            if (msg.metadata?.toolCalls) {
              msg.metadata.toolCalls.forEach((toolCall: any) => {
                newToolStatuses.set(toolCall.id, {
                  toolCallId: toolCall.id,
                  status: 'success'
                });
              });
            }
          });
          
          setState(prev => ({
            ...prev,
            messages: validMessages,
            toolStatuses: newToolStatuses
          }));
          
          // Marcar como processadas
          validMessages.forEach((msg: any) => processedMessageIds.current.add(msg.id));
          console.log('Estado atualizado com', validMessages.length, 'mensagens válidas');
          console.log('IDs processados:', Array.from(processedMessageIds.current));
          
        } else {
          console.log('Nenhum histórico recebido ou formato inválido');
          setState(prev => ({
            ...prev,
            messages: []
          }));
        }
        break;

      case 'error':
        // Erro do servidor
        console.error('Erro do servidor:', data.error);
        setIsLoadingHistory(false);
        
        // Se o erro for relacionado ao histórico, garantir estado limpo
        if (data.error?.includes('histórico') || data.error?.includes('history')) {
          setState(prev => ({
            ...prev,
            messages: []
          }));
        }
        break;

      case 'connected':
        // Conexão confirmada
        console.log('Conectado ao servidor WebSocket');
        
        // Solicitar histórico após confirmação de conexão
        if (pendingHistoryRequestRef.current) {
          const workflowToRequest = pendingHistoryRequestRef.current;
          pendingHistoryRequestRef.current = null;
          historyRetryCountRef.current = 0;
          
          console.log('Solicitando histórico para workflow após "connected":', workflowToRequest);
          requestHistory(workflowToRequest);
        }
        break;

      case 'tool_start':
      case 'tool_progress':
      case 'tool_complete':
      case 'ai_thinking':
      case 'ai_responding':
        // Log tool-related messages for debugging
        console.log(`Tool event: ${data.type}`, data);
        break;

      default:
        console.log('Unknown message type:', data.type, data);
    }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }, [setIsLoadingHistory]);

  // Obter mensagens renderizáveis
  const getRenderableMessages = useCallback(() => {
    const renderableMessages = [...state.messages];
    
    // Adicionar streaming se existir
    if (state.streamingContent) {
      renderableMessages.push({
        id: 'streaming-message',
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

  // Limpar chat
  const clearChat = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket não conectado');
      return;
    }

    wsRef.current.send(JSON.stringify({ 
      type: 'clear_chat',
      workflowId
    }));

    // Limpar estado local imediatamente
    setState({
      messages: [],
      streamingMessageId: null,
      streamingContent: '',
      toolStatuses: new Map()
    });
    processedMessageIds.current.clear();
  }, [workflowId]);

  return {
    messages: getRenderableMessages(),
    sendMessage,
    getToolStatus,
    clearChat,
    isConnected,
    isLoadingHistory
  };
};