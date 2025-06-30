import React from 'react';
import { Loader2, Check, X, Search, Plus, Play } from 'lucide-react';

interface ToolCallIndicatorProps {
  toolCall: {
    id: string;
    name: string;
  };
  status?: {
    status: 'pending' | 'executing' | 'success' | 'error';
  };
}

export const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({ 
  toolCall, 
  status 
}) => {
  const getIcon = () => {
    // Se não há status definido, assumir que a tool já foi executada com sucesso (histórico)
    if (!status) {
      // Para tool calls antigas (do histórico), mostrar ícone de sucesso
      switch (toolCall.name) {
        case 'getWorkflow':
          return <Search className="w-4 h-4 text-green-600" />;
        case 'createNode':
          return <Plus className="w-4 h-4 text-green-600" />;
        case 'executeWorkflow':
          return <Play className="w-4 h-4 text-green-600" />;
        default:
          return <Check className="w-4 h-4 text-green-600" />;
      }
    }
    
    // Se está executando, mostrar spinner
    if (status.status === 'executing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    // Se foi executada com sucesso
    if (status.status === 'success') {
      switch (toolCall.name) {
        case 'getWorkflow':
          return <Search className="w-4 h-4 text-green-600" />;
        case 'createNode':
          return <Plus className="w-4 h-4 text-green-600" />;
        case 'executeWorkflow':
          return <Play className="w-4 h-4 text-green-600" />;
        default:
          return <Check className="w-4 h-4 text-green-600" />;
      }
    }
    
    // Se houve erro
    return <X className="w-4 h-4 text-destructive" />;
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-sm">
      {getIcon()}
      <span className="text-muted-foreground">{toolCall.name}</span>
    </span>
  );
};