import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { getN8nClient } from '../n8n/n8n-client.js';

/**
 * MCP Server para MyWorkflows
 * Fornece ferramentas para interagir com workflows n8n
 */
export class MyWorkflowsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'myworkflows-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // Handler para listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    });

    // Handler para execução de ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'getWorkflow':
          return await this.handleGetWorkflow(args);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Ferramenta desconhecida: ${name}`
          );
      }
    });
  }

  private async handleGetWorkflow(args: any) {
    try {
      const { workflowId, userId } = args;

      if (!workflowId || !userId) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'workflowId e userId são obrigatórios'
        );
      }

      console.log(`🔧 MCP: Buscando workflow ${workflowId} para usuário ${userId}`);

      // Usar cliente n8n real para buscar workflow
      const n8nClient = getN8nClient();
      const workflowData = await n8nClient.getWorkflow(workflowId, userId);

      // Formatar resposta para o agente
      const summary = this.formatWorkflowSummary(workflowData);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Workflow obtido com sucesso da API n8n!\n\n${summary}\n\n📋 JSON completo:\n${JSON.stringify(workflowData, null, 2)}`,
          },
        ],
      };

    } catch (error) {
      console.error('❌ MCP Error:', error);
      
      // Retornar erro mais específico para o agente
      const errorObj = error as Error;
      let errorMessage = `Erro ao buscar workflow: ${errorObj.message}`;
      
      if (errorObj.message.includes('conexão n8n ativa')) {
        errorMessage = '🔌 Nenhuma conexão n8n ativa encontrada. O usuário precisa configurar uma conexão n8n primeiro.';
      } else if (errorObj.message.includes('API Key inválida')) {
        errorMessage = '🔑 API Key inválida ou expirada. O usuário precisa atualizar a chave de API da conexão n8n.';
      } else if (errorObj.message.includes('não encontrado no n8n')) {
        errorMessage = '📋 Workflow não encontrado no n8n. Pode ter sido deletado ou o ID está incorreto.';
      }

      throw new McpError(
        ErrorCode.InternalError,
        errorMessage
      );
    }
  }

  /**
   * Formata um resumo legível do workflow para o agente
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

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('🚨 MCP Server error:', error);
    };

    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down MCP server...');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Inicia o servidor MCP com transporte stdio
   */
  async start() {
    console.log('🚀 Starting MyWorkflows MCP Server...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Server running and ready for tool calls!');
  }

  /**
   * Para o servidor MCP
   */
  async stop() {
    console.log('🛑 Stopping MCP Server...');
    await this.server.close();
  }

  /**
   * Getter para acessar o servidor MCP (para integração com WebSocket)
   */
  get mcpServer() {
    return this.server;
  }
}

// Se executado diretamente, iniciar o servidor
if (require.main === module) {
  const server = new MyWorkflowsMCPServer();
  server.start().catch(console.error);
}