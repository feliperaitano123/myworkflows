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
   * Sanitiza API key removendo apenas caracteres unicode problemáticos
   */
  private sanitizeApiKey(apiKey: string): string {
    return apiKey
      .trim()
      // Remove apenas caracteres unicode invisíveis problemáticos para ByteString
      .replace(/[\u2000-\u206F]/g, '') // Espaços unicode especiais
      .replace(/[\u2028\u2029]/g, '') // Line separators que causam o erro específico
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      // Remove caracteres de controle C0 e C1
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();
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
      
      // Sanitizar API key antes de retornar
      const sanitizedApiKey = this.sanitizeApiKey(data.n8n_api_key);
      console.log(`🔑 API Key original length: ${data.n8n_api_key.length}, sanitizada: ${sanitizedApiKey.length}`);
      
      return {
        url: data.n8n_url,
        apiKey: sanitizedApiKey,
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
      console.log(`🔑 API Key preview: ${connection.apiKey.substring(0, 10)}...${connection.apiKey.substring(connection.apiKey.length - 3)}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': connection.apiKey,
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

      console.log(`📡 Response status: ${response.status} para workflow ${workflowId}`);
      
      if (response.status === 200) {
        const workflow = await response.json() as any;
        console.log(`✅ Workflow ${workflowId} existe: "${workflow.name}" (ativo: ${workflow.active})`);
        return {
          exists: true,
          name: workflow.name,
          active: workflow.active || false
        };
      } else if (response.status === 404) {
        console.log(`❌ Workflow ${workflowId} não existe mais no n8n (404)`);
        return { exists: false };
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ Erro ao verificar workflow ${workflowId}: ${response.status} - ${errorText}`);
        return { exists: false };
      }

    } catch (error) {
      console.error(`❌ Erro ao verificar workflow ${workflowId}:`, error);
      return { exists: false };
    }
  }

  /**
   * Verifica existência dos workflows no n8n e retorna status para cache do frontend
   * Não salva mais status no banco - só atualiza nomes se necessário
   */
  async validateWorkflows(userId: string): Promise<Record<string, {exists: boolean, name?: string}>> {
    try {
      console.log(`🔍 Validando workflows para usuário: ${userId}`);

      // 1. Buscar workflows do banco do usuário
      const { data: localWorkflows, error } = await this.supabase
        .from('workflows')
        .select('id, workflow_id, name')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Erro ao buscar workflows locais: ${error.message}`);
      }

      console.log(`💾 Encontrados ${localWorkflows?.length || 0} workflows para validar`);

      // 2. Verificar existência de cada workflow e montar cache
      const statusCache: Record<string, {exists: boolean, name?: string}> = {};
      let nameUpdatesCount = 0;
      let existingCount = 0;
      let missingCount = 0;

      for (const localWorkflow of localWorkflows || []) {
        console.log(`🔍 Verificando workflow: ${localWorkflow.workflow_id}`);
        
        const checkResult = await this.checkWorkflowExists(localWorkflow.workflow_id, userId);
        
        // Salvar no cache para retornar ao frontend (usar workflow_id como chave)
        statusCache[localWorkflow.workflow_id] = {
          exists: checkResult.exists,
          name: checkResult.name
        };

        if (checkResult.exists) {
          existingCount++;
          console.log(`✅ Workflow ${localWorkflow.workflow_id} existe`);
          
          // Atualizar apenas o nome no banco se mudou
          if (checkResult.name && checkResult.name !== localWorkflow.name) {
            const { error: updateError } = await this.supabase
              .from('workflows')
              .update({ name: checkResult.name })
              .eq('id', localWorkflow.id);

            if (updateError) {
              console.error(`❌ Erro ao atualizar nome do workflow ${localWorkflow.id}:`, updateError);
            } else {
              nameUpdatesCount++;
              console.log(`📝 Nome atualizado: "${localWorkflow.name}" → "${checkResult.name}"`);
            }
          }
        } else {
          missingCount++;
          console.log(`❌ Workflow ${localWorkflow.workflow_id} não existe no n8n`);
        }
      }

      console.log(`📊 Resumo da validação:`);
      console.log(`   🟢 Existem no n8n: ${existingCount}`);
      console.log(`   🔴 Não existem no n8n: ${missingCount}`);
      console.log(`   📝 Nomes atualizados: ${nameUpdatesCount}`);
      console.log(`💾 Cache construído:`, Object.keys(statusCache).map(key => `${key}: ${statusCache[key].exists ? 'exists' : 'missing'}`));

      return statusCache;

    } catch (error) {
      console.error('❌ Erro ao validar workflows:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use validateWorkflows() para nova lógica sem campo active
   */
  async updateWorkflowNames(userId: string): Promise<void> {
    console.log('⚠️ updateWorkflowNames está deprecated, use validateWorkflows()');
    await this.validateWorkflows(userId);
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