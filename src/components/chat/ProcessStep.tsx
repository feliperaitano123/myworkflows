
import React, { useState } from 'react';
import { 
  Brain, 
  Wrench, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  MessageSquare,
  Loader
} from 'lucide-react';
import { AIProcessStep } from '@/types/ai-process';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';

interface ProcessStepProps {
  step: AIProcessStep;
}

const getStepIcon = (type: string, status: string) => {
  const iconClass = "h-4 w-4";
  
  switch (type) {
    case 'thinking':
      return status === 'in_progress' ? 
        <Loader className={cn(iconClass, "animate-spin")} /> : 
        <Brain className={iconClass} />;
    case 'tool_execution':
      return status === 'in_progress' ? 
        <Loader className={cn(iconClass, "animate-spin")} /> : 
        <Wrench className={iconClass} />;
    case 'tool_result':
      return status === 'error' ? 
        <AlertCircle className={iconClass} /> : 
        <CheckCircle className={iconClass} />;
    case 'final_response':
      return <MessageSquare className={iconClass} />;
    default:
      return <CheckCircle className={iconClass} />;
  }
};

const getStepColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 dark:text-green-400';
    case 'in_progress':
      return 'text-blue-600 dark:text-blue-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getStepBgColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    case 'in_progress':
      return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
    case 'error':
      return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
  }
};

export const ProcessStep: React.FC<ProcessStepProps> = ({ step }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExpandableContent = step.content || step.toolName;
  
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all duration-200",
      getStepBgColor(step.status)
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", getStepColor(step.status))}>
          {getStepIcon(step.type, step.status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">
                {step.title}
              </h4>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
            
            {hasExpandableContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          
          {step.toolName && (
            <div className="text-xs text-muted-foreground mt-1">
              Tool: {step.toolName}
            </div>
          )}
          
          {step.duration && (
            <div className="text-xs text-muted-foreground mt-1">
              Duration: {step.duration}ms
            </div>
          )}
        </div>
      </div>
      
      {/* Expandable Content */}
      {isExpanded && hasExpandableContent && (
        <div className="mt-3 pt-3 border-t border-current/10">
          {step.content && (
            <div className="bg-white/50 dark:bg-black/20 rounded p-3">
              <MarkdownRenderer content={step.content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
