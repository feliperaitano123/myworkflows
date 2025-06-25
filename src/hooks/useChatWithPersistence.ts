import { useState, useEffect, useCallback, useRef } from 'react';
import { useAIAgent } from './useAIAgent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'execution';
  }>;
  metadata?: any;
}

export interface UseChatWithPersistenceOptions {
  workflowId?: string;
  wsUrl?: string;
}

export interface UseChatWithPersistenceReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  isLoadingHistory: boolean;
  currentResponse: string;
  connectionStatus: {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
  };
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  clearChat: () => Promise<void>;
  error: string | null;
}

const WS_URL = 'ws://localhost:3001';

export const useChatWithPersistence = ({ 
  workflowId, 
  wsUrl = WS_URL 
}: UseChatWithPersistenceOptions): UseChatWithPersistenceReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Usar o hook base para WebSocket
  const { 
    isConnected, 
    isConnecting, 
    sendMessage: sendToAgent, 
    messages: wsMessages,
    currentResponse,
    error: wsError,
    clearMessages: clearWSMessages
  } = useAIAgent({ url: wsUrl });

  const currentWorkflowId = useRef<string | undefined>(workflowId);
  const wsRef = useRef<WebSocket | null>(null);

  // Converter mensagens do WebSocket para nosso formato
  const convertWSMessage = useCallback((wsMsg: any): ChatMessage => {
    return {
      id: wsMsg.id || Date.now().toString(),
      role: wsMsg.role || 'assistant',
      content: wsMsg.content || '',
      timestamp: new Date(wsMsg.created_at || Date.now()),
      metadata: wsMsg.metadata
    };
  }, []);

  // Carregar histórico quando workflowId muda
  useEffect(() => {
    if (workflowId && workflowId !== currentWorkflowId.current && isConnected) {
      loadChatHistory(workflowId);
      currentWorkflowId.current = workflowId;
    }
  }, [workflowId, isConnected]);

  // Escutar mensagens especiais do WebSocket
  useEffect(() => {
    // TODO: Implementar listener para 'history' e outras mensagens especiais
    // Por agora, vamos simular o carregamento
  }, [wsMessages]);

  const loadChatHistory = async (targetWorkflowId: string) => {
    if (!isConnected) {
      console.log('⏳ Aguardando conexão para carregar histórico...');
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    try {
      // Enviar request para buscar histórico via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'get_history',
          workflowId: targetWorkflowId,
          limit: 50
        }));
      }

      // TODO: Escutar resposta com histórico
      // Por agora, limpar mensagens antigas
      setMessages([]);
      
      console.log(`📖 Histórico solicitado para workflow: ${targetWorkflowId}`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico do chat');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = useCallback(async (
    content: string, 
    attachments?: any[]
  ) => {
    if (!content.trim()) return;
    if (!isConnected) {
      setError('Não conectado ao agente');
      return;
    }

    try {
      setError(null);

      // Adicionar mensagem do usuário imediatamente na UI
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        attachments
      };

      setMessages(prev => [...prev, userMessage]);

      // Enviar para o agente via WebSocket
      if (workflowId) {
        await sendToAgent(content, workflowId);
      } else {
        await sendToAgent(content);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem');
    }
  }, [isConnected, workflowId, sendToAgent]);

  const clearChat = useCallback(async () => {
    if (!workflowId) {
      setMessages([]);
      clearWSMessages();
      return;
    }

    try {
      setError(null);

      // Enviar request para limpar chat via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'clear_chat',
          workflowId
        }));
      }

      // Limpar mensagens localmente
      setMessages([]);
      clearWSMessages();

      console.log(`🗑️ Chat limpo para workflow: ${workflowId}`);
      
    } catch (error) {
      console.error('❌ Erro ao limpar chat:', error);
      setError('Erro ao limpar chat');
    }
  }, [workflowId, clearWSMessages]);

  // Atualizar mensagens quando receber resposta do agente
  useEffect(() => {
    if (currentResponse && currentResponse.length > 0) {
      // A resposta está sendo streamed
      // Não fazemos nada aqui, o streaming é mostrado em tempo real
    }
  }, [currentResponse]);

  // Adicionar resposta completa quando streaming terminar
  useEffect(() => {
    // Escutar quando uma resposta completa chegar
    // TODO: Implementar listener para mensagem 'complete' do WebSocket
    // e adicionar a resposta completa às mensagens
  }, []);

  const connectionStatus = {
    isConnected,
    isConnecting,
    error: wsError
  };

  return {
    messages,
    isConnected,
    isConnecting,
    isLoadingHistory,
    currentResponse,
    connectionStatus,
    sendMessage,
    clearChat,
    error: error || wsError
  };
};

// Alias para compatibilidade
export const useChatMessages = useChatWithPersistence;