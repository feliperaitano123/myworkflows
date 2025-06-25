
import React from 'react';
import { FileText, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIProcessSteps } from './AIProcessSteps';

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
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg p-4 bg-primary text-primary-foreground ml-12">
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 text-xs opacity-80">
                  {attachment.type === 'document' ? (
                    <FileText className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  <span>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="whitespace-pre-wrap text-sm">
            {message.content}
          </div>
          
          <div className="text-xs opacity-70 mt-2">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Mensagem simples do assistente (fallback)
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-muted mr-12">
        <div className="whitespace-pre-wrap text-sm">
          {message.content}
        </div>
        
        <div className="text-xs opacity-70 mt-2">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
