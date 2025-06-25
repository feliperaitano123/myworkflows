import { useState, useCallback, useEffect } from 'react';
import { useAIAgent } from './useAIAgent';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<AttachmentItem>;
}

const WS_URL = 'ws://localhost:3001';

export const useChatMessagesWithAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
  const { 
    isConnected, 
    isConnecting, 
    sendMessage: sendToAgent, 
    currentResponse, 
    error: agentError,
    clearMessages: clearAgentMessages 
  } = useAIAgent({ url: WS_URL });

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (
    content: string, 
    workflowId?: string,
    attachments?: AttachmentItem[]
  ) => {
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: attachments?.length ? [...attachments] : undefined
    };

    addMessage(userMessage);
    setIsWaitingForResponse(true);

    // Enviar para o agente
    sendToAgent(content, workflowId);
  }, [addMessage, sendToAgent]);

  // Quando a resposta do agente estiver completa, adicionar como mensagem
  const isTyping = isWaitingForResponse && currentResponse.length === 0;
  const isStreaming = currentResponse.length > 0;

  // Adicionar resposta completa do agente quando terminar o streaming
  const handleCompleteResponse = useCallback(() => {
    if (currentResponse && isWaitingForResponse) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: currentResponse,
        timestamp: new Date()
      };
      
      addMessage(aiMessage);
      setIsWaitingForResponse(false);
    }
  }, [currentResponse, isWaitingForResponse, addMessage]);

  // Monitorar quando o streaming termina
  useEffect(() => {
    if (!isWaitingForResponse) return;

    // Se não há resposta atual e não está mais esperando, a resposta foi completa
    if (currentResponse.length === 0 && !isTyping) {
      // Aguardar um pouco para garantir que a resposta foi processada
      const timer = setTimeout(handleCompleteResponse, 100);
      return () => clearTimeout(timer);
    }
  }, [currentResponse, isWaitingForResponse, isTyping, handleCompleteResponse]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsWaitingForResponse(false);
    clearAgentMessages();
  }, [clearAgentMessages]);

  const connectionStatus = {
    isConnected,
    isConnecting,
    error: agentError
  };

  return {
    messages,
    isLoading: isWaitingForResponse,
    isTyping,
    isStreaming,
    currentResponse,
    connectionStatus,
    addMessage,
    sendMessage,
    clearMessages
  };
};

// Manter compatibilidade com o hook antigo
export const useChatMessages = useChatMessagesWithAI;