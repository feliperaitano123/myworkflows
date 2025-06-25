
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatWithPersistence } from '@/hooks/useChatWithPersistence';
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
    isConnected,
    isConnecting,
    isLoadingHistory,
    currentResponse,
    connectionStatus,
    sendMessage: sendToAI,
    clearChat,
    error: chatError
  } = useChatWithPersistence({ 
    workflowId: currentWorkflow?.id 
  });
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
    if (!inputMessage.trim() || !isConnected) return;

    // Enviar mensagem para o agente de IA
    await sendToAI(
      inputMessage,
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
        {isLoadingHistory && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Carregando histórico...</span>
          </div>
        )}

        {messages.length === 0 && !isLoadingHistory ? (
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
            {currentResponse && (
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

            {!isConnected && isConnecting && <TypingIndicator />}

            {/* Status de conexão e erros */}
            {(connectionStatus.error || chatError) && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-destructive text-sm">
                  ⚠️ {connectionStatus.error || chatError}
                </p>
              </div>
            )}
            
            {!isConnected && !isConnecting && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  🔌 Conectando ao agente de IA...
                </p>
              </div>
            )}

            {isConnected && (
              <div className="text-center">
                <button
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  🗑️ Limpar Chat
                </button>
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
        isLoading={!isConnected}
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
