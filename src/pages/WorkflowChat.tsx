import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare, Send } from 'lucide-react';
import { useAlert } from '@/components/AlertProvider';
import { useChatWithPersistence } from '@/hooks/useChatWithPersistence';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const WorkflowChat: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows, selectedWorkflow, setSelectedWorkflow } = useWorkflowsContext();
  const { showAlert } = useAlert();
  const [inputMessage, setInputMessage] = useState('');

  // Hook do chat
  const {
    messages,
    isConnected,
    isConnecting,
    isLoadingHistory,
    sendMessage,
    error,
    connectionStatus
  } = useChatWithPersistence({ workflowId });

  // Encontrar workflow atual
  const currentWorkflow = workflows.find(w => w.id === workflowId);

  React.useEffect(() => {
    if (currentWorkflow && currentWorkflow.id !== selectedWorkflow?.id) {
      setSelectedWorkflow(currentWorkflow);
    }
  }, [currentWorkflow, selectedWorkflow, setSelectedWorkflow]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && isConnected) {
      try {
        await sendMessage(inputMessage.trim());
        setInputMessage('');
      } catch (err) {
        showAlert('Erro ao enviar mensagem', 'error');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
          icon: MessageSquare,
          onClick: () => console.log('Workflow settings'),
          variant: 'secondary'
        }}
      />
      {/* Status da conexão */}
      {!isConnected && (
        <div className="p-4 bg-yellow-50 border-b">
          <div className="text-center text-sm">
            {isConnecting ? '🔄 Conectando...' : '❌ Desconectado'}
            {error && <span className="text-red-600 ml-2">{error}</span>}
          </div>
        </div>
      )}

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory && (
          <div className="text-center text-muted-foreground">
            Carregando histórico...
          </div>
        )}
        
        {messages.length === 0 && !isLoadingHistory && (
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2" />
            <p>Comece uma conversa sobre o workflow "{currentWorkflow.name}"</p>
          </div>
        )}

        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input de mensagem */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Digite sua mensagem..." : "Aguardando conexão..."}
            disabled={!isConnected}
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Status: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
      </div>
    </div>
  );
};

export default WorkflowChat;
