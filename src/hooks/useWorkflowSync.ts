import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';

/**
 * Hook para sincronizar nomes dos workflows com a API do n8n
 */
export function useWorkflowSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncWorkflowNames = async () => {
    try {
      setIsSyncing(true);
      setError(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer chamada para API do servidor
      const response = await fetch('http://localhost:3002/api/workflows/sync-names', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao sincronizar workflows');
      }

      const result = await response.json();
      console.log('✅ Workflows sincronizados:', result.message);
      
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro ao sincronizar workflows:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncWorkflowNames,
    isSyncing,
    error,
  };
}