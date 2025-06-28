import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ChatSession {
  id: string;
  user_id: string;
  workflow_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: any;
  created_at: string;
}

export class ChatSessionManager {
  private getServiceClient(): SupabaseClient {
    // Usar Service Role Key para operações de backend que precisam contornar RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    return supabase;
  }

  /**
   * Buscar ou criar sessão para um workflow específico
   */
  async getOrCreateSession(userId: string, workflowId: string, userToken: string): Promise<string> {
    try {
      console.log(`🔐 Usando Service Role para usuário: ${userId}`);
      const supabase = this.getServiceClient();
      
      // Primeiro, tentar buscar sessão existente
      console.log(`🔍 Buscando sessão existente para workflow: ${workflowId}`);
      const { data: existingSession, error: searchError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('workflow_id', workflowId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.log(`⚠️ Erro ao buscar sessão existente: ${searchError.message}`);
      }

      if (existingSession) {
        // Atualizar updated_at da sessão existente
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingSession.id);

        console.log(`📝 Sessão existente encontrada: ${existingSession.id}`);
        return existingSession.id;
      }

      // Criar nova sessão
      console.log(`🆕 Criando nova sessão para userId: ${userId}, workflowId: ${workflowId}`);
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          workflow_id: workflowId
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Erro ao criar sessão: ${error.message}`);
      }

      console.log(`✨ Nova sessão criada: ${newSession.id}`);
      return newSession.id;

    } catch (error) {
      console.error('❌ Erro ao gerenciar sessão:', error);
      throw error;
    }
  }

  /**
   * Salvar mensagem no banco de dados
   */
  async saveMessage(
    sessionId: string, 
    role: 'user' | 'assistant' | 'tool', 
    content: string, 
    userToken: string,
    metadata?: any,
    messageId?: string
  ): Promise<string> {
    try {
      const supabase = this.getServiceClient();
      
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId || undefined, // Use provided messageId or let DB generate
          session_id: sessionId,
          role,
          content,
          metadata: metadata || {}
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Erro ao salvar mensagem: ${error.message}`);
      }

      console.log(`💾 Mensagem salva (${role}): ${message.id}`);
      return message.id;

    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de mensagens de uma sessão
   */
  async getSessionHistory(sessionId: string, userToken: string, limit = 50): Promise<ChatMessage[]> {
    try {
      const supabase = this.getServiceClient();
      
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      console.log(`📖 Histórico carregado: ${messages?.length || 0} mensagens`);
      return messages || [];

    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Buscar histórico por workflow (para API REST)
   */
  async getWorkflowHistory(userId: string, workflowId: string, userToken: string, limit = 50): Promise<ChatMessage[]> {
    try {
      const supabase = this.getServiceClient();
      
      // Primeiro buscar a sessão
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('workflow_id', workflowId)
        .single();

      if (!session) {
        console.log('📭 Nenhuma sessão encontrada para este workflow');
        return [];
      }

      return await this.getSessionHistory(session.id, userToken, limit);

    } catch (error) {
      console.error('❌ Erro ao buscar histórico do workflow:', error);
      return [];
    }
  }

  /**
   * Limpar chat de um workflow (soft delete - marcar como arquivado)
   */
  async clearWorkflowChat(userId: string, workflowId: string, userToken: string): Promise<boolean> {
    try {
      const supabase = this.getServiceClient();
      
      // Por enquanto, vamos deletar as mensagens
      // Futuramente podemos implementar soft delete
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('workflow_id', workflowId)
        .single();

      if (!session) {
        return true; // Nada para limpar
      }

      // Deletar mensagens da sessão
      const { error } = await this.getServiceClient()
        .from('chat_messages')
        .delete()
        .eq('session_id', session.id);

      if (error) {
        throw new Error(`Erro ao limpar chat: ${error.message}`);
      }

      console.log(`🗑️ Chat limpo para workflow ${workflowId}`);
      return true;

    } catch (error) {
      console.error('❌ Erro ao limpar chat:', error);
      return false;
    }
  }

  /**
   * Atualizar metadados de uma mensagem (para tool executions)
   */
  async updateMessageMetadata(messageId: string, metadata: any): Promise<boolean> {
    try {
      const { error } = await this.getServiceClient()
        .from('chat_messages')
        .update({ metadata })
        .eq('id', messageId);

      if (error) {
        throw new Error(`Erro ao atualizar metadados: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar metadados:', error);
      return false;
    }
  }

  /**
   * Estatísticas da sessão (para debugging)
   */
  async getSessionStats(sessionId: string) {
    try {
      const { data: stats, error } = await this.getServiceClient()
        .from('chat_messages')
        .select('role')
        .eq('session_id', sessionId);

      if (error) throw error;

      const userMessages = stats?.filter((m: any) => m.role === 'user').length || 0;
      const assistantMessages = stats?.filter((m: any) => m.role === 'assistant').length || 0;

      return {
        total: stats?.length || 0,
        userMessages,
        assistantMessages
      };

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return { total: 0, userMessages: 0, assistantMessages: 0 };
    }
  }
}