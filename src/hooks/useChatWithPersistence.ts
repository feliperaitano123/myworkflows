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
    if (!wsMessages || wsMessages.length === 0) return;
    
    const latestMessage = wsMessages[wsMessages.length - 1];
    console.log('📨 Mensagem WebSocket recebida:', latestMessage);
    
    // Processar diferentes tipos de mensagem
    switch (latestMessage.type) {
      case 'message_saved':
        console.log('💾 Mensagem salva confirmada');
        break;
      case 'complete':
        console.log('✅ Streaming completo - adicionando resposta às mensagens');
        if (currentResponse) {
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: currentResponse,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
        break;
      case 'history':
        console.log('📖 Histórico recebido:', latestMessage.history?.length || 0, 'mensagens');
        if (latestMessage.history) {
          const historyMessages = latestMessage.history.map((msg: any) => convertWSMessage(msg));
          setMessages(historyMessages);
        }
        setIsLoadingHistory(false);
        break;
      case 'error':
        console.error('❌ Erro WebSocket:', latestMessage.error);
        setError(latestMessage.error || 'Erro desconhecido');
        setIsLoadingHistory(false);
        break;
    }
  }, [wsMessages, currentResponse]);

  const loadChatHistory = async (targetWorkflowId: string) => {
    if (!isConnected) {
      console.log('⏳ Aguardando conexão para carregar histórico...');
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    try {
      // Limpar mensagens antigas primeiro
      setMessages([]);
      
      // Por agora, vamos simular carregamento sem requisição
      // TODO: Implementar requisição real de histórico
      console.log('📖 Simulando carregamento de histórico...');
      
      console.log(`📖 Histórico solicitado para workflow: ${targetWorkflowId}`);
      
      // Simular fim do loading após um tempo
      setTimeout(() => setIsLoadingHistory(false), 1000);
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico do chat');
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

      // TODO: Implementar clear_chat no backend
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
  // (implementado no listener de wsMessages acima)

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