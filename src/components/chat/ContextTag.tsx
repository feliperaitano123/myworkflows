import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Play, Key, FileText } from 'lucide-react';
import { ContextItem } from './ContextPopover';

interface ContextTagProps {
  context: ContextItem;
  onRemove: (contextId: string) => void;
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
  switch (type) {
    case 'execution':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case 'credential':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'document':
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
};

export const ContextTag: React.FC<ContextTagProps> = ({ context, onRemove }) => {
  const Icon = getContextIcon(context.type);
  const colorClass = getContextColor(context.type);

  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs ${colorClass}`}
    >
      <Icon className="w-3 h-3" />
      <span className="truncate max-w-[120px]" title={context.name}>
        {context.name}
      </span>
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
    </Badge>
  );
};