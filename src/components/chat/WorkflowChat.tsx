import React, { useRef, useEffect, useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { ChatMessage } from './ChatMessage-v2';
import { ChatInput } from './ChatInput-v2';
import { WelcomeScreen } from './WelcomeScreen';
import { ChatHeader } from './ChatHeader';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';

interface WorkflowChatProps {
  workflowId: string;
}

const ChatContent: React.FC<{ workflowId: string }> = ({ workflowId }) => {
  const { messages, sendMessage, clearChat, isConnected, isLoadingHistory } = useChat();
  const { workflows } = useWorkflowsContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');

  const currentWorkflow = workflows.find(w => w.id === workflowId);

  // Auto-scroll quando necessário
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming || lastMessage?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, selectedModel);
  };

  const handleClearChat = () => {
    clearChat();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        workflowName={currentWorkflow?.name || 'Workflow'}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onClearChat={handleClearChat}
        isConnected={isConnected}
        isConnecting={false}
        messageCount={messages.length}
      />

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 chat-messages">
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
          messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!isConnected}
      />
    </div>
  );
};

export const WorkflowChat: React.FC<WorkflowChatProps> = ({ 
  workflowId 
}) => {
  return (
    <ChatProvider workflowId={workflowId}>
      <ChatContent workflowId={workflowId} />
    </ChatProvider>
  );
};