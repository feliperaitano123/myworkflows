import React, { createContext, useContext } from 'react';
import { useChatWithPersistence } from '@/hooks/useChatWithPersistence-v2';

interface ChatContextType {
  messages: any[];
  sendMessage: (content: string, model?: string) => void;
  getToolStatus: (toolCallId: string) => any;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ 
  workflowId: string; 
  children: React.ReactNode 
}> = ({ workflowId, children }) => {
  const chat = useChatWithPersistence(workflowId);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};