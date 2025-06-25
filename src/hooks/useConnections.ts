
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ValidationResponse {
  valid: boolean;
  message: string;
  error?: string;
}

export interface Connection {
  id: string;
  name: string;
  n8n_url: string;
  n8n_api_key: string;
  active: boolean;
  user_id: string;
  created_at: string;
}

export interface CreateConnectionData {
  name: string;
  n8n_url: string;
  n8n_api_key: string;
}

export interface UpdateConnectionData {
  name?: string;
  n8n_api_key?: string;
  active?: boolean;
}

export const useConnections = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connections:', error);
        throw error;
      }

      return data as Connection[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreateConnection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateConnectionData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: connection, error } = await supabase
        .from('connections')
        .insert({
          ...data,
          user_id: user.id,
          active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating connection:', error);
        throw error;
      }

      return connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', user?.id] });
    },
  });
};

export const useUpdateConnection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateConnectionData }) => {
      const { data: connection, error } = await supabase
        .from('connections')
        .update(data)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating connection:', error);
        throw error;
      }

      return connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', user?.id] });
    },
  });
};

export const useDeleteConnection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting connection:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', user?.id] });
    },
  });
};

export const useValidateConnection = () => {
  return useMutation({
    mutationFn: async ({ n8n_url, n8n_api_key }: { n8n_url: string; n8n_api_key: string }): Promise<ValidationResponse> => {
      const { data, error } = await supabase.functions.invoke('validate-n8n-connection', {
        body: { n8n_url, n8n_api_key },
        headers: {
          'Connection': 'keep-alive'
        }
      });

      if (error) {
        console.error('Error validating connection:', error);
        throw error;
      }

      return data as ValidationResponse;
    }
  });
};
