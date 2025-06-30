import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolCallIndicator } from './ToolCallIndicator';
import { MarkdownContent } from './MarkdownContent';
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
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  
  // Não renderizar mensagens de tool
  if (message.role === 'tool') return null;

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(feedback === type ? null : type);
    // TODO: Enviar feedback para analytics/backend
    console.log('Feedback:', type, 'for message:', message.id);
  };

  return (
    <div 
      className={cn(
        "p-4 message-enter group",
        // Background diferenciado para mensagens do usuário
        isUser ? "message-user bg-muted/30 rounded-lg" : "message-assistant bg-transparent",
      )}
      data-role={message.role}
    >
      {/* Content */}
      <div className="space-y-2">
        {/* Conteúdo da mensagem */}
        <MarkdownContent 
          content={message.content}
          className=""
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

        {/* Footer com timestamp e botões de interação */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
            })}
          </div>
          
          {/* Botões de interação apenas para mensagens do assistant */}
          {isAssistant && !message.isStreaming && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleCopy}
                title="Copiar mensagem"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 hover:bg-muted",
                  feedback === 'like' && "text-green-600 bg-green-50"
                )}
                onClick={() => handleFeedback('like')}
                title="Gostei desta resposta"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 hover:bg-muted",
                  feedback === 'dislike' && "text-red-600 bg-red-50"
                )}
                onClick={() => handleFeedback('dislike')}
                title="Não gostei desta resposta"
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </div>
          )}
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