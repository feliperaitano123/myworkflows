import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { MessageSquare } from 'lucide-react';
import { useAlert } from '@/components/AlertProvider';
import { WorkflowChat as WorkflowChatComponent } from '@/components/chat/WorkflowChat';

const WorkflowChat: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows, selectedWorkflow, setSelectedWorkflow } = useWorkflowsContext();
  const { showAlert } = useAlert();

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
      {/* Chat Component */}
      <WorkflowChatComponent workflowId={workflowId!} />
    </div>
  );
};

export default WorkflowChat;
