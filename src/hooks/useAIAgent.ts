import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIMessage {
  type: 'token' | 'complete' | 'error' | 'connected' | 'history' | 'message_saved';
  content?: string;
  sessionId?: string;
  error?: string;
  history?: any[];
  messageId?: string;
}

export interface UseAIAgentOptions {
  url: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface UseAIAgentReturn {
  isConnected: boolean;
  isConnecting: boolean;
  sendMessage: (message: string, workflowId?: string, model?: string) => void;
  messages: AIMessage[];
  currentResponse: string;
  error: string | null;
  clearMessages: () => void;
  clearCurrentResponse: () => void;
  socket: WebSocket | null;
}

export const useAIAgent = ({ 
  url, 
  autoReconnect = true,
  maxReconnectAttempts = 5 
}: UseAIAgentOptions): UseAIAgentReturn => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Obter token de autenticação do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Criar conexão WebSocket com token
      const wsUrl = `${url}?token=${session.access_token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔗 Conectado ao agente de IA');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: AIMessage = JSON.parse(event.data);
          
          // Adicionar mensagem para que useChatWithPersistence possa processar
          setMessages(prev => [...prev, message]);
          
          if (message.type === 'token' && message.content) {
            setCurrentResponse(prev => prev + message.content);
          } else if (message.type === 'complete') {
            // Não fazer nada aqui - deixar useChatWithPersistence processar
            console.log('🏁 useAIAgent: Complete recebido, deixando para useChatWithPersistence processar');
          } else if (message.type === 'error') {
            setError(message.error || 'Erro desconhecido');
            setCurrentResponse('');
          }
        } catch (parseError) {
          console.error('Erro ao parsear mensagem do WebSocket:', parseError);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 Desconectado do agente de IA', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (event.code !== 1000 && event.code !== 1001) {
          // Conexão fechada inesperadamente
          setError(`Conexão perdida: ${event.reason || 'Motivo desconhecido'}`);
          
          // Tentar reconectar se habilitado
          if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Backoff exponencial
            
            console.log(`🔄 Tentando reconectar em ${delay}ms (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erro no WebSocket:', error);
        setError('Erro de conexão com o agente');
        setIsConnecting(false);
      };

      setSocket(ws);

    } catch (connectionError) {
      console.error('❌ Erro ao conectar:', connectionError);
      setError(connectionError instanceof Error ? connectionError.message : 'Erro de conexão');
      setIsConnecting(false);
    }
  }, [url, autoReconnect, maxReconnectAttempts]);

  const sendMessage = useCallback((message: string, workflowId?: string, model?: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'chat',
        content: message,
        workflowId,
        model
      };
      
      console.log(`📤 Frontend: Enviando modelo "${model}" para backend`);
      console.log(`📦 Frontend: Payload completo:`, payload);
      
      socket.send(JSON.stringify(payload));
      setCurrentResponse(''); // Limpar resposta anterior
      setError(null); // Limpar erros anteriores
    } else {
      setError('Não conectado ao agente. Tentando reconectar...');
      if (socket?.readyState === WebSocket.CLOSED) {
        connect();
      }
    }
  }, [socket, connect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    setError(null);
  }, []);

  const clearCurrentResponse = useCallback(() => {
    setCurrentResponse('');
  }, []);

  // Conectar na inicialização
  useEffect(() => {
    connect();
    
    // Cleanup na desmontagem
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return {
    isConnected,
    isConnecting,
    sendMessage,
    messages,
    currentResponse,
    error,
    clearMessages,
    clearCurrentResponse,
    socket
  };
};