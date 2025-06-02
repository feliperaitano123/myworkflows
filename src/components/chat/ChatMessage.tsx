
import React from 'react';
import { Bot, FileText, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ChatMessageProps {
  message: Message;
  formatTime: (date: Date) => string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, formatTime }) => {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={cn(
        'max-w-[80%] rounded-lg p-4',
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground ml-12' 
          : 'bg-muted mr-12'
      )}>
        {message.role === 'assistant' && (
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4" />
            <span className="text-xs font-medium">AI Assistant</span>
          </div>
        )}
        
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
};
