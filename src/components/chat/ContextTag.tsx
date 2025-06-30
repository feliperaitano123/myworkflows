import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Play, Key, FileText } from 'lucide-react';
import { ContextItem } from './ContextPopover';

interface ContextTagProps {
  context: ContextItem;
  onRemove?: (contextId: string) => void;
}

const getContextIcon = (type: ContextItem['type']) => {
  switch (type) {
    case 'execution':
      return Play;
    case 'credential':
      return Key;
    case 'document':
      return FileText;
    default:
      return FileText;
  }
};

const getContextColor = (type: ContextItem['type']) => {
  // Usar padrão muted para todos os tipos
  return 'bg-muted text-muted-foreground border-muted hover:bg-muted/80';
};

export const ContextTag: React.FC<ContextTagProps> = ({ context, onRemove }) => {
  const Icon = getContextIcon(context.type);
  const colorClass = getContextColor(context.type);

  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md ${colorClass}`}
    >
      <Icon className="w-3 h-3" />
      <span className="truncate max-w-[120px]" title={context.name}>
        {context.name}
      </span>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 w-3 h-3 text-current hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(context.id);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </Badge>
  );
};