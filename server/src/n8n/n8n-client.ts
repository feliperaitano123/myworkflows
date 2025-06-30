import { createClient } from '@supabase/supabase-js';

/**
 * Cliente para API do n8n
 * Responsável por fazer chamadas reais para instâncias n8n dos usuários
 */
export class N8nAPIClient {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Busca a conexão n8n ativa do usuário
   */
  private async getUserN8nConnection(userId: string): Promise<{
    url: string;
    apiKey: string;
    name: string;
  } | null> {
    try {
      console.log(`🔍 Buscando conexão n8n ativa para usuário: ${userId}`);

      const { data, error } = await this.supabase
        .from('connections')
        .select('n8n_url, n8n_api_key, name')
        .eq('user_id', userId)
        .eq('active', true)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar conexão n8n:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ Nenhuma conexão n8n ativa encontrada');
        return null;
      }

      console.log(`✅ Conexão n8n encontrada: ${data.name} (${data.n8n_url})`);
      return {
        url: data.n8n_url,
        apiKey: data.n8n_api_key,
        name: data.name,
      };

    } catch (error) {
      console.error('❌ Erro ao buscar conexão n8n:', error);
      return null;
    }
  }

  /**
   * Busca detalhes completos de um workflow via API n8n
   */
  async getWorkflow(workflowId: string, userId: string): Promise<any> {
    try {
      console.log(`🔧 N8N API: Buscando workflow ${workflowId} para usuário ${userId}`);

      // 1. Buscar conexão n8n do usuário
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        throw new Error('Nenhuma conexão n8n ativa encontrada para este usuário');
      }

      // 2. Primeiro, buscar o workflow no nosso banco para pegar o workflow_id do n8n
      const { data: workflowData, error: workflowError } = await this.supabase
        .from('workflows')
        .select('workflow_id, name')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (workflowError || !workflowData) {
        throw new Error(`Workflow ${workflowId} não encontrado no sistema`);
      }

      const n8nWorkflowId = workflowData.workflow_id;
      console.log(`📋 Workflow encontrado no sistema: ${workflowData.name} (n8n ID: ${n8nWorkflowId})`);

      // 3. Fazer chamada para API do n8n
      const n8nUrl = connection.url.replace(/\/$/, ''); // Remove trailing slash
      const apiUrl = `${n8nUrl}/api/v1/workflows/${n8nWorkflowId}`;

      console.log(`🌐 Fazendo chamada para n8n: ${apiUrl}`);
      console.log(`🔗 Conexão URL: ${connection.url}`);
      console.log(`🔑 API Key characters: ${connection.apiKey.split('').map(char => char.charCodeAt(0)).join(', ')}`);
      
      // Verificar se URL tem caracteres especiais
      const urlEncoded = encodeURI(apiUrl);
      console.log(`🌐 URL encoded: ${urlEncoded}`);

      // Sanitizar API Key para remover caracteres especiais
      const sanitizedApiKey = connection.apiKey.trim().replace(/[^\x00-\x7F]/g, "");
      
      console.log(`🔑 API Key original length: ${connection.apiKey.length}`);
      console.log(`🔑 API Key sanitizada length: ${sanitizedApiKey.length}`);
      console.log(`🔑 API Key preview: ${sanitizedApiKey.substring(0, 10)}...`);

      let response: Response;
      
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': sanitizedApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'MyWorkflows-Agent/1.0'
          },
        });
        
        console.log(`✅ Fetch executado, status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ n8n API Error ${response.status}:`, errorText);
          
          if (response.status === 401) {
            throw new Error('API Key inválida ou expirada para n8n');
          } else if (response.status === 404) {
            throw new Error(`Workflow ${n8nWorkflowId} não encontrado no n8n`);
          } else if (response.status === 403) {
            throw new Error('Sem permissão para acessar este workflow no n8n');
          } else {
            throw new Error(`Erro na API n8n: ${response.status} - ${errorText}`);
          }
        }
      } catch (fetchError) {
        console.error(`❌ Erro no fetch para n8n:`, fetchError);
        
        // Re-throw original error if it's our custom error
        if (fetchError instanceof Error && fetchError.message.includes('API Key inválida')) {
          throw fetchError;
        }
        
        // For fetch errors, provide more context
        throw new Error(`Erro de conexão com n8n: ${(fetchError as Error).message}`);
      }

      const workflowJson = await response.json() as any;
      console.log(`✅ Workflow obtido com sucesso do n8n!`);
      console.log(`📊 Workflow tem ${workflowJson.nodes?.length || 0} nodes`);

      return {
        // Metadados do nosso sistema
        systemId: workflowId,
        systemName: workflowData.name,
        n8nId: n8nWorkflowId,
        connectionName: connection.name,
        
        // Dados completos do n8n
        ...(workflowJson as object),
        
        // Timestamp da consulta
        fetchedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Erro ao buscar workflow do n8n:', error);
      throw error;
    }
  }

  /**
   * Testa conectividade com a API n8n
   */
  async testConnection(userId: string): Promise<boolean> {
    try {
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        return false;
      }

      const n8nUrl = connection.url.replace(/\/$/, '');
      const apiUrl = `${n8nUrl}/api/v1/workflows`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': connection.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;

    } catch (error) {
      console.error('❌ Erro ao testar conexão n8n:', error);
      return false;
    }
  }

  /**
   * Lista todos os workflows do usuário via API n8n
   */
  async listWorkflows(userId: string): Promise<any[]> {
    try {
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        throw new Error('Nenhuma conexão n8n ativa encontrada');
      }

      const n8nUrl = connection.url.replace(/\/$/, '');
      const apiUrl = `${n8nUrl}/api/v1/workflows`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': connection.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API n8n: ${response.status}`);
      }

      const workflows = await response.json() as any;
      return workflows.data || workflows;

    } catch (error) {
      console.error('❌ Erro ao listar workflows:', error);
      throw error;
    }
  }

  /**
   * Busca execuções de um workflow específico via API n8n
   * Retorna apenas dados essenciais: id, name, status
   */
  async getWorkflowExecutions(workflowId: string, userId: string): Promise<any[]> {
    try {
      console.log(`🔧 N8N API: Buscando executions do workflow ${workflowId} para usuário ${userId}`);

      // 1. Buscar conexão n8n do usuário
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        throw new Error('Nenhuma conexão n8n ativa encontrada para este usuário');
      }

      // 2. Buscar o workflow no nosso banco para pegar o workflow_id do n8n
      const { data: workflowData, error: workflowError } = await this.supabase
        .from('workflows')
        .select('workflow_id, name')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (workflowError || !workflowData) {
        throw new Error(`Workflow ${workflowId} não encontrado no sistema`);
      }

      const n8nWorkflowId = workflowData.workflow_id;
      console.log(`📋 Buscando executions para workflow: ${workflowData.name} (n8n ID: ${n8nWorkflowId})`);

      // 3. Fazer chamada para API do n8n para buscar executions
      const n8nUrl = connection.url.replace(/\/$/, '');
      // Endpoint para listar executions com filtro por workflow
      const apiUrl = `${n8nUrl}/api/v1/executions?workflowId=${n8nWorkflowId}&limit=50`;

      console.log(`🌐 Fazendo chamada para n8n executions: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': connection.apiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'MyWorkflows-Agent/1.0'
        },
      });

      console.log(`✅ Fetch executions executado, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ n8n API Error ${response.status}:`, errorText);
        
        if (response.status === 401) {
          throw new Error('API Key inválida ou expirada para n8n');
        } else if (response.status === 404) {
          throw new Error(`Workflow ${n8nWorkflowId} não encontrado no n8n`);
        } else if (response.status === 403) {
          throw new Error('Sem permissão para acessar executions deste workflow no n8n');
        } else {
          throw new Error(`Erro na API n8n: ${response.status} - ${errorText}`);
        }
      }

      const executionsResponse = await response.json() as any;
      console.log(`✅ Executions obtidas com sucesso do n8n!`);
      
      // Extract executions array from response (n8n can return { data: [...] } or direct array)
      const executions = executionsResponse.data || executionsResponse || [];
      console.log(`📊 Encontradas ${executions.length} executions`);

      // 4. Filtrar apenas dados essenciais para o frontend
      const essentialExecutions = executions.map((execution: any) => ({
        id: execution.id,
        name: execution.workflowData?.name || `Execution ${execution.id}`,
        status: this.mapExecutionStatus(execution.finished, execution.mode, execution.stoppedAt),
        startedAt: execution.startedAt,
        finishedAt: execution.stoppedAt,
        mode: execution.mode,
        workflowId: execution.workflowId
      }));

      return essentialExecutions;

    } catch (error) {
      console.error('❌ Erro ao buscar executions do workflow:', error);
      throw error;
    }
  }

  /**
   * Mapeia status de execution do n8n para formato simplificado
   */
  private mapExecutionStatus(finished: boolean, mode: string, stoppedAt: string | null): 'success' | 'error' | 'running' | 'waiting' {
    if (!finished) {
      return 'running';
    }
    
    if (finished && stoppedAt) {
      // Se terminou normalmente, assumir sucesso
      // TODO: Verificar se n8n retorna dados de erro para determinar falha
      return 'success';
    }
    
    return 'waiting';
  }
}

// Singleton instance
let n8nClientInstance: N8nAPIClient | null = null;

/**
 * Retorna instância singleton do N8N API Client
 */
export function getN8nClient(): N8nAPIClient {
  if (!n8nClientInstance) {
    n8nClientInstance = new N8nAPIClient();
  }
  return n8nClientInstance;
}