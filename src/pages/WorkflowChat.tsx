
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatMessages } from '@/hooks/useChatMessagesWithAI';
import { useAttachments } from '@/hooks/useAttachments';
import { useUpdateWorkflow } from '@/hooks/useWorkflows';
import { useAlert } from '@/components/AlertProvider';
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

  const { 
    messages, 
    isLoading, 
    isTyping, 
    isStreaming,
    currentResponse,
    connectionStatus,
    addMessage, 
    sendMessage: sendToAI,
    clearMessages
  } = useChatMessages();
  const { 
    selectedAttachments, 
    isAttachmentSheetOpen, 
    setIsAttachmentSheetOpen,
    addAttachment,
    removeAttachment,
    clearAttachments
  } = useAttachments();
  const updateWorkflowMutation = useUpdateWorkflow();
  const { showAlert } = useAlert();

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

    // Enviar mensagem para o agente de IA
    await sendToAI(
      inputMessage, 
      currentWorkflow?.id,
      selectedAttachments.length > 0 ? selectedAttachments : undefined
    );

    setInputMessage('');
    clearAttachments();
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

  const handleUpdateWorkflowName = async (newName: string) => {
    if (!currentWorkflow) return;

    try {
      await updateWorkflowMutation.mutateAsync({
        id: currentWorkflow.id,
        data: { name: newName }
      });

      showAlert({
        type: 'success',
        title: 'Workflow Atualizado',
        message: `Nome alterado para "${newName}" com sucesso!`
      });
    } catch (error) {
      console.error('Error updating workflow name:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao Atualizar',
        message: 'Não foi possível atualizar o nome do workflow. Tente novamente.'
      });
    }
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

            {/* Mostrar resposta em streaming */}
            {isStreaming && currentResponse && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{currentResponse}</p>
                  </div>
                </div>
              </div>
            )}

            {isTyping && <TypingIndicator />}

            {/* Status de conexão */}
            {connectionStatus.error && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-destructive text-sm">
                  ⚠️ {connectionStatus.error}
                </p>
              </div>
            )}
            
            {!connectionStatus.isConnected && !connectionStatus.isConnecting && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  🔌 Conectando ao agente de IA...
                </p>
              </div>
            )}
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
