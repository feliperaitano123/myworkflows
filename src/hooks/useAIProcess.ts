
import { useState, useCallback, useRef } from 'react';
import { AIProcessMessage, AIProcessStep } from '@/types/ai-process';

export const useAIProcess = () => {
  const [activeProcesses, setActiveProcesses] = useState<Map<string, AIProcessMessage>>(new Map());
  const processCounterRef = useRef(0);

  const createProcess = useCallback((sessionId: string): string => {
    const processId = `process_${Date.now()}_${++processCounterRef.current}`;
    
    const newProcess: AIProcessMessage = {
      id: processId,
      sessionId,
      steps: [],
      isComplete: false,
      timestamp: new Date()
    };

    setActiveProcesses(prev => new Map(prev).set(processId, newProcess));
    return processId;
  }, []);

  const addStep = useCallback((processId: string, step: Omit<AIProcessStep, 'id' | 'timestamp'>) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      const process = newMap.get(processId);
      
      if (process) {
        const newStep: AIProcessStep = {
          ...step,
          id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };

        const updatedProcess = {
          ...process,
          steps: [...process.steps, newStep]
        };
        
        newMap.set(processId, updatedProcess);
      }
      
      return newMap;
    });
  }, []);

  const updateStep = useCallback((processId: string, stepId: string, updates: Partial<AIProcessStep>) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      const process = newMap.get(processId);
      
      if (process) {
        const updatedSteps = process.steps.map(step => 
          step.id === stepId 
            ? { ...step, ...updates }
            : step
        );

        const updatedProcess = {
          ...process,
          steps: updatedSteps
        };
        
        newMap.set(processId, updatedProcess);
      }
      
      return newMap;
    });
  }, []);

  const updateFinalResponse = useCallback((processId: string, response: string) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      const process = newMap.get(processId);
      
      if (process) {
        const updatedProcess = {
          ...process,
          finalResponse: response
        };
        
        newMap.set(processId, updatedProcess);
      }
      
      return newMap;
    });
  }, []);

  const completeProcess = useCallback((processId: string, finalResponse?: string) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      const process = newMap.get(processId);
      
      if (process) {
        const updatedProcess = {
          ...process,
          isComplete: true,
          finalResponse: finalResponse || process.finalResponse
        };
        
        // Adicionar step de resposta final se não existir
        if (finalResponse && !process.steps.some(s => s.type === 'final_response')) {
          updatedProcess.steps.push({
            id: `final_${Date.now()}`,
            type: 'final_response',
            status: 'completed',
            title: 'Resposta final',
            content: finalResponse,
            timestamp: new Date()
          });
        }
        
        newMap.set(processId, updatedProcess);
      }
      
      return newMap;
    });
  }, []);

  const getProcess = useCallback((processId: string): AIProcessMessage | undefined => {
    return activeProcesses.get(processId);
  }, [activeProcesses]);

  const clearProcesses = useCallback(() => {
    setActiveProcesses(new Map());
  }, []);

  return {
    activeProcesses,
    createProcess,
    addStep,
    updateStep,
    updateFinalResponse,
    completeProcess,
    getProcess,
    clearProcesses
  };
};
