import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare } from 'lucide-react';
import { useAlert } from '@/components/AlertProvider';
import { WorkflowChat as WorkflowChatComponent } from '@/components/chat/WorkflowChat';
import { useWorkflowActions } from '@/hooks/useWorkflowActions';
import { DeleteWorkflowModal } from '@/components/DeleteWorkflowModal';

const WorkflowChat: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { workflows, selectedWorkflow, setSelectedWorkflow } = useWorkflowsContext();
  const { showAlert } = useAlert();
  const { deleteWorkflow } = useWorkflowActions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const clearChatRef = useRef<(() => void) | undefined>();

  // Log para debug
  React.useEffect(() => {
    console.log('WorkflowChat page mounted/updated for workflow:', workflowId);
    return () => {
      console.log('WorkflowChat page unmounting for workflow:', workflowId);
    };
  }, [workflowId]);

  // Encontrar workflow atual
  const currentWorkflow = workflows.find(w => w.id === workflowId);

  React.useEffect(() => {
    if (currentWorkflow && currentWorkflow.id !== selectedWorkflow?.id) {
      setSelectedWorkflow(currentWorkflow);
    }
  }, [currentWorkflow, selectedWorkflow, setSelectedWorkflow]);

  // Handlers para ações do workflow
  const handleClearChat = () => {
    if (clearChatRef.current) {
      clearChatRef.current();
    }
  };

  const handleDeleteWorkflow = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!workflowId || !currentWorkflow) return;
    
    setIsDeleting(true);
    try {
      await deleteWorkflow(workflowId);
      showAlert(`Workflow "${currentWorkflow.name}" deletado com sucesso!`, 'success');
      navigate('/'); // Redirect para dashboard
    } catch (error) {
      console.error('Erro ao deletar workflow:', error);
      showAlert('Erro ao deletar workflow', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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
        workflowSettings={{
          onClearChat: handleClearChat,
          onDeleteWorkflow: handleDeleteWorkflow,
        }}
      />
      {/* Chat Component */}
      <div className="flex-1 min-h-0">
        <WorkflowChatComponent workflowId={workflowId!} onClearChatRef={clearChatRef} />
      </div>

      {/* Delete Workflow Modal */}
      <DeleteWorkflowModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        workflowName={currentWorkflow.name}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default WorkflowChat;
