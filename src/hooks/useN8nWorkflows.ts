
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Connection } from '@/hooks/useConnections';

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
  workflow_id: string;
  connection_id: string;
  name: string;
  active: boolean;
  description?: string;
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

      // Verificar se a conexão está ativa primeiro usando cache do React Query
      const cachedConnections = queryClient.getQueryData(['connections', user.id]) as Connection[] | undefined;
      const cachedConnection = cachedConnections?.find(conn => conn.id === connectionId);
      
      if (cachedConnection && !cachedConnection.active) {
        throw new Error('Connection is not active');
      }

      // Buscar dados da conexão no banco com campos específicos apenas se não estiver no cache
      let connection = cachedConnection;
      if (!connection) {
        const { data: connectionData, error: connectionError } = await supabase
          .from('connections')
          .select('id, name, n8n_url, n8n_api_key, active, user_id, created_at') // Fixed: include all required fields
          .eq('id', connectionId)
          .eq('user_id', user.id)
          .single();

        if (connectionError || !connectionData) {
          throw new Error('Connection not found');
        }
        connection = connectionData;
      }

      if (!connection.active) {
        throw new Error('Connection is not active');
      }

      // Chamar Edge Function para buscar workflows
      const { data, error } = await supabase.functions.invoke('get-n8n-workflows', {
        body: {
          n8n_url: connection.n8n_url,
          n8n_api_key: connection.n8n_api_key,
          limit: 50
        },
        headers: {
          'Connection': 'keep-alive'
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

      // Usar conexão do cache se disponível
      const cachedConnections = queryClient.getQueryData(['connections', user.id]) as Connection[] | undefined;
      const connection = cachedConnections?.find(conn => conn.id === connectionId);
      
      if (!connection) {
        throw new Error('Connection not found in cache. Please refresh connections.');
      }
      
      if (!connection.active) {
        throw new Error('Connection is not active');
      }

      // Chamar Edge Function para importar workflow
      const { data: importData, error: importError } = await supabase.functions.invoke('import-n8n-workflow', {
        body: {
          n8n_url: connection.n8n_url,
          n8n_api_key: connection.n8n_api_key,
          workflow_id: workflowId
        },
        headers: {
          'Connection': 'keep-alive'
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
        workflow_id: importResponse.workflow.id,
        connection_id: connectionId,
        name: importResponse.workflow.name,
        active: importResponse.workflow.active,
        description: `Imported from n8n on ${new Date().toISOString()}`
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
