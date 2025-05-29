
import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const useWorkflows = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflows must be used within a WorkflowProvider');
  }
  return context;
};

// Mock data para workflows
const mockWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Email Automation',
    connectionId: 'conn-1',
    connectionName: 'Production N8N',
    isActive: true,
    lastUsed: '2 hours ago',
    description: 'Automated email marketing campaigns'
  },
  {
    id: 'wf-2',
    name: 'Data Sync',
    connectionId: 'conn-1',
    connectionName: 'Production N8N',
    isActive: true,
    lastUsed: '1 day ago',
    description: 'Synchronize data between systems'
  },
  {
    id: 'wf-3',
    name: 'Invoice Processing',
    connectionId: 'conn-2',
    connectionName: 'Dev N8N',
    isActive: false,
    lastUsed: '3 days ago',
    description: 'Process and validate invoices'
  },
  {
    id: 'wf-4',
    name: 'Customer Onboarding',
    connectionId: 'conn-1',
    connectionName: 'Production N8N',
    isActive: true,
    lastUsed: '5 hours ago',
    description: 'Automated customer onboarding flow'
  }
];

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const refreshWorkflows = () => {
    setIsLoading(true);
    // Simular carregamento
    setTimeout(() => {
      setWorkflows(mockWorkflows);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refreshWorkflows();
  }, []);

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
