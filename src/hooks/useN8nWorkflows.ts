import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
}

export interface GetWorkflowsResponse {
  success: boolean;
  workflows: N8nWorkflow[];
  nextCursor?: string;
  message?: string;
  error?: string;
}

export interface ImportWorkflowResponse {
  success: boolean;
  workflow?: {
    id: string;
    name: string;
    active: boolean;
    nodes: any[];
    connections: any;
    settings: any;
    staticData: any;
    tags: Array<{ id: string; name: string }>;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
  error?: string;
}

export interface CreateWorkflowData {
  connection_id: string;
  n8n_workflow_id: string;
  name: string;
  active: boolean;
  workflow_data: any;
}

export const useN8nWorkflows = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mutation para buscar workflows de uma conexão específica
  const fetchWorkflows = useMutation({
    mutationFn: async (connectionId: string): Promise<GetWorkflowsResponse> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Buscar dados da conexão no banco
      const { data: connection, error: connectionError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();

      if (connectionError || !connection) {
        throw new Error('Connection not found');
      }

      // Chamar Edge Function para buscar workflows
      const { data, error } = await supabase.functions.invoke('get-n8n-workflows', {
        body: {
          n8n_url: connection.n8n_url,
          n8n_api_key: connection.n8n_api_key,
          limit: 100
        }
      });

      if (error) {
        console.error('Error fetching workflows:', error);
        throw error;
      }

      return data as GetWorkflowsResponse;
    }
  });

  // Mutation para importar um workflow específico
  const importWorkflow = useMutation({
    mutationFn: async ({ 
      connectionId, 
      workflowId 
    }: { 
      connectionId: string; 
      workflowId: string; 
    }): Promise<any> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Buscar dados da conexão no banco
      const { data: connection, error: connectionError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();

      if (connectionError || !connection) {
        throw new Error('Connection not found');
      }

      // Chamar Edge Function para importar workflow
      const { data: importData, error: importError } = await supabase.functions.invoke('import-n8n-workflow', {
        body: {
          n8n_url: connection.n8n_url,
          n8n_api_key: connection.n8n_api_key,
          workflow_id: workflowId
        }
      });

      if (importError) {
        console.error('Error importing workflow:', importError);
        throw importError;
      }

      const importResponse = importData as ImportWorkflowResponse;

      if (!importResponse.success || !importResponse.workflow) {
        throw new Error(importResponse.message || 'Failed to import workflow');
      }

      // Salvar workflow no banco de dados
      const workflowData: CreateWorkflowData = {
        connection_id: connectionId,
        n8n_workflow_id: importResponse.workflow.id,
        name: importResponse.workflow.name,
        active: importResponse.workflow.active,
        workflow_data: importResponse.workflow
      };

      const { data: savedWorkflow, error: saveError } = await supabase
        .from('workflows')
        .insert({
          ...workflowData,
          user_id: user.id
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving workflow:', saveError);
        throw saveError;
      }

      return savedWorkflow;
    },
    onSuccess: () => {
      // Invalidar cache de workflows para atualizar sidebar
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    }
  });

  return {
    fetchWorkflows,
    importWorkflow,
    isFetchingWorkflows: fetchWorkflows.isPending,
    isImportingWorkflow: importWorkflow.isPending
  };
};