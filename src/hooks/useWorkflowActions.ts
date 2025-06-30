import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export const useWorkflowActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const deleteWorkflow = useCallback(async (workflowId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // 1. Buscar sessões de chat para este workflow
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // 2. Se existem sessões, deletar mensagens e tool executions relacionadas
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);

        // Deletar tool_executions através das mensagens
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id')
          .in('session_id', sessionIds);

        if (messages && messages.length > 0) {
          const messageIds = messages.map(m => m.id);
          
          // Deletar tool_executions
          const { error: toolError } = await supabase
            .from('tool_executions')
            .delete()
            .in('message_id', messageIds);

          if (toolError) throw toolError;
        }

        // Deletar chat_messages
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .in('session_id', sessionIds);

        if (messagesError) throw messagesError;

        // Deletar chat_sessions
        const { error: chatSessionsError } = await supabase
          .from('chat_sessions')
          .delete()
          .in('id', sessionIds);

        if (chatSessionsError) throw chatSessionsError;
      }

      // 3. Deletar o workflow
      const { error: workflowError } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', user.id);

      if (workflowError) throw workflowError;

      // 4. Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['workflows'] });

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar workflow:', error);
      throw error;
    }
  }, [user, queryClient]);

  const clearWorkflowChat = useCallback(async (workflowId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // 1. Buscar sessões de chat para este workflow
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // 2. Se existem sessões, deletar apenas mensagens e tool executions
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);

        // Deletar tool_executions através das mensagens
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id')
          .in('session_id', sessionIds);

        if (messages && messages.length > 0) {
          const messageIds = messages.map(m => m.id);
          
          // Deletar tool_executions
          const { error: toolError } = await supabase
            .from('tool_executions')
            .delete()
            .in('message_id', messageIds);

          if (toolError) throw toolError;
        }

        // Deletar apenas chat_messages (manter sessões)
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .in('session_id', sessionIds);

        if (messagesError) throw messagesError;
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao limpar chat do workflow:', error);
      throw error;
    }
  }, [user]);

  return {
    deleteWorkflow,
    clearWorkflowChat,
  };
};