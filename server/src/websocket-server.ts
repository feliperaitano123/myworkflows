import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { validateJWT, extractTokenFromRequest } from './auth/jwt';
import { OpenRouterBridge } from './openrouter-bridge';
import { ChatSessionManager } from './chat/session-manager';
import { getMCPClient } from './mcp/mcp-client';

// Função auxiliar para estimar tokens de forma mais precisa
function estimateTokenCount(text: string): number {
  // Estimativa mais precisa baseada em palavras e caracteres
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  
  // Fórmula mais precisa: ~0.75 tokens por palavra + ajuste para caracteres especiais
  const wordBasedTokens = Math.ceil(words * 0.75);
  const charBasedTokens = Math.ceil(chars / 4);
  
  // Usar o maior dos dois para ser conservador
  return Math.max(wordBasedTokens, charBasedTokens);
}
import { 
  ChatMessage, 
  WSMessage, 
  UserSession, 
  WorkflowContext 
} from './types/agent';
import { 
  ChatMessageRequest, 
  ChatHistoryRequest, 
  ClearChatRequest, 
  WSChatMessage 
} from './types/chat';

export class AIWebSocketServer {
  private wss: WebSocket.Server;
  private openRouterBridge: OpenRouterBridge;
  private chatSessionManager: ChatSessionManager;
  private supabase: any;
  private activeSessions: Map<string, UserSession> = new Map();
  private mcpClient: any;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.mcpClient = getMCPClient();
    this.openRouterBridge = new OpenRouterBridge(this.mcpClient);
    this.chatSessionManager = new ChatSessionManager();
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    this.setupServer();
    this.initializeMCP();
    console.log(`🚀 AI Agent WebSocket Server running on port ${port}`);
  }

  private verifyClient(info: any): boolean {
    // Validação básica - a autenticação real é feita no connection
    return true;
  }

  private async initializeMCP(): Promise<void> {
    try {
      console.log('🔗 Inicializando MCP Client...');
      await this.mcpClient.connect();
      console.log('✅ MCP Client conectado e pronto!');
    } catch (error) {
      console.error('❌ Erro ao inicializar MCP Client:', error);
      console.warn('⚠️ Servidor funcionará sem ferramentas MCP');
    }
  }

  private setupServer(): void {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Extrair e validar token JWT
        const token = extractTokenFromRequest(req);
        console.log('🔑 Token extraído:', token ? 'Presente' : 'Ausente');
        
        if (!token) {
          console.log('❌ Fechando conexão: Token não fornecido');
          ws.close(1008, 'Token de autenticação não fornecido');
          return;
        }

        const userId = await validateJWT(token);
        if (!userId) {
          console.log('❌ Fechando conexão: Token inválido');
          ws.close(1008, 'Token de autenticação inválido');
          return;
        }

        // Criar sessão
        const sessionId = this.generateSessionId();
        const session: UserSession = {
          userId,
          sessionId,
          connectedAt: new Date(),
          userToken: token
        };

        this.activeSessions.set(sessionId, session);

        // Confirmar conexão
        const connectedMessage: WSMessage = {
          type: 'connected',
          content: 'Conectado ao agente de IA',
          sessionId
        };
        ws.send(JSON.stringify(connectedMessage));

        console.log(`✅ User ${userId} connected with session ${sessionId}`);

        // Configurar handlers de mensagens
        ws.on('message', async (data) => {
          await this.handleMessage(ws, data, session);
        });

        // Cleanup na desconexão
        ws.on('close', () => {
          this.activeSessions.delete(sessionId);
          console.log(`👋 User ${userId} disconnected from session ${sessionId}`);
        });

        // Tratamento de erros
        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${userId}:`, error);
          this.activeSessions.delete(sessionId);
        });

      } catch (error) {
        console.error('Connection setup error:', error);
        ws.close(1011, 'Erro interno do servidor');
      }
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server error:', error);
    });
  }

  private async handleMessage(
    ws: WebSocket, 
    data: WebSocket.Data, 
    session: UserSession
  ): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Backend: Mensagem recebida tipo: "${message.type}"`);
      
      if (message.type === 'chat') {
        console.log(`🎯 Modelo recebido: "${message.model || 'não especificado'}"`);
        console.log(`📦 Payload completo:`, message);
      } else if (message.type === 'get_history') {
        console.log(`📖 Backend: get_history request para workflow: ${message.workflowId}`);
      }
      
      switch (message.type) {
        case 'chat':
          await this.handleChatMessage(ws, message as ChatMessageRequest, session);
          break;
        case 'get_history':
          console.log(`🔄 Backend: Processando get_history request`);
          await this.handleGetHistory(ws, message as ChatHistoryRequest, session);
          break;
        case 'clear_chat':
          await this.handleClearChat(ws, message as ClearChatRequest, session);
          break;
        default:
          console.log(`❌ Backend: Tipo de mensagem não reconhecido: ${message.type}`);
          const errorMessage: WSChatMessage = {
            type: 'error',
            error: 'Tipo de mensagem não reconhecido',
            sessionId: session.sessionId
          };
          ws.send(JSON.stringify(errorMessage));
      }
      
    } catch (error) {
      console.error('Message handling error:', error);
      
      const errorMessage: WSChatMessage = {
        type: 'error',
        error: 'Formato de mensagem inválido',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async handleChatMessage(
    ws: WebSocket,
    message: ChatMessageRequest,
    session: UserSession
  ): Promise<void> {
    try {
      console.log(`📨 Mensagem recebida do usuário ${session.userId}: "${message.content}"`);
      console.log(`🎯 Modelo a ser usado: "${message.model || 'padrão: anthropic/claude-3-haiku'}"`);
      
      // 1. Buscar ou criar sessão de chat no banco
      let chatSessionId = session.chatSessionId;
      
      // CORREÇÃO: Verificar se mudou de workflow e forçar nova sessão
      const workflowMudou = message.workflowId && session.workflowId !== message.workflowId;
      
      console.log(`🔍 Debug sessão: workflowId atual="${session.workflowId}", novo="${message.workflowId}", chatSessionId="${chatSessionId}", workflowMudou=${workflowMudou}`);
      
      if (message.workflowId && (!chatSessionId || workflowMudou)) {
        if (workflowMudou) {
          console.log(`🔄 Workflow mudou de "${session.workflowId}" para "${message.workflowId}" - criando nova sessão`);
        } else {
          console.log(`🗃️ Criando sessão para workflow: ${message.workflowId}`);
        }
        
        chatSessionId = await this.chatSessionManager.getOrCreateSession(
          session.userId, 
          message.workflowId,
          session.userToken
        );
        
        // Atualizar session com nova sessão
        session.chatSessionId = chatSessionId;
        session.workflowId = message.workflowId;
        console.log(`✅ Sessão ${workflowMudou ? 'atualizada' : 'criada'}: ${chatSessionId}`);
      }

      // 2. Salvar mensagem do usuário no banco
      let userMessageId: string | undefined;
      if (chatSessionId) {
        // Calcular tokens de input com estimativa melhorada
        const inputTokens = estimateTokenCount(message.content);
        console.log(`🔢 Tokens INPUT calculados: ${inputTokens} (${message.content.length} caracteres, ${message.content.trim().split(/\s+/).length} palavras)`);
        
        userMessageId = await this.chatSessionManager.saveMessage(
          chatSessionId,
          'user',
          message.content,
          session.userToken,
          { 
            attachments: message.attachments,
            model: message.model || 'anthropic/claude-3-haiku',
            tokens: {
              input: inputTokens,
              output: 0,
              total: inputTokens
            },
            timestamp: new Date().toISOString()
          }
          // Não passamos messageId customizado - deixa o banco gerar UUID
        );

        // Confirmar que mensagem foi salva
        const confirmMessage: WSChatMessage = {
          type: 'message_saved',
          message: {
            id: userMessageId,
            role: 'user',
            content: message.content,
            metadata: {
              model: message.model || 'anthropic/claude-3-haiku',
              tokens: {
                input: inputTokens,
                output: 0
              }
            },
            created_at: new Date().toISOString()
          },
          sessionId: session.sessionId
        };
        ws.send(JSON.stringify(confirmMessage));
      }

      // 3. Construir prompt do sistema (genérico, sem context hardcoded)
      // ARQUITETURA MCP: Context específico agora vem via Tools dinâmicas
      const systemPrompt = `Você é um especialista em n8n workflows e automações. Seu papel é ajudar o usuário a entender, otimizar e resolver problemas em seus workflows.

Instruções:
- Seja prestativo e técnico  
- Explique conceitos de forma clara
- Sugira melhorias quando apropriado
- Foque em soluções práticas
- Use exemplos quando possível
- Se precisar de detalhes específicos de um workflow, você pode usar as ferramentas disponíveis para buscá-los

Você tem acesso a ferramentas que podem:
- Buscar detalhes completos de workflows do n8n
- Analisar configurações e estrutura dos workflows
- Acessar dados reais e atualizados dos workflows`;

      // 4. Stream resposta via OpenRouter e salvar no banco
      console.log(`🚀 Iniciando streaming de resposta...`);
      console.log(`🔧 MCP: System prompt genérico (sem context hardcoded)`);
      await this.streamAndSaveResponse(
        ws,
        message.content,
        systemPrompt,
        session,
        chatSessionId,
        message.model || 'anthropic/claude-3-haiku',
        message.workflowId
      );
      console.log(`✅ Streaming concluído!`);

    } catch (error) {
      console.error('Chat message error:', error);
      
      const errorMessage: WSChatMessage = {
        type: 'error',
        error: 'Erro ao processar mensagem do chat',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async handleGetHistory(
    ws: WebSocket,
    message: ChatHistoryRequest,
    session: UserSession
  ): Promise<void> {
    try {
      console.log(`📖 Backend: Recebendo get_history para workflow: ${message.workflowId}`);
      console.log(`👤 User: ${session.userId}`);
      console.log(`🔧 Debug: session object:`, JSON.stringify(session, null, 2));
      
      const history = await this.chatSessionManager.getWorkflowHistory(
        session.userId,
        message.workflowId,
        session.userToken,
        message.limit || 50
      );

      console.log(`📊 Backend: Histórico encontrado: ${history.length} mensagens`);

      const historyMessage: WSChatMessage = {
        type: 'history',
        history: history,
        sessionId: session.sessionId
      };

      console.log(`📤 Backend: Enviando histórico:`, JSON.stringify(historyMessage, null, 2));
      ws.send(JSON.stringify(historyMessage));
      console.log(`✅ Backend: Histórico enviado para frontend`);

    } catch (error) {
      console.error('Get history error:', error);
      
      const errorMessage: WSChatMessage = {
        type: 'error',
        error: 'Erro ao buscar histórico',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async handleClearChat(
    ws: WebSocket,
    message: ClearChatRequest,
    session: UserSession
  ): Promise<void> {
    try {
      const success = await this.chatSessionManager.clearWorkflowChat(
        session.userId,
        message.workflowId,
        session.userToken
      );

      if (success) {
        const confirmMessage: WSChatMessage = {
          type: 'complete',
          content: 'Chat limpo com sucesso',
          sessionId: session.sessionId
        };
        ws.send(JSON.stringify(confirmMessage));
      } else {
        throw new Error('Falha ao limpar chat');
      }

    } catch (error) {
      console.error('Clear chat error:', error);
      
      const errorMessage: WSChatMessage = {
        type: 'error',
        error: 'Erro ao limpar chat',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async streamAndSaveResponse(
    ws: WebSocket,
    userMessage: string,
    systemPrompt: string,
    session: UserSession,
    chatSessionId?: string,
    model: string = 'anthropic/claude-3-haiku',
    workflowId?: string
  ): Promise<void> {
    let startTime = Date.now();

    // Callback para capturar tokens e enviá-los para o cliente
    const tokenCallback = (token: string) => {
      const tokenMessage: WSChatMessage = {
        type: 'token',
        content: token,
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(tokenMessage));
    };

    try {
      // Stream resposta via OpenRouter e capturar resposta completa
      const fullResponse = await this.openRouterBridge.streamResponse(
        ws,
        userMessage,
        systemPrompt,
        session.userId,
        session.sessionId,
        tokenCallback,
        model,
        workflowId,
        chatSessionId
      );

      // Salvar resposta completa no banco
      if (chatSessionId && fullResponse) {
        const responseTime = Date.now() - startTime;
        
        // Calcular tokens de output com estimativa melhorada
        const outputTokens = estimateTokenCount(fullResponse);
        console.log(`🔢 Tokens OUTPUT calculados: ${outputTokens} (${fullResponse.length} caracteres, ${fullResponse.trim().split(/\s+/).length} palavras)`);
        console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);
        console.log(`🤖 Modelo usado: ${model}`);
        
        const assistantMessageId = await this.chatSessionManager.saveMessage(
          chatSessionId,
          'assistant',
          fullResponse,
          session.userToken,
          { 
            response_time_ms: responseTime,
            model: model,
            tokens: {
              input: 0,
              output: outputTokens,
              total: outputTokens
            },
            timestamp: new Date().toISOString()
          }
          // Deixa o banco gerar UUID automaticamente
        );

        console.log(`💾 Resposta do assistente salva: ${assistantMessageId}`);
        
        // Send message_saved for assistant message
        const assistantSavedMessage: WSChatMessage = {
          type: 'message_saved',
          message: {
            id: assistantMessageId,
            role: 'assistant',
            content: fullResponse,
            metadata: {
              model: model,
              tokens: {
                input: 0,
                output: outputTokens
              },
              response_time_ms: responseTime
            },
            created_at: new Date().toISOString()
          },
          sessionId: session.sessionId
        };
        ws.send(JSON.stringify(assistantSavedMessage));
      }

    } catch (error) {
      console.error('❌ Erro no streaming:', error);
      throw error;
    }
  }

  private async getWorkflowContext(
    workflowId: string, 
    userId: string
  ): Promise<WorkflowContext | null> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching workflow:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Workflow context error:', error);
      return null;
    }
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now();
  }

  // Método para obter estatísticas do servidor
  public getStats() {
    return {
      activeConnections: this.wss.clients.size,
      activeSessions: this.activeSessions.size,
      uptime: process.uptime()
    };
  }

  // Método para shutdown graceful
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Fechar todas as conexões
    this.wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    // Fechar servidor
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('✅ WebSocket server closed');
        resolve();
      });
    });
  }
}