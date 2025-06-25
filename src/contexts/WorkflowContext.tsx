
import React, { createContext, useContext, useState } from 'react';
import { useWorkflows } from '@/hooks/useWorkflows';

export interface Workflow {
  id: string;
  name: string;
  connectionId: string;
  connectionName: string;
  isActive: boolean;
  lastUsed: string;
  description?: string;
}

interface WorkflowContextType {
  workflows: Workflow[];
  isLoading: boolean;
  selectedWorkflow: Workflow | null;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  refreshWorkflows: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const useWorkflowsContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflowsContext must be used within a WorkflowProvider');
  }
  return context;
};

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const { data: workflowsData, isLoading, refetch } = useWorkflows();

  // Transform database workflows to match the interface
  const workflows: Workflow[] = workflowsData?.map(workflow => ({
    id: workflow.id,
    name: workflow.workflow_id, // Using workflow_id as name for now
    connectionId: workflow.connection_id, // Fixed: use connection_id instead of n8n_connection_id
    connectionName: workflow.connections?.name || 'Unknown Connection',
    isActive: true, // Default to active for now
    lastUsed: new Date(workflow.updated_at).toLocaleDateString(),
    description: workflow.description,
  })) || [];

  const refreshWorkflows = () => {
    refetch();
  };

  const value = {
    workflows,
    isLoading,
    selectedWorkflow,
    setSelectedWorkflow,
    refreshWorkflows
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};
