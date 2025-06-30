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
   * Lista workflows básicos do usuário via API n8n (apenas id, name, active)
   * Otimizado para sincronização de nomes - exclui dados pesados
   */
  async listWorkflowsBasic(userId: string): Promise<Array<{id: string, name: string, active: boolean}>> {
    try {
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        throw new Error('Nenhuma conexão n8n ativa encontrada');
      }

      const n8nUrl = connection.url.replace(/\/$/, '');
      // Otimização: excludePinnedData=true para reduzir tamanho da resposta
      const apiUrl = `${n8nUrl}/api/v1/workflows?excludePinnedData=true&limit=250`;

      console.log(`🔧 Buscando workflows básicos (otimizado): ${apiUrl}`);

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
      const workflowList = workflows.data || workflows;
      
      // Filtrar apenas campos necessários para economizar memória
      const basicWorkflows = workflowList.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active || false
      }));

      console.log(`✅ ${basicWorkflows.length} workflows básicos obtidos (apenas id, name, active)`);
      return basicWorkflows;

    } catch (error) {
      console.error('❌ Erro ao listar workflows básicos:', error);
      throw error;
    }
  }

  /**
   * Lista todos os workflows do usuário via API n8n (COMPLETO - usar apenas quando necessário)
   * @deprecated Use listWorkflowsBasic() para sincronização de nomes
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
   * Verifica se um workflow específico existe no n8n
   */
  async checkWorkflowExists(workflowId: string, userId: string): Promise<{exists: boolean, name?: string, active?: boolean}> {
    try {
      const connection = await this.getUserN8nConnection(userId);
      if (!connection) {
        return { exists: false };
      }

      const n8nUrl = connection.url.replace(/\/$/, '');
      const apiUrl = `${n8nUrl}/api/v1/workflows/${workflowId}?excludePinnedData=true`;

      console.log(`🔍 Verificando existência do workflow ${workflowId}: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': connection.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const workflow = await response.json();
        console.log(`✅ Workflow ${workflowId} existe: "${workflow.name}" (ativo: ${workflow.active})`);
        return {
          exists: true,
          name: workflow.name,
          active: workflow.active || false
        };
      } else if (response.status === 404) {
        console.log(`❌ Workflow ${workflowId} não existe mais no n8n`);
        return { exists: false };
      } else {
        console.warn(`⚠️ Erro ao verificar workflow ${workflowId}: ${response.status}`);
        return { exists: false };
      }

    } catch (error) {
      console.error(`❌ Erro ao verificar workflow ${workflowId}:`, error);
      return { exists: false };
    }
  }

  /**
   * Atualiza os nomes dos workflows e verifica existência individual
   * Lógica: Verde se existe no n8n, Vermelho se não existe mais
   */
  async updateWorkflowNames(userId: string): Promise<void> {
    try {
      console.log(`🔄 Validando existência e atualizando workflows para usuário: ${userId}`);

      // 1. Buscar workflows do banco do usuário
      const { data: localWorkflows, error } = await this.supabase
        .from('workflows')
        .select('id, workflow_id, name, active')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Erro ao buscar workflows locais: ${error.message}`);
      }

      console.log(`💾 Encontrados ${localWorkflows?.length || 0} workflows no banco para validar`);

      // 2. Verificar existência de cada workflow individualmente
      let updatedCount = 0;
      let existingCount = 0;
      let missingCount = 0;

      for (const localWorkflow of localWorkflows || []) {
        console.log(`🔍 Verificando workflow: ${localWorkflow.workflow_id}`);
        
        const checkResult = await this.checkWorkflowExists(localWorkflow.workflow_id, userId);
        
        let needsUpdate = false;
        let updateData: any = {};

        if (checkResult.exists) {
          // Workflow existe no n8n
          existingCount++;
          
          // Verificar se nome ou status mudaram
          if (checkResult.name && checkResult.name !== localWorkflow.name) {
            updateData.name = checkResult.name;
            needsUpdate = true;
            console.log(`📝 Nome: "${localWorkflow.name}" → "${checkResult.name}"`);
          }
          
          // Marcar como ativo (existe no n8n)
          if (!localWorkflow.active) {
            updateData.active = true;
            needsUpdate = true;
            console.log(`🟢 Status: inativo → ativo (existe no n8n)`);
          }
        } else {
          // Workflow NÃO existe no n8n
          missingCount++;
          
          // Marcar como inativo (não existe no n8n)
          if (localWorkflow.active) {
            updateData.active = false;
            needsUpdate = true;
            console.log(`🔴 Status: ativo → inativo (não existe no n8n)`);
          }
        }

        // Atualizar no banco se necessário
        if (needsUpdate) {
          const { error: updateError } = await this.supabase
            .from('workflows')
            .update(updateData)
            .eq('id', localWorkflow.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar workflow ${localWorkflow.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ Workflow ${localWorkflow.workflow_id} atualizado`);
          }
        }
      }

      console.log(`📊 Resumo da validação:`);
      console.log(`   🟢 Existem no n8n: ${existingCount}`);
      console.log(`   🔴 Não existem no n8n: ${missingCount}`);
      console.log(`   ✅ Atualizados no banco: ${updatedCount}`);

    } catch (error) {
      console.error('❌ Erro ao validar workflows:', error);
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