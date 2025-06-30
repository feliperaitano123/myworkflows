import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';

/**
 * Hook para validar workflows e gerenciar cache de status
 */
export function useWorkflowSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCache, setStatusCache] = useState<Record<string, {exists: boolean, name?: string}>>({});

  const validateWorkflows = async (): Promise<Record<string, {exists: boolean, name?: string}>> => {
    try {
      setIsSyncing(true);
      setError(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer chamada para API do servidor (novo endpoint)
      const response = await fetch('http://localhost:3002/api/workflows/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao validar workflows');
      }

      const result = await response.json();
      console.log('✅ Workflows validados:', result.message);
      console.log('📊 Status cache:', result.data);
      
      // Atualizar cache local
      setStatusCache(result.data || {});
      
      return result.data || {};

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro ao validar workflows:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Backward compatibility
  const syncWorkflowNames = validateWorkflows;

  // Função para verificar status de um workflow específico
  const getWorkflowStatus = (workflowId: string): 'unknown' | 'exists' | 'missing' => {
    if (!(workflowId in statusCache)) {
      return 'unknown'; // Não verificado ainda
    }
    return statusCache[workflowId].exists ? 'exists' : 'missing';
  };

  // Limpar cache (para forçar nova verificação)
  const clearCache = () => {
    setStatusCache({});
  };

  return {
    // Novo
    validateWorkflows,
    statusCache,
    getWorkflowStatus,
    clearCache,
    
    // Backward compatibility
    syncWorkflowNames,
    
    // Estados
    isSyncing,
    error,
  };
}