
import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { ProcessStep } from './ProcessStep';
import { AIProcessMessage } from '@/types/ai-process';

interface AIProcessStepsProps {
  processMessage: AIProcessMessage;
  formatTime: (date: Date) => string;
}

export const AIProcessSteps: React.FC<AIProcessStepsProps> = ({ 
  processMessage, 
  formatTime 
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const handleToggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const finalResponseStep = processMessage.steps.find(step => step.type === 'final_response');
  const processSteps = processMessage.steps.filter(step => step.type !== 'final_response');

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] mr-12 space-y-3">
        {/* Process Steps - Collapsible */}
        {processSteps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <Bot className="h-4 w-4" />
              <span>Processo da IA</span>
            </div>
            
            {processSteps.map((step) => (
              <ProcessStep
                key={step.id}
                step={{
                  ...step,
                  isExpanded: expandedSteps.has(step.id)
                }}
                onToggleExpanded={handleToggleStep}
              />
            ))}
          </div>
        )}

        {/* Final Response - Always Expanded */}
        {finalResponseStep && (
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-medium">AI Assistant</span>
            </div>
            
            <div className="whitespace-pre-wrap text-sm">
              {finalResponseStep.content || processMessage.finalResponse}
            </div>
            
            <div className="text-xs opacity-70 mt-2">
              {formatTime(processMessage.timestamp)}
            </div>
          </div>
        )}
        
        {/* Streaming Response (when not complete) */}
        {!processMessage.isComplete && processMessage.finalResponse && (
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-medium">AI Assistant</span>
            </div>
            
            <div className="whitespace-pre-wrap text-sm">
              {processMessage.finalResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
