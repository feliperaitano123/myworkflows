
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, Clock } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from '@/components/ui/copy-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ToolMessageProps {
  content: string;
  timestamp: Date;
  formatTime: (date: Date) => string;
  toolName?: string;
  metadata?: any;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ 
  content, 
  timestamp, 
  formatTime,
  toolName,
  metadata 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayToolName = toolName || metadata?.tool_name || 'Tool Execution';
  const isError = metadata?.error || content.toLowerCase().includes('error');
  
  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isError ? "bg-destructive" : "bg-orange-500"
      )}>
        <Wrench className="h-4 w-4 text-white" />
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Header - sempre visível */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left hover:bg-muted/50 p-2 rounded-lg transition-colors w-full"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{displayToolName}</span>
              {isError && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                  Error
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(timestamp)}</span>
            </div>
          </div>
        </button>
        
        {/* Conteúdo expandido com card de altura fixa */}
        {isExpanded && (
          <div className="ml-6 space-y-2">
            <div className={cn(
              "rounded-lg border-l-4 border max-h-80 overflow-hidden",
              isError 
                ? "border-l-destructive border-destructive/20" 
                : "border-l-orange-500 border-border"
            )}>
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  Tool Output
                </span>
                <CopyButton content={content} />
              </div>
              <ScrollArea className="h-64 p-4">
                <MarkdownRenderer content={content} />
              </ScrollArea>
            </div>
            
            {/* Metadata adicional se disponível */}
            {metadata && Object.keys(metadata).length > 0 && (
              <details className="ml-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Show metadata
                </summary>
                <ScrollArea className="max-h-32 mt-1">
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </ScrollArea>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
