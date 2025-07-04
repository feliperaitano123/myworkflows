
import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { ProcessStep } from './ProcessStep';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AIProcessMessage } from '@/types/ai-process';

interface AIProcessStepsProps {
  processMessage: AIProcessMessage;
  formatTime: (date: Date) => string;
}

export const AIProcessSteps: React.FC<AIProcessStepsProps> = ({
  processMessage,
  formatTime
}) => {
  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-primary-foreground" />
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">AI Assistant</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Clock className="h-3 w-3" />
            <span>{formatTime(processMessage.timestamp)}</span>
          </div>
        </div>
        
        {/* Process Steps */}
        <div className="space-y-2">
          {processMessage.steps.map((step) => (
            <ProcessStep key={step.id} step={step} />
          ))}
        </div>
        
        {/* Final Response */}
        {processMessage.finalResponse && processMessage.isComplete && (
          <div className="bg-muted/50 rounded-lg p-4 border mt-4">
            <MarkdownRenderer content={processMessage.finalResponse} />
          </div>
        )}
      </div>
    </div>
  );
};
