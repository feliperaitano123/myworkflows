
export type AIProcessStepType = 'thinking' | 'tool_execution' | 'tool_result' | 'final_response';

export type AIProcessStepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface AIProcessStep {
  id: string;
  type: AIProcessStepType;
  status: AIProcessStepStatus;
  title: string;
  description?: string;
  content?: string;
  toolName?: string;
  timestamp: Date;
  isExpanded?: boolean;
  duration?: number;
}

export interface AIProcessMessage {
  id: string;
  sessionId: string;
  steps: AIProcessStep[];
  finalResponse?: string;
  isComplete: boolean;
  timestamp: Date;
}
