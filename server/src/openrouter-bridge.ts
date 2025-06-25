import WebSocket from 'ws';
import { WSMessage } from './types/agent';
import { MyWorkflowsMCPClient } from './mcp/mcp-client';

export class OpenRouterBridge {
  private apiKey: string;
  private mcpClient: MyWorkflowsMCPClient;

  constructor(mcpClient: MyWorkflowsMCPClient) {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.mcpClient = mcpClient;
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
    workflowId?: string
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
        return await this.processOpenRouterRequestWithTools(ws, userMessage, systemPrompt, userId, sessionId, onToken, model, workflowId);
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
    model: string = 'anthropic/claude-3-haiku'
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
    workflowId?: string
  ): Promise<string> {
    console.log(`🔧 MCP: Processando mensagem com suporte a tools`);

    // 1. Criar system prompt melhorado com informações de tools
    const enhancedSystemPrompt = await this.buildEnhancedSystemPrompt(systemPrompt);
    
    // 2. Primeira interação com o agente
    let fullResponse = await this.processOpenRouterRequest(
      ws, userMessage, enhancedSystemPrompt, sessionId, onToken, model
    );

    // 3. Detectar se o agente quer usar tools
    console.log(`🔍 MCP: Analisando resposta do agente para detectar tool calls...`);
    console.log(`📝 MCP: Resposta completa: "${fullResponse.substring(0, 200)}..."`);
    
    const toolCall = this.detectToolCall(fullResponse);
    
    if (toolCall) {
      console.log(`✅ MCP: TOOL DETECTADA! Nome: '${toolCall.name}', Args:`, toolCall.args);
      
      if (this.mcpClient.connected) {
        console.log(`🔧 MCP: Cliente conectado, executando tool...`);
      
      try {
        // 4. Executar tool via MCP
        const toolResult = await this.executeTool(toolCall.name, toolCall.args, userId, workflowId);
        
        // 5. Continuar conversa com resultado da tool
        const toolResultMessage = `Resultado da ferramenta ${toolCall.name}:\n\n${toolResult}`;
        
        console.log(`🔧 MCP: Enviando resultado da tool de volta para o agente`);
        
        const finalResponse = await this.processOpenRouterRequest(
          ws, 
          `${userMessage}\n\n[TOOL_RESULT] ${toolResultMessage}`, 
          enhancedSystemPrompt, 
          sessionId, 
          onToken, 
          model
        );
        
        return finalResponse;
        
      } catch (toolError) {
        console.error(`❌ MCP: Erro ao executar tool:`, toolError);
        
        // Informar o erro ao agente
        const errorMessage = `Erro ao executar ferramenta: ${(toolError as Error).message}`;
        const errorResponse = await this.processOpenRouterRequest(
          ws,
          `${userMessage}\n\n[TOOL_ERROR] ${errorMessage}`,
          enhancedSystemPrompt,
          sessionId,
          onToken,
          model
        );
        
        return errorResponse;
      }
    } else {
      console.log(`❌ MCP: Cliente não conectado, não é possível executar tools`);
    }
    } else {
      console.log(`❌ MCP: Nenhuma tool detectada na resposta do agente`);
    }

    return fullResponse;
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
}