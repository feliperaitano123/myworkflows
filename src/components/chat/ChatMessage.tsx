
import React, { useState } from 'react';
import { Bot, FileText, Play, Search, Settings, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Helper function to get tool message styling
const getToolMessageStyle = (message: Message) => {
  // Identificar tipo baseado em metadata ou role
  if (message.metadata?.is_tool_call || message.metadata?.type === 'tool_call') {
    return {
      bgColor: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      icon: Search,
      label: 'Buscando dados'
    };
  }
  
  if (message.role === 'tool' || message.metadata?.is_tool_result) {
    return {
      bgColor: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
      icon: CheckCircle,
      label: 'Dados carregados'
    };
  }
  
  if (message.metadata?.is_tool_error || message.metadata?.type === 'tool_error') {
    return {
      bgColor: 'bg-red-50 border-red-200',
      iconColor: 'text-red-600',
      icon: AlertCircle,
      label: 'Erro na ferramenta'
    };
  }
  
  return {
    bgColor: 'bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600',
    icon: Settings,
    label: 'Ferramenta'
  };
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, formatTime }) => {
  const [isToolExpanded, setIsToolExpanded] = useState(false);
  
  const isToolMessage = message.metadata?.is_tool_call || message.metadata?.is_tool_result || 
                       message.metadata?.is_tool_error || message.role === 'tool';
  const toolStyle = isToolMessage ? getToolMessageStyle(message) : null;
  
  // Verificar se é uma mensagem de tool com conteúdo JSON longo
  const isLongToolContent = message.role === 'tool' && message.content.length > 100;
  const shouldShowExpandable = isLongToolContent;
  
  // Conteúdo resumido para mensagens de tool longas
  const getDisplayContent = () => {
    if (message.role === 'tool' && shouldShowExpandable) {
      if (isToolExpanded) {
        return message.content;
      } else {
        // Mostrar resumo e botão de expansão
        try {
          const jsonData = JSON.parse(message.content);
          const summary = `Workflow obtido: ${jsonData.name || 'Sem nome'} (${jsonData.nodes?.length || 0} nodes)`;
          return summary;
        } catch {
          // Se não for JSON, mostrar primeiras 100 chars
          return message.content.substring(0, 100) + '...';
        }
      }
    }
    return message.content;
  };
  
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={cn(
        'max-w-[80%] rounded-lg p-4',
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground ml-12' 
          : isToolMessage && toolStyle
            ? `${toolStyle.bgColor} border mr-12`
            : 'bg-muted mr-12'
      )}>
        {/* Header para mensagens do assistant */}
        {message.role === 'assistant' && !isToolMessage && (
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4" />
            <span className="text-xs font-medium">AI Assistant</span>
          </div>
        )}
        
        {/* Header para mensagens de tool */}
        {isToolMessage && toolStyle && (
          <div className="flex items-center gap-2 mb-2">
            <toolStyle.icon className={`h-4 w-4 ${toolStyle.iconColor}`} />
            <span className={`text-xs font-medium ${toolStyle.iconColor}`}>
              {toolStyle.label} {message.metadata?.tool_name && `(${message.metadata.tool_name})`}
            </span>
          </div>
        )}
        
        {/* Header para mensagens de tool do tipo 'assistant' (tool_call messages) */}
        {message.role === 'assistant' && isToolMessage && toolStyle && (
          <div className="flex items-center gap-2 mb-2">
            <toolStyle.icon className={`h-4 w-4 ${toolStyle.iconColor}`} />
            <span className={`text-xs font-medium ${toolStyle.iconColor}`}>
              AI Assistant - {toolStyle.label}
            </span>
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
        
        {/* Conteúdo da mensagem */}
        <div className={cn(
          "whitespace-pre-wrap text-sm",
          isToolMessage && toolStyle ? toolStyle.iconColor.replace('text-', 'text-') : ''
        )}>
          {getDisplayContent()}
        </div>
        
        {/* Botão de expansão para mensagens de tool longas */}
        {shouldShowExpandable && (
          <button
            onClick={() => setIsToolExpanded(!isToolExpanded)}
            className={cn(
              "flex items-center gap-1 mt-2 text-xs hover:underline",
              toolStyle?.iconColor || "text-gray-600"
            )}
          >
            {isToolExpanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                Ver dados completos
              </>
            )}
          </button>
        )}
        
        <div className="text-xs opacity-70 mt-2">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
