
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Workflow {
  id: string;
  workflow_id: string;
  user_id: string;
  n8n_connection_id: string;
  json: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowData {
  workflow_id: string;
  n8n_connection_id: string;
  json?: any;
  description?: string;
}

export const useWorkflows = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['workflows', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          connections!workflows_n8n_connection_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workflows:', error);
        throw error;
      }

      return data as (Workflow & { connections: { name: string } })[];
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
