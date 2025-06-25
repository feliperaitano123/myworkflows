export interface ChatSession {
  id: string;
  user_id: string;
  workflow_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    attachments?: Array<{
      id: string;
      name: string;
      type: 'document' | 'execution';
    }>;
    tool_calls?: Array<{
      tool_name: string;
      parameters: any;
      result?: any;
      success?: boolean;
    }>;
    tokens_used?: number;
    model?: string;
    response_time_ms?: number;
  };
  created_at: string;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  workflowId?: string;
  chatSessionId?: string; // ID da sessão no banco
  connectedAt: Date;
}

export interface ChatMessageRequest {
  type: 'chat';
  content: string;
  workflowId?: string;
  model?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'execution';
  }>;
}

export interface ChatHistoryRequest {
  type: 'get_history';
  workflowId: string;
  limit?: number;
}

export interface ClearChatRequest {
  type: 'clear_chat';
  workflowId: string;
}

export interface WSChatMessage {
  type: 'token' | 'complete' | 'error' | 'connected' | 'history' | 'message_saved';
  content?: string;
  sessionId?: string;
  error?: string;
  history?: ChatMessage[];
  messageId?: string;
}