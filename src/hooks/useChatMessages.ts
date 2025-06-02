
import { useState } from 'react';

interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<AttachmentItem>;
}

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const simulateAIResponse = (workflowName: string, description?: string) => {
    setIsLoading(true);
    setIsTyping(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're working with the "${workflowName}" workflow. Here's how I can help you with that automation: \n\nThis workflow specializes in ${description}. What specific aspect would you like to know more about or modify?`,
        timestamp: new Date()
      };
      
      addMessage(aiMessage);
      setIsTyping(false);
      setIsLoading(false);
    }, 2000);
  };

  return {
    messages,
    isLoading,
    isTyping,
    addMessage,
    simulateAIResponse
  };
};
