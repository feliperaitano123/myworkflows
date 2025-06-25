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
  sendMessage: (content: string, attachments?: any[], model?: string) => Promise<void>;
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
    clearMessages: clearWSMessages,
    clearCurrentResponse,
    socket  // Expor o socket do useAIAgent
  } = useAIAgent({ url: wsUrl });

  const currentWorkflowId = useRef<string | undefined>(undefined);

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
      console.log(`🎯 Workflow mudou de "${currentWorkflowId.current}" para "${workflowId}"`);
      loadChatHistory(workflowId);
      currentWorkflowId.current = workflowId;
    }
  }, [workflowId, isConnected]);

  // Corrigir loadChatHistory para enviar requisição real
  const loadChatHistory = async (targetWorkflowId: string) => {
    console.log(`📖 Iniciando loadChatHistory para: ${targetWorkflowId}`);
    console.log(`🔌 isConnected: ${isConnected}, socket: ${socket ? 'exists' : 'null'}`);
    
    if (!isConnected || !socket) {
      console.log('⏳ Aguardando conexão para carregar histórico...');
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    // Timeout de segurança - resetar loading após 10 segundos
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ Timeout do carregamento de histórico');
      setIsLoadingHistory(false);
      setError('Timeout ao carregar histórico. Tente novamente.');
    }, 10000);

    try {
      setMessages([]);
      // Enviar requisição real de histórico via WebSocket
      const historyRequest = {
        type: 'get_history',
        workflowId: targetWorkflowId,
        limit: 50
      };
      
      console.log(`📡 Socket readyState: ${socket.readyState} (1 = OPEN)`);
      
      // Usar socket unificado do useAIAgent
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(historyRequest));
        console.log(`📖 ✅ Histórico solicitado para workflow: ${targetWorkflowId}`);
        console.log(`📦 Requisição enviada:`, historyRequest);
      } else {
        console.warn('WebSocket não está aberto para histórico.');
        clearTimeout(loadingTimeout);
        setIsLoadingHistory(false);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico do chat');
      clearTimeout(loadingTimeout);
      setIsLoadingHistory(false);
    }
  };

  // Escutar mensagens especiais do WebSocket
  useEffect(() => {
    if (!wsMessages || wsMessages.length === 0) return;
    
    const latestMessage = wsMessages[wsMessages.length - 1];
    console.log('📨 Mensagem WebSocket recebida:', latestMessage);
    
    // Processar diferentes tipos de mensagem
    switch (latestMessage.type) {
      case 'token':
        // Token já está sendo processado pelo useAIAgent
        console.log('🔤 Token recebido, tamanho do currentResponse:', currentResponse.length);
        break;
      case 'message_saved':
        console.log('💾 Mensagem salva confirmada');
        break;
      case 'complete':
        console.log('✅ Streaming completo - adicionando resposta às mensagens');
        console.log('📝 currentResponse:', currentResponse);
        if (currentResponse && currentResponse.trim()) {
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: currentResponse.trim(),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          console.log('🤖 Mensagem do assistente adicionada:', assistantMessage);
          
          // Limpar o currentResponse após adicionar à UI
          setTimeout(() => {
            clearCurrentResponse();
            console.log('🔄 CurrentResponse limpo');
          }, 100);
        } else {
          console.warn('⚠️ Resposta vazia ao completar streaming');
        }
        break;
      case 'history':
        console.log('📖 ✅ Histórico recebido:', latestMessage.history?.length || 0, 'mensagens');
        if (latestMessage.history && latestMessage.history.length > 0) {
          const historyMessages = latestMessage.history.map((msg: any) => convertWSMessage(msg));
          setMessages(historyMessages);
          console.log('📝 Mensagens de histórico carregadas:', historyMessages);
        } else {
          console.log('📭 Nenhuma mensagem no histórico');
          setMessages([]);
        }
        setIsLoadingHistory(false);
        break;
      case 'error':
        console.error('❌ Erro WebSocket:', latestMessage.error);
        const errorMsg = latestMessage.error || 'Erro desconhecido';
        
        // Se for erro da API, sugerir solução
        if (errorMsg.includes('401') || errorMsg.includes('OpenRouter')) {
          setError('Erro na API do OpenRouter. Verificando chave de API...');
        } else {
          setError(errorMsg);
        }
        setIsLoadingHistory(false);
        break;
    }
  }, [wsMessages, currentResponse]);

  const sendMessage = useCallback(async (
    content: string, 
    attachments?: any[],
    model?: string
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
      console.log('👤 Mensagem do usuário adicionada à UI:', userMessage);

      // Enviar para o agente via WebSocket
      if (workflowId) {
        await sendToAgent(content, workflowId, model);
      } else {
        await sendToAgent(content, undefined, model);
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