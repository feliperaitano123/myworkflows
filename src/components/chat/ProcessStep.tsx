
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle, AlertCircle, Brain, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIProcessStep } from '@/types/ai-process';

interface ProcessStepProps {
  step: AIProcessStep;
  onToggleExpanded?: (stepId: string) => void;
}

const getStepIcon = (type: string, status: string) => {
  if (status === 'in_progress') {
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  }
  
  if (status === 'error') {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  
  if (status === 'completed') {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }

  switch (type) {
    case 'thinking':
      return <Brain className="h-4 w-4 text-blue-500" />;
    case 'tool_execution':
      return <Wrench className="h-4 w-4 text-orange-500" />;
    case 'tool_result':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <div className="h-4 w-4 rounded-full bg-gray-300" />;
  }
};

const getStepColors = (type: string, status: string) => {
  if (status === 'error') {
    return {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700'
    };
  }

  switch (type) {
    case 'thinking':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700'
      };
    case 'tool_execution':
      return {
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-700'
      };
    case 'tool_result':
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-700'
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700'
      };
  }
};

export const ProcessStep: React.FC<ProcessStepProps> = ({ step, onToggleExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(step.isExpanded || false);
  const colors = getStepColors(step.type, step.status);
  const hasContent = step.content && step.content.length > 0;
  const isCollapsible = hasContent && step.type !== 'final_response';

  const handleToggle = () => {
    if (!isCollapsible) return;
    
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpanded?.(step.id);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={cn(
      'border rounded-lg transition-all duration-200',
      colors.bg
    )}>
      <div 
        className={cn(
          'flex items-center gap-3 p-3 cursor-pointer',
          isCollapsible && 'hover:bg-opacity-80'
        )}
        onClick={handleToggle}
      >
        {isCollapsible && (
          isExpanded ? 
            <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" /> :
            <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
        )}
        
        <div className="flex-shrink-0">
          {getStepIcon(step.type, step.status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={cn('font-medium text-sm', colors.text)}>
            {step.title}
            {step.toolName && ` (${step.toolName})`}
          </div>
          {step.description && (
            <div className="text-xs text-gray-600 mt-1">
              {step.description}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {step.duration && (
            <span>{formatDuration(step.duration)}</span>
          )}
          {step.status === 'in_progress' && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && hasContent && (
        <div className="px-3 pb-3">
          <div className="bg-white/50 rounded p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{step.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
