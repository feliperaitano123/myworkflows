import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from '@/components/ui/copy-button';

interface AssistantMessageProps {
  content: string;
  timestamp: Date;
  formatTime: (date: Date) => string;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ 
  content, 
  timestamp, 
  formatTime 
}) => {
  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-primary-foreground" />
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">AI Assistant</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Clock className="h-3 w-3" />
            <span>{formatTime(timestamp)}</span>
          </div>
          <CopyButton content={content} />
        </div>
        
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
};
