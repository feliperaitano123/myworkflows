import React from 'react';
import { cn } from '@/lib/utils';
import { ToolCallIndicator } from './ToolCallIndicator';
import { MarkdownContent } from './MarkdownContent';
import { useChat } from '@/contexts/ChatContext';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    metadata?: {
      toolCalls?: Array<{
        id: string;
        name: string;
      }>;
    };
    isStreaming?: boolean;
    created_at: string;
  };
}

export const ChatMessage = React.memo<ChatMessageProps>(({ message }) => {
  const { getToolStatus } = useChat();
  
  // Não renderizar mensagens de tool
  if (message.role === 'tool') return null;

  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-lg message-enter",
      isUser ? "bg-muted/30" : "bg-background"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Conteúdo da mensagem */}
        <MarkdownContent 
          content={message.content}
          className="prose prose-sm max-w-none dark:prose-invert"
        />

        {/* Tool calls se houver */}
        {message.metadata?.toolCalls && (
          <div className="flex flex-wrap gap-2">
            {message.metadata.toolCalls.map((toolCall) => (
              <ToolCallIndicator 
                key={toolCall.id} 
                toolCall={toolCall}
                status={getToolStatus(toolCall.id)}
              />
            ))}
          </div>
        )}

        {/* Indicador de streaming */}
        {message.isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block w-1 h-4 bg-current animate-pulse" />
            <span className="text-sm">Digitando...</span>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para evitar re-renders
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.message.isStreaming === nextProps.message.isStreaming;
});

ChatMessage.displayName = 'ChatMessage';