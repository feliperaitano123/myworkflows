
import React from 'react';
import { AIProcessSteps } from './AIProcessSteps';
import { AssistantMessage } from './AssistantMessage';
import { ToolMessage } from './ToolMessage';
import { UserMessage } from './UserMessage';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  attachments?: Array<AttachmentItem>;
  processData?: any;
  metadata?: {
    message_type?: string;
    tool_name?: string;
    is_tool_message?: boolean;
    type?: string;
    error?: string;
  };
}

interface ChatMessageProps {
  message: Message;
  formatTime: (date: Date) => string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, formatTime }) => {
  // Se é uma mensagem do assistente com dados de processo, usar AIProcessSteps
  if (message.role === 'assistant' && message.processData) {
    return (
      <AIProcessSteps 
        processMessage={message.processData}
        formatTime={formatTime}
      />
    );
  }

  // Mensagem do usuário
  if (message.role === 'user') {
    return (
      <UserMessage
        content={message.content}
        timestamp={message.timestamp}
        formatTime={formatTime}
        attachments={message.attachments}
      />
    );
  }

  // Mensagem de ferramenta (tool)
  if (message.role === 'tool') {
    return (
      <ToolMessage
        content={message.content}
        timestamp={message.timestamp}
        formatTime={formatTime}
        toolName={message.metadata?.tool_name}
        metadata={message.metadata}
      />
    );
  }

  // Mensagem simples do assistente
  return (
    <AssistantMessage
      content={message.content}
      timestamp={message.timestamp}
      formatTime={formatTime}
    />
  );
};
