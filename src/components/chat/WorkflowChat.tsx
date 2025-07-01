import React, { useRef, useEffect, useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { ChatMessage } from './ChatMessage-v2';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { TypingIndicator } from './TypingIndicator';
import { ClearChatModal } from './ClearChatModal';
import { ChatValidationModal } from './ChatValidationModal';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { useChatValidation } from '@/hooks/useChatValidation';

interface WorkflowChatProps {
  workflowId: string;
  onClearChatRef?: React.MutableRefObject<(() => void) | undefined>;
  onStatusChange?: (status: { color: 'green' | 'red' | 'yellow'; message: string }) => void;
}

const ChatContent: React.FC<{ workflowId: string; onClearChatRef?: React.MutableRefObject<(() => void) | undefined>; onStatusChange?: (status: { color: 'green' | 'red' | 'yellow'; message: string }) => void }> = ({ workflowId, onClearChatRef, onStatusChange }) => {
  const { messages, sendMessage, clearChat, isConnected, isLoadingHistory } = useChat();
  const { workflows, syncWorkflowNames } = useWorkflowsContext();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const currentWorkflow = workflows.find(w => w.id === workflowId);
  
  // Hook de validação do chat
  const chatValidation = useChatValidation(workflowId);
  
  // Check if AI is thinking (user sent message but no AI response yet)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const hasStreamingMessage = messages.some(m => m.isStreaming);
    setIsAiThinking(lastMessage?.role === 'user' && !hasStreamingMessage);
  }, [messages]);

  // Auto-scroll quando necessário
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming || lastMessage?.role === 'user' || isAiThinking) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking]);

  // Auto-scroll quando histórico termina de carregar
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isLoadingHistory, messages.length]);

  // Comunicar mudanças de status para a página
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        color: chatValidation.statusColor,
        message: chatValidation.statusMessage
      });
    }
  }, [chatValidation.statusColor, chatValidation.statusMessage, onStatusChange]);

  const handleSendMessage = (content: string, contexts?: any[]) => {
    // Prepare structured data for backend
    const messageData = {
      content,
      contexts: contexts || [],
      metadata: {
        hasContext: contexts && contexts.length > 0,
        contextTypes: contexts ? contexts.map(c => c.type) : [],
        contextCount: contexts ? contexts.length : 0
      }
    };
    
    console.log('Message with context data:', messageData);
    
    // Enviar mensagem com contextos formatados
    sendMessage(content, selectedModel, contexts);
  };

  const handleClearChat = () => {
    setShowClearModal(true);
  };

  const handleConfirmClear = () => {
    clearChat();
  };

  // Handler para tentar novamente a validação
  const handleRetryValidation = async () => {
    try {
      console.log('🔄 Retrying validation...');
      await syncWorkflowNames();
      console.log('✅ Validation retry completed');
    } catch (error) {
      console.error('❌ Error retrying validation:', error);
    }
  };

  // Handler para fechar o modal
  const handleCloseValidationModal = () => {
    // O modal será fechado automaticamente quando showModal for false
    // Não precisamos fazer nada aqui, pois o estado é controlado pelo hook
  };

  // Expor função de clear chat para o componente pai
  React.useEffect(() => {
    if (onClearChatRef) {
      onClearChatRef.current = handleClearChat;
    }
  }, [onClearChatRef]);

  return (
    <div className="h-full flex flex-col">
      {/* Área de mensagens - Flexible height */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4 chat-messages">
          {isLoadingHistory || chatValidation.isValidating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                {chatValidation.isValidating ? 'Verificando workflow...' : 'Carregando histórico...'}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={(suggestion) => handleSendMessage(suggestion)} />
          ) : (
            <>
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isAiThinking && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed position at bottom */}
      <div className="flex-shrink-0">
        <ChatInput
          onSend={handleSendMessage}
          disabled={!chatValidation.isValid}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          workflowId={workflowId}
        />
      </div>

      {/* Chat Validation Modal */}
      <ChatValidationModal
        isOpen={chatValidation.showModal}
        onClose={handleCloseValidationModal}
        onRetry={handleRetryValidation}
        isValidating={chatValidation.isValidating}
        workflowName={currentWorkflow?.name || 'Workflow'}
        validationSteps={chatValidation.validationSteps}
        overallStatus={chatValidation.overallStatus}
      />

      {/* Clear Chat Modal */}
      <ClearChatModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleConfirmClear}
        messageCount={messages.length}
      />
    </div>
  );
};

export const WorkflowChat: React.FC<WorkflowChatProps> = ({ 
  workflowId,
  onClearChatRef,
  onStatusChange
}) => {
  return (
    <ChatProvider workflowId={workflowId}>
      <ChatContent workflowId={workflowId} onClearChatRef={onClearChatRef} onStatusChange={onStatusChange} />
    </ChatProvider>
  );
};