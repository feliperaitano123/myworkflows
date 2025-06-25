export interface ChatMessage {
  type: 'chat';
  content: string;
  workflowId?: string;
}

export interface WSMessage {
  type: 'token' | 'complete' | 'error' | 'connected';
  content?: string;
  sessionId?: string;
  error?: string;
}

export interface WorkflowContext {
  id: string;
  name: string;
  workflow_id: string; // ID do workflow no n8n
  description?: string;
  user_id: string;
  connection_id: string;
  active: boolean;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  workflowId?: string;
  chatSessionId?: string; // ID da sessão no banco
  connectedAt: Date;
}