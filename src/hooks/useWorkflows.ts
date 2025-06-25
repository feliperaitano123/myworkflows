
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Workflow {
  id: string;
  workflow_id: string;
  user_id: string;
  connection_id: string;
  name: string;
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowData {
  workflow_id: string;
  connection_id: string;
  name: string;
  active: boolean;
  description?: string;
}

export const useWorkflows = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['workflows', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First, get all workflows for the user
      const { data: workflowsData, error: workflowsError } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (workflowsError) {
        console.error('Error fetching workflows:', workflowsError);
        throw workflowsError;
      }

      // Then, get all connections for the user to map connection names
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id, name')
        .eq('user_id', user.id);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw connectionsError;
      }

      // Create a map of connection id to connection name
      const connectionMap = new Map(connectionsData?.map(conn => [conn.id, conn.name]) || []);

      // Combine the data
      const workflowsWithConnections = workflowsData?.map(workflow => ({
        ...workflow,
        connections: { name: connectionMap.get(workflow.connection_id) || 'Unknown Connection' }
      })) || [];

      return workflowsWithConnections as (Workflow & { connections: { name: string } })[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateWorkflowData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: workflow, error } = await supabase
        .from('workflows')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating workflow:', error);
        throw error;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWorkflowData> }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: workflow, error } = await supabase
        .from('workflows')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating workflow:', error);
        throw error;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });
};
