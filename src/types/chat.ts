export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    response_time_ms?: number;
    tool_calls?: Array<{
      id: string;
      name: string;
      arguments?: any;
    }>;
    tool_call_id?: string;
    status?: 'success' | 'error';
    attachments?: any[];
  };
  isStreaming?: boolean;
  created_at: string;
}

export interface ToolStatus {
  toolCallId: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  toolMessageId?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  streamingMessageId: string | null;
  streamingContent: string;
  toolStatuses: Map<string, ToolStatus>;
}