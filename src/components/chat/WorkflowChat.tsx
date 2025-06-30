import React, { useRef, useEffect, useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { ChatMessage } from './ChatMessage-v2';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { ChatHeader } from './ChatHeader';
import { TypingIndicator } from './TypingIndicator';
import { ClearChatModal } from './ClearChatModal';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';

interface WorkflowChatProps {
  workflowId: string;
  onClearChatRef?: React.MutableRefObject<(() => void) | undefined>;
}

const ChatContent: React.FC<{ workflowId: string; onClearChatRef?: React.MutableRefObject<(() => void) | undefined> }> = ({ workflowId, onClearChatRef }) => {
  const { messages, sendMessage, clearChat, isConnected, isLoadingHistory } = useChat();
  const { workflows } = useWorkflowsContext();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const currentWorkflow = workflows.find(w => w.id === workflowId);
  
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

  // Expor função de clear chat para o componente pai
  React.useEffect(() => {
    if (onClearChatRef) {
      onClearChatRef.current = handleClearChat;
    }
  }, [onClearChatRef]);

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0">
        <ChatHeader
          workflowName={currentWorkflow?.name || 'Workflow'}
          workflowId={currentWorkflow?.workflowId}
          onClearChat={handleClearChat}
          isConnected={isConnected}
          isConnecting={false}
          messageCount={messages.length}
        />
      </div>

      {/* Área de mensagens - Flexible height */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4 chat-messages">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Carregando histórico...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen />
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
          disabled={!isConnected}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          workflowId={workflowId}
        />
      </div>

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
  onClearChatRef
}) => {
  return (
    <ChatProvider workflowId={workflowId}>
      <ChatContent workflowId={workflowId} onClearChatRef={onClearChatRef} />
    </ChatProvider>
  );
};