import WebSocket from 'ws';
import { WSMessage } from './types/agent';
import { MyWorkflowsMCPClient } from './mcp/mcp-client';
import { ChatSessionManager } from './chat/session-manager';

export class OpenRouterBridge {
  private apiKey: string;
  private mcpClient: MyWorkflowsMCPClient;
  private chatSessionManager: ChatSessionManager;

  constructor(mcpClient: MyWorkflowsMCPClient) {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.mcpClient = mcpClient;
    this.chatSessionManager = new ChatSessionManager();
    if (!this.apiKey) {
      console.warn('OPENROUTER_API_KEY not configured - using mock responses');
    }
  }

  async streamResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    userId: string,
    sessionId: string,
    onToken?: (token: string) => void,
    model: string = 'anthropic/claude-3-haiku',
    workflowId?: string,
    chatSessionId?: string
  ): Promise<string> {
    try {
      console.log(`🤖 OpenRouter Bridge - Processando mensagem: "${userMessage}"`);
      
      // Verificar se OpenRouter está configurado
      if (!this.apiKey) {
        console.log(`⚠️ OPENROUTER_API_KEY não configurada - usando resposta mock`);
        return await this.sendMockResponse(ws, userMessage, sessionId, onToken);
      }

      console.log(`🔑 Usando OpenRouter com chave: ${this.apiKey.substring(0, 20)}...`);
      
      // Tentar OpenRouter real
      try {
        return await this.processOpenRouterRequestWithTools(ws, userMessage, systemPrompt, userId, sessionId, onToken, model, workflowId, chatSessionId);
      } catch (error) {
        console.log(`❌ OpenRouter falhou:`, (error as Error).message);
        console.log(`🔄 Usando mock como fallback`);
        return await this.sendMockResponse(ws, userMessage, sessionId, onToken);
      }

    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      
      const errorMessage: WSMessage = {
        type: 'error',
        error: 'Erro ao processar resposta do agente. Tente novamente.',
        sessionId
      };
      
      ws.send(JSON.stringify(errorMessage));
      return '';
    }
  }

  private async processOpenRouterRequest(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    sessionId: string,
    onToken?: (token: string) => void,
    model: string = 'anthropic/claude-3-haiku',
    chatHistory: Array<{role: string, content: string}> = []
  ): Promise<string> {
    console.log(`🔑 Enviando para OpenRouter com modelo: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://myworkflows.ai',
        'X-Title': 'MyWorkflows AI Agent'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: userMessage }
        ],
        stream: true,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 OpenRouter Error ${response.status}:`, errorText);
      
      if (response.status === 401) {
        throw new Error(`Chave de API inválida ou expirada (401)`);
      } else if (response.status === 402) {
        throw new Error(`Saldo insuficiente na conta OpenRouter (402)`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit excedido (429)`);
      } else {
        throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      }
    }

    return await this.processStreamResponse(ws, response, sessionId, onToken);
  }

  private async processOpenRouterRequestWithTools(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    userId: string,
    sessionId: string,
    onToken?: (token: string) => void,
    model: string = 'anthropic/claude-3-haiku',
    workflowId?: string,
    chatSessionId?: string
  ): Promise<string> {
    console.log(`🔧 MCP: Processando mensagem com suporte a tools`);

    // 1. Buscar histórico da conversa se disponível
    const chatHistory = await this.getChatHistory(chatSessionId, userId);
    console.log(`📚 Histórico carregado: ${chatHistory.length} mensagens`);

    // 2. Criar system prompt melhorado com informações de tools
    const enhancedSystemPrompt = await this.buildEnhancedSystemPrompt(systemPrompt);
    
    // 3. Detectar se mensagem precisa de tools ANTES de chamar OpenRouter
    const needsTool = this.detectToolNeed(userMessage);
    
    if (needsTool && this.mcpClient.connected) {
      console.log(`🔧 MCP: Detectado necessidade de tool - executando ANTES da chamada OpenRouter`);
      
      try {
        // 4. Executar tool primeiro
        const toolResult = await this.executeTool('getWorkflow', {}, userId, workflowId);
        
        // 5. Incluir resultado da tool no context da mensagem única
        const enhancedUserMessage = `${userMessage}\n\n[CONTEXT_FROM_TOOL] Dados do workflow:\n${toolResult}`;
        
        // 6. Uma única chamada OpenRouter com context completo
        const fullResponse = await this.processOpenRouterRequest(
          ws, enhancedUserMessage, enhancedSystemPrompt, sessionId, onToken, model, chatHistory
        );
        
        return fullResponse;
        
      } catch (toolError) {
        console.error(`❌ MCP: Erro ao executar tool:`, toolError);
        
        // Continuar sem tool em caso de erro
        const errorMessage = `Não foi possível acessar os dados do workflow: ${(toolError as Error).message}`;
        const enhancedUserMessage = `${userMessage}\n\n[TOOL_ERROR] ${errorMessage}`;
        
        const fullResponse = await this.processOpenRouterRequest(
          ws, enhancedUserMessage, enhancedSystemPrompt, sessionId, onToken, model, chatHistory
        );
        
        return fullResponse;
      }
    } else {
      console.log(`📝 MCP: Processamento normal sem tools`);
      
      // 7. Chamada normal com histórico
      const fullResponse = await this.processOpenRouterRequest(
        ws, userMessage, enhancedSystemPrompt, sessionId, onToken, model, chatHistory
      );
      
      return fullResponse;
    }

    // Esta seção foi removida - a lógica agora está integrada acima
  }

  private async processStreamResponse(
    ws: WebSocket,
    response: Response,
    sessionId: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              const completeMessage: WSMessage = {
                type: 'complete',
                sessionId
              };
              ws.send(JSON.stringify(completeMessage));
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                if (onToken) {
                  onToken(content);
                } else {
                  const tokenMessage: WSMessage = {
                    type: 'token',
                    content: content,
                    sessionId
                  };
                  ws.send(JSON.stringify(tokenMessage));
                }
              }
            } catch (parseError) {
              // Ignore parsing errors for invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return fullResponse;
  }

  private async sendMockResponse(
    ws: WebSocket,
    userMessage: string,
    sessionId: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    const mockResponse = `Olá! Sou o agente de IA do MyWorkflows. Você disse: "${userMessage}". Esta é uma resposta simulada pois a chave da OpenRouter não está configurada. Configure OPENROUTER_API_KEY no arquivo .env para usar o agente real.`;
    
    // Simular streaming de tokens
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      const token = word + ' ';
      
      if (onToken) {
        onToken(token);
      } else {
        const tokenMessage: WSMessage = {
          type: 'token',
          content: token,
          sessionId
        };
        ws.send(JSON.stringify(tokenMessage));
      }
      
      // Pequeno delay para simular streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Enviar mensagem de conclusão
    const completeMessage: WSMessage = {
      type: 'complete',
      sessionId
    };
    
    console.log('🏁 Enviando mensagem de conclusão:', completeMessage);
    ws.send(JSON.stringify(completeMessage));
    console.log('✅ Mensagem de conclusão enviada!');
    
    return mockResponse;
  }

  /**
   * Constrói system prompt melhorado com informações sobre tools disponíveis
   */
  private async buildEnhancedSystemPrompt(basePrompt: string): Promise<string> {
    let enhancedPrompt = basePrompt;

    // Se MCP está conectado, adicionar informações sobre tools
    if (this.mcpClient.connected) {
      try {
        const toolsInfo = await this.mcpClient.listTools();
        const tools = toolsInfo.tools || [];

        if (tools.length > 0) {
          enhancedPrompt += `\n\n🔧 FERRAMENTAS DISPONÍVEIS:\n`;
          enhancedPrompt += `Você tem acesso às seguintes ferramentas. Use-as quando precisar de informações específicas:\n\n`;

          for (const tool of tools) {
            enhancedPrompt += `- **${tool.name}**: ${tool.description}\n`;
            if (tool.inputSchema?.properties) {
              const params = Object.keys(tool.inputSchema.properties);
              enhancedPrompt += `  Parâmetros: ${params.join(', ')}\n`;
            }
          }

          enhancedPrompt += `\n📋 INSTRUÇÕES PARA USO DE FERRAMENTAS:\n`;
          enhancedPrompt += `- Para usar uma ferramenta, responda com: [TOOL:nome_ferramenta] {"param": "valor"}\n`;
          enhancedPrompt += `- Exemplo: [TOOL:getWorkflow] {"workflowId": "123", "userId": "456"}\n`;
          enhancedPrompt += `- Use ferramentas quando o usuário pedir informações específicas sobre workflows\n`;
          enhancedPrompt += `- Sempre explique o que você vai buscar antes de usar a ferramenta\n`;
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível listar tools MCP:', (error as Error).message);
      }
    }

    return enhancedPrompt;
  }

  /**
   * Detecta se o agente quer usar uma tool baseado na resposta
   */
  private detectToolCall(response: string): { name: string; args: any } | null {
    console.log(`🔍 Tool Detection: Procurando patterns na resposta...`);
    
    // Padrão principal: [TOOL:nome_ferramenta] {"param": "valor"}
    const toolPattern = /\[TOOL:(\w+)\]\s*(\{[^}]*\})/;
    const match = response.match(toolPattern);

    if (match) {
      console.log(`✅ Tool Detection: Pattern encontrado! Tool: ${match[1]}, Args: ${match[2]}`);
      const toolName = match[1];
      try {
        const args = JSON.parse(match[2]);
        console.log(`✅ Tool Detection: Args parseados com sucesso:`, args);
        return { name: toolName, args };
      } catch (parseError) {
        console.error('❌ Tool Detection: Erro ao parsear argumentos da tool:', parseError);
        return null;
      }
    }

    // Padrão alternativo: detectar palavras-chave que indicam necessidade de workflow
    const needsWorkflowKeywords = [
      'buscar workflow',
      'detalhes do workflow', 
      'informações do workflow',
      'dados do workflow',
      'configuração do workflow',
      'estrutura do workflow',
      'nodes do workflow',
      'como está configurado'
    ];

    const responseStr = response.toLowerCase();
    const needsWorkflow = needsWorkflowKeywords.some(keyword => responseStr.includes(keyword));

    if (needsWorkflow && responseStr.includes('workflow')) {
      console.log(`🤖 Tool Detection: Agente precisa de dados do workflow - forçando getWorkflow`);
      return { 
        name: 'getWorkflow', 
        args: {} // args serão preenchidos na executeTool com workflowId da sessão
      };
    }

    console.log(`❌ Tool Detection: Nenhum pattern detectado`);
    return null;
  }

  /**
   * Executa uma tool via MCP
   */
  private async executeTool(toolName: string, args: any, userId: string, workflowId?: string): Promise<string> {
    console.log(`🔧 MCP Bridge: Executando tool '${toolName}'`);
    console.log(`📋 MCP Bridge: WorkflowId da sessão: ${workflowId || 'não disponível'}`);
    console.log(`👤 MCP Bridge: UserId: ${userId}`);

    // SEMPRE usar o workflowId da sessão para a tool getWorkflow
    if (toolName === 'getWorkflow') {
      if (!workflowId) {
        throw new Error('WorkflowId da sessão é obrigatório para a tool getWorkflow');
      }
      
      // Forçar uso do workflowId da sessão (ignorar qualquer ID que o agente tenha mencionado)
      args = {
        workflowId: workflowId,
        userId: userId
      };
      
      console.log(`🎯 MCP Bridge: Forçando workflowId da sessão: ${workflowId}`);
    } else {
      // Para outras tools, usar comportamento normal
      if (!args.userId) {
        args.userId = userId;
      }
      
      if (workflowId && !args.workflowId) {
        args.workflowId = workflowId;
      }
    }

    try {
      const result = await this.mcpClient.callTool(toolName, args);
      
      // Extrair conteúdo da resposta MCP
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((item: any) => item.text || JSON.stringify(item))
          .join('\n');
      }
      
      return JSON.stringify(result, null, 2);
      
    } catch (error) {
      console.error(`❌ MCP: Erro ao executar tool '${toolName}':`, error);
      throw error;
    }
  }

  /**
   * Busca histórico de chat para incluir contexto na conversa
   */
  private async getChatHistory(chatSessionId?: string, userId?: string): Promise<Array<{role: string, content: string}>> {
    if (!chatSessionId || !userId) {
      console.log('📭 Sem chatSessionId ou userId - sem histórico');
      return [];
    }

    try {
      const messages = await this.chatSessionManager.getSessionHistory(chatSessionId, '');
      
      // Converter para formato OpenRouter (últimas 10 mensagens para evitar context muito grande)
      const history = messages
        .slice(-10) // Últimas 10 mensagens
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log(`📚 Histórico formatado: ${history.length} mensagens`);
      return history;

    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Detecta se a mensagem do usuário precisa de informações do workflow
   */
  private detectToolNeed(userMessage: string): boolean {
    const needsWorkflowKeywords = [
      'workflow',
      'nodos',
      'nodes',
      'configuração',
      'configurado',
      'como está',
      'detalhes',
      'informações',
      'dados',
      'estrutura',
      'webhook',
      'trigger',
      'conexões',
      'variáveis',
      'credenciais'
    ];

    const messageStr = userMessage.toLowerCase();
    const needsWorkflow = needsWorkflowKeywords.some(keyword => messageStr.includes(keyword));

    console.log(`🔍 Tool Detection: Mensagem "${userMessage.substring(0, 50)}..." ${needsWorkflow ? 'PRECISA' : 'NÃO PRECISA'} de tool`);
    
    return needsWorkflow;
  }
}