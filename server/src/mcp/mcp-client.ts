import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

/**
 * Cliente MCP para comunicação com o servidor MCP
 * Usado pelo WebSocket server para executar tools
 */
export class MyWorkflowsMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private mcpProcess: ChildProcess | null = null;
  private isConnected = false;

  constructor() {
    this.client = new Client(
      {
        name: 'myworkflows-websocket',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Conecta com o servidor MCP
   */
  async connect(): Promise<void> {
    try {
      console.log('🔗 Inicializando MCP Client Local...');
      
      // Para esta versão, vamos simular MCP localmente usando o n8n client diretamente
      // Isso nos permite testar o fluxo completo sem complexidade de transporte
      this.isConnected = true;
      
      console.log('✅ MCP Client Local conectado com sucesso!');
      console.log('🔧 Ferramentas MCP disponíveis: getWorkflow');
      
    } catch (error) {
      console.error('❌ Erro ao conectar MCP Client:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Executa uma ferramenta MCP
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('MCP Client não está conectado');
    }

    try {
      console.log(`🔧 MCP: Executando tool '${name}' com args:`, JSON.stringify(args, null, 2));
      console.log(`📋 MCP: WorkflowId recebido: ${args.workflowId}`);
      console.log(`👤 MCP: UserId recebido: ${args.userId}`);
      
      // Simular MCP localmente usando n8n client diretamente
      if (name === 'getWorkflow') {
        const { getN8nClient } = await import('../n8n/n8n-client.js');
        const n8nClient = getN8nClient();
        
        console.log(`🌐 MCP: Fazendo chamada real para n8n API...`);
        const workflowData = await n8nClient.getWorkflow(args.workflowId, args.userId);
        
        console.log(`✅ MCP: Dados do workflow obtidos com sucesso!`);
        console.log(`📊 MCP: Workflow '${workflowData.systemName}' tem ${workflowData.nodes?.length || 0} nodes`);
        
        // Formatar resposta no formato MCP
        const summary = this.formatWorkflowSummary(workflowData);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Workflow obtido com sucesso da API n8n!\n\n${summary}\n\n📋 JSON completo:\n${JSON.stringify(workflowData, null, 2)}`,
            },
          ],
        };
      }
      
      throw new Error(`Tool '${name}' não implementada`);

    } catch (error) {
      console.error(`❌ MCP: Erro ao executar tool '${name}':`, error);
      throw error;
    }
  }

  /**
   * Formata um resumo legível do workflow (copiado do mcp-server)
   */
  private formatWorkflowSummary(workflow: any): string {
    const nodeCount = workflow.nodes?.length || 0;
    const activeStatus = workflow.active ? '🟢 Ativo' : '🔴 Inativo';
    
    let summary = `📋 **${workflow.name || workflow.systemName}**\n`;
    summary += `Status: ${activeStatus}\n`;
    summary += `Nodes: ${nodeCount}\n`;
    summary += `ID Sistema: ${workflow.systemId}\n`;
    summary += `ID n8n: ${workflow.n8nId}\n`;
    summary += `Conexão: ${workflow.connectionName}\n`;
    summary += `Atualizado: ${workflow.updatedAt || workflow.fetchedAt}\n`;

    if (workflow.nodes && workflow.nodes.length > 0) {
      summary += `\n🔧 **Nodes do Workflow:**\n`;
      workflow.nodes.forEach((node: any, index: number) => {
        const nodeType = node.type?.replace('n8n-nodes-base.', '') || 'Unknown';
        summary += `${index + 1}. ${node.name} (${nodeType})\n`;
      });
    }

    if (workflow.settings) {
      summary += `\n⚙️ **Configurações:**\n`;
      Object.entries(workflow.settings).forEach(([key, value]) => {
        summary += `- ${key}: ${value}\n`;
      });
    }

    return summary;
  }

  /**
   * Busca detalhes de um workflow via MCP
   */
  async getWorkflow(workflowId: string, userId: string): Promise<any> {
    return await this.callTool('getWorkflow', {
      workflowId,
      userId,
    });
  }

  /**
   * Lista todas as ferramentas disponíveis
   */
  async listTools(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('MCP Client não está conectado');
    }

    // Simular resposta de listTools
    return {
      tools: [
        {
          name: 'getWorkflow',
          description: 'Busca detalhes completos de um workflow do n8n via API',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'ID do workflow no sistema MyWorkflows',
              },
              userId: {
                type: 'string', 
                description: 'ID do usuário (para segurança)',
              },
            },
            required: ['workflowId', 'userId'],
          },
        },
      ],
    };
  }

  /**
   * Desconecta do servidor MCP
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Desconectando MCP Client...');

      if (this.client && this.isConnected) {
        await this.client.close();
      }

      if (this.mcpProcess) {
        this.mcpProcess.kill();
        this.mcpProcess = null;
      }

      this.isConnected = false;
      console.log('✅ MCP Client desconectado');

    } catch (error) {
      console.error('❌ Erro ao desconectar MCP Client:', error);
    }
  }

  /**
   * Verifica se está conectado
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let mcpClientInstance: MyWorkflowsMCPClient | null = null;

/**
 * Retorna instância singleton do MCP Client
 */
export function getMCPClient(): MyWorkflowsMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MyWorkflowsMCPClient();
  }
  return mcpClientInstance;
}