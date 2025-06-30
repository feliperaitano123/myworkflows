
import React, { createContext, useContext, useState } from 'react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useWorkflowSync } from '@/hooks/useWorkflowSync';

export interface Workflow {
  id: string;
  workflowId: string; // n8n workflow ID
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
  syncWorkflowNames: () => Promise<void>;
  isSyncing: boolean;
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
  const { syncWorkflowNames: syncNames, isSyncing } = useWorkflowSync();

  // Transform database workflows to match the interface
  const workflows: Workflow[] = workflowsData?.map(workflow => ({
    id: workflow.id,
    workflowId: workflow.workflow_id, // n8n workflow ID
    name: workflow.name || workflow.workflow_id, // Use real name if available, fallback to workflow_id
    connectionId: workflow.connection_id, // Fixed: use connection_id instead of n8n_connection_id
    connectionName: workflow.connections?.name || 'Unknown Connection',
    isActive: workflow.active || false, // Use real active status from n8n
    lastUsed: new Date(workflow.updated_at).toLocaleDateString(),
    description: workflow.description,
  })) || [];

  const refreshWorkflows = () => {
    refetch();
  };

  const syncWorkflowNames = async () => {
    try {
      console.log('🔄 Iniciando sincronização...');
      await syncNames();
      
      // Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔄 Fazendo refresh dos workflows...');
      // Refresh workflows after sync to get updated data
      refreshWorkflows();
      
      console.log('✅ Sincronização completa!');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  };

  const value = {
    workflows,
    isLoading,
    selectedWorkflow,
    setSelectedWorkflow,
    refreshWorkflows,
    syncWorkflowNames,
    isSyncing
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};
