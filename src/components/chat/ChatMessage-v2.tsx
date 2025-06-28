import React from 'react';
import { cn } from '@/lib/utils';
import { ToolCallIndicator } from './ToolCallIndicator';
import { useChat } from '@/contexts/ChatContext';

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

  return (
    <div className={cn(
      "group relative",
      message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      )}>
        {/* Conteúdo da mensagem */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Tool calls se houver */}
        {message.metadata?.toolCalls && (
          <div className="mt-2 flex flex-wrap gap-1">
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
          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
        )}
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