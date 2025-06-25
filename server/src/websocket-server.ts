import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { validateJWT, extractTokenFromRequest } from './auth/jwt';
import { OpenRouterBridge } from './openrouter-bridge';
import { ChatSessionManager } from './chat/session-manager';
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

  constructor(port: number) {
    this.wss = new WebSocket.Server({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.openRouterBridge = new OpenRouterBridge();
    this.chatSessionManager = new ChatSessionManager();
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    this.setupServer();
    console.log(`🚀 AI Agent WebSocket Server running on port ${port}`);
  }

  private verifyClient(info: any): boolean {
    // Validação básica - a autenticação real é feita no connection
    return true;
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
      
      switch (message.type) {
        case 'chat':
          await this.handleChatMessage(ws, message as ChatMessageRequest, session);
          break;
        case 'get_history':
          await this.handleGetHistory(ws, message as ChatHistoryRequest, session);
          break;
        case 'clear_chat':
          await this.handleClearChat(ws, message as ClearChatRequest, session);
          break;
        default:
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
      
      // 1. Buscar ou criar sessão de chat no banco
      let chatSessionId = session.chatSessionId;
      if (message.workflowId && !chatSessionId) {
        console.log(`🗃️ Criando sessão para workflow: ${message.workflowId}`);
        chatSessionId = await this.chatSessionManager.getOrCreateSession(
          session.userId, 
          message.workflowId,
          session.userToken
        );
        session.chatSessionId = chatSessionId;
        session.workflowId = message.workflowId;
        console.log(`✅ Sessão criada: ${chatSessionId}`);
      }

      // 2. Salvar mensagem do usuário no banco
      let userMessageId: string | undefined;
      if (chatSessionId) {
        userMessageId = await this.chatSessionManager.saveMessage(
          chatSessionId,
          'user',
          message.content,
          session.userToken,
          { attachments: message.attachments }
        );

        // Confirmar que mensagem foi salva
        const confirmMessage: WSChatMessage = {
          type: 'message_saved',
          messageId: userMessageId,
          sessionId: session.sessionId
        };
        ws.send(JSON.stringify(confirmMessage));
      }

      // 3. Buscar contexto do workflow se fornecido
      let workflowContext = '';
      if (message.workflowId) {
        const workflow = await this.getWorkflowContext(message.workflowId, session.userId);
        if (workflow) {
          workflowContext = `\n\nContexto do Workflow Atual:\n- Nome: ${workflow.name}\n- ID no sistema: ${workflow.id}\n- ID no n8n: ${workflow.workflow_id}\n- Descrição: ${workflow.description || 'Sem descrição'}\n- Status: ${workflow.active ? 'Ativo' : 'Inativo'}`;
        }
      }

      // 4. Construir prompt do sistema
      const systemPrompt = `Você é um especialista em n8n workflows e automações. Seu papel é ajudar o usuário a entender, otimizar e resolver problemas em seus workflows.

Instruções:
- Seja prestativo e técnico
- Explique conceitos de forma clara
- Sugira melhorias quando apropriado
- Foque em soluções práticas
- Use exemplos quando possível${workflowContext}`;

      // 5. Stream resposta via OpenRouter e salvar no banco
      console.log(`🚀 Iniciando streaming de resposta...`);
      await this.streamAndSaveResponse(
        ws,
        message.content,
        systemPrompt,
        session,
        chatSessionId
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
      const history = await this.chatSessionManager.getWorkflowHistory(
        session.userId,
        message.workflowId,
        session.userToken,
        message.limit || 50
      );

      const historyMessage: WSChatMessage = {
        type: 'history',
        history: history,
        sessionId: session.sessionId
      };

      ws.send(JSON.stringify(historyMessage));

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
    chatSessionId?: string
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
        tokenCallback
      );

      // Salvar resposta completa no banco
      if (chatSessionId && fullResponse) {
        const responseTime = Date.now() - startTime;
        
        const assistantMessageId = await this.chatSessionManager.saveMessage(
          chatSessionId,
          'assistant',
          fullResponse,
          session.userToken,
          { 
            response_time_ms: responseTime,
            model: 'anthropic/claude-3-haiku' // TODO: pegar do config
          }
        );

        console.log(`💾 Resposta do assistente salva: ${assistantMessageId}`);
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