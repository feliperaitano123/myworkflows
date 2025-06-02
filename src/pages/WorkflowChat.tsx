
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAttachments } from '@/hooks/useAttachments';
import { mockDocuments, mockExecutions } from '@/data/mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'execution';
  }>;
}

const WorkflowChat: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows, selectedWorkflow, setSelectedWorkflow } = useWorkflowsContext();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, isTyping, addMessage, simulateAIResponse } = useChatMessages();
  const { 
    selectedAttachments, 
    isAttachmentSheetOpen, 
    setIsAttachmentSheetOpen,
    addAttachment,
    removeAttachment,
    clearAttachments
  } = useAttachments();

  // Find current workflow
  const currentWorkflow = workflows.find(w => w.id === workflowId);

  useEffect(() => {
    if (currentWorkflow && currentWorkflow.id !== selectedWorkflow?.id) {
      setSelectedWorkflow(currentWorkflow);
    }
  }, [currentWorkflow, selectedWorkflow, setSelectedWorkflow]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleAttachmentSelect = (item: { id: string; name: string; type: 'document' | 'execution' }) => {
    addAttachment(item, inputMessage, setInputMessage);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    removeAttachment(attachmentId, inputMessage, setInputMessage);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      attachments: selectedAttachments.length > 0 ? [...selectedAttachments] : undefined
    };

    addMessage(userMessage);
    setInputMessage('');
    clearAttachments();
    
    if (currentWorkflow) {
      simulateAIResponse(currentWorkflow.name, currentWorkflow.description);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Workflow Not Found</h3>
            <p className="text-muted-foreground">The requested workflow could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        title={currentWorkflow.name}
        subtitle="AI-powered workflow conversation"
        actionButton={{
          label: "Settings",
          icon: SettingsIcon,
          onClick: () => console.log('Workflow settings'),
          variant: 'secondary'
        }}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <EmptyState 
            workflowName={currentWorkflow.name}
            onSuggestedMessage={setInputMessage}
          />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                formatTime={formatTime} 
              />
            ))}

            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isLoading={isLoading}
        selectedAttachments={selectedAttachments}
        isAttachmentSheetOpen={isAttachmentSheetOpen}
        setIsAttachmentSheetOpen={setIsAttachmentSheetOpen}
        mockDocuments={mockDocuments}
        mockExecutions={mockExecutions}
        onSendMessage={handleSendMessage}
        onKeyDown={handleKeyDown}
        onAttachmentSelect={handleAttachmentSelect}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
};

export default WorkflowChat;
