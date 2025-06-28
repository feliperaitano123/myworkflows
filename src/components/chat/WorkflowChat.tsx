import React, { useRef, useEffect } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { ChatMessage } from './ChatMessage-v2';
import { ChatInput } from './ChatInput-v2';
import { WelcomeScreen } from './WelcomeScreen';

interface WorkflowChatProps {
  workflowId: string;
}

const ChatContent: React.FC = () => {
  const { messages, sendMessage, isConnected } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll quando necessário
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming || lastMessage?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
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
        onSend={sendMessage}
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
      <ChatContent />
    </ChatProvider>
  );
};