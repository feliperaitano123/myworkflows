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
    if (!status || status.status === 'executing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (status.status === 'success') {
      // Ícones específicos por tool
      switch (toolCall.name) {
        case 'getWorkflow':
          return <Search className="w-4 h-4" />;
        case 'createNode':
          return <Plus className="w-4 h-4" />;
        case 'executeWorkflow':
          return <Play className="w-4 h-4" />;
        default:
          return <Check className="w-4 h-4" />;
      }
    }
    
    return <X className="w-4 h-4 text-destructive" />;
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-sm">
      {getIcon()}
      <span className="text-muted-foreground">{toolCall.name}</span>
    </span>
  );
};