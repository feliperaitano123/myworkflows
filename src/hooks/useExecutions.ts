import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ExecutionsService, Execution } from '@/services/executionsService';

/**
 * Hook para buscar executions de um workflow específico
 */
export const useExecutions = (workflowId: string): UseQueryResult<Execution[], Error> => {
  return useQuery({
    queryKey: ['executions', workflowId],
    queryFn: () => ExecutionsService.getWorkflowExecutions(workflowId),
    enabled: !!workflowId, // Só executa se workflowId estiver disponível
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    staleTime: 30000, // Cache por 30 segundos
    retry: 2, // Tentar 2 vezes em caso de erro
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
  });
};

/**
 * Hook para configuração de status de executions
 */
export const useExecutionStatus = () => {
  return {
    getStatusConfig: ExecutionsService.getStatusConfig,
    formatDate: ExecutionsService.formatExecutionDate,
  };
};