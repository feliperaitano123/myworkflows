import { supabase } from '@/integrations/supabase/client';

// Definição do tipo para Execution
export interface Execution {
  id: string;
  name: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  mode: string;
  workflowId: string;
}

export interface ExecutionsResponse {
  success: boolean;
  data: Execution[];
  count: number;
  timestamp: string;
  error?: string;
}

/**
 * Service para gerenciar chamadas relacionadas a executions de workflows
 */
export class ExecutionsService {
  private static readonly API_BASE_URL = 'http://localhost:3002';

  /**
   * Busca executions de um workflow específico
   */
  static async getWorkflowExecutions(workflowId: string): Promise<Execution[]> {
    try {
      console.log(`🔧 ExecutionsService: Buscando executions do workflow ${workflowId}`);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer chamada para API backend
      const response = await fetch(`${this.API_BASE_URL}/api/workflows/${workflowId}/executions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const result: ExecutionsResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido do servidor');
      }

      console.log(`✅ ExecutionsService: Encontradas ${result.count} executions`);
      return result.data;

    } catch (error) {
      console.error('❌ Erro no ExecutionsService:', error);
      throw error;
    }
  }

  /**
   * Mapeia status de execution para ícones/cores
   */
  static getStatusConfig(status: Execution['status']) {
    switch (status) {
      case 'success':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Sucesso',
          icon: '✅'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Erro',
          icon: '❌'
        };
      case 'running':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Executando',
          icon: '⏳'
        };
      case 'waiting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Aguardando',
          icon: '⏸️'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Desconhecido',
          icon: '❓'
        };
    }
  }

  /**
   * Formata data de execution para exibição
   */
  static formatExecutionDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

      // Se foi há menos de 24 horas, mostrar tempo relativo
      if (diffHours < 24) {
        const diffMinutes = Math.floor(diffHours * 60);
        if (diffMinutes < 60) {
          return `${diffMinutes}m atrás`;
        } else {
          return `${Math.floor(diffHours)}h atrás`;
        }
      }

      // Caso contrário, mostrar data formatada
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  }
}