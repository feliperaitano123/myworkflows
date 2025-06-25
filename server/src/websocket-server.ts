import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { validateJWT, extractTokenFromRequest } from './auth/jwt';
import { OpenRouterBridge } from './openrouter-bridge';
import { ChatMessage, WSMessage, UserSession, WorkflowContext } from './types/agent';

export class AIWebSocketServer {
  private wss: WebSocket.Server;
  private openRouterBridge: OpenRouterBridge;
  private supabase: any;
  private activeSessions: Map<string, UserSession> = new Map();

  constructor(port: number) {
    this.wss = new WebSocket.Server({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.openRouterBridge = new OpenRouterBridge();
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
        if (!token) {
          ws.close(1008, 'Token de autenticação não fornecido');
          return;
        }

        const userId = await validateJWT(token);
        if (!userId) {
          ws.close(1008, 'Token de autenticação inválido');
          return;
        }

        // Criar sessão
        const sessionId = this.generateSessionId();
        const session: UserSession = {
          userId,
          sessionId,
          connectedAt: new Date()
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
      const message: ChatMessage = JSON.parse(data.toString());
      
      if (message.type === 'chat') {
        await this.handleChatMessage(ws, message, session);
      } else {
        const errorMessage: WSMessage = {
          type: 'error',
          error: 'Tipo de mensagem não reconhecido',
          sessionId: session.sessionId
        };
        ws.send(JSON.stringify(errorMessage));
      }
      
    } catch (error) {
      console.error('Message handling error:', error);
      
      const errorMessage: WSMessage = {
        type: 'error',
        error: 'Formato de mensagem inválido',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private async handleChatMessage(
    ws: WebSocket,
    message: ChatMessage,
    session: UserSession
  ): Promise<void> {
    try {
      // Buscar contexto do workflow se fornecido
      let workflowContext = '';
      if (message.workflowId) {
        const workflow = await this.getWorkflowContext(message.workflowId, session.userId);
        if (workflow) {
          workflowContext = `\n\nContexto do Workflow Atual:\n- Nome: ${workflow.name}\n- ID no sistema: ${workflow.id}\n- ID no n8n: ${workflow.workflow_id}\n- Descrição: ${workflow.description || 'Sem descrição'}\n- Status: ${workflow.active ? 'Ativo' : 'Inativo'}`;
        }
      }

      // Construir prompt do sistema
      const systemPrompt = `Você é um especialista em n8n workflows e automações. Seu papel é ajudar o usuário a entender, otimizar e resolver problemas em seus workflows.

Instruções:
- Seja prestativo e técnico
- Explique conceitos de forma clara
- Sugira melhorias quando apropriado
- Foque em soluções práticas
- Use exemplos quando possível${workflowContext}`;

      // Stream resposta via OpenRouter
      await this.openRouterBridge.streamResponse(
        ws,
        message.content,
        systemPrompt,
        session.userId,
        session.sessionId
      );

    } catch (error) {
      console.error('Chat message error:', error);
      
      const errorMessage: WSMessage = {
        type: 'error',
        error: 'Erro ao processar mensagem do chat',
        sessionId: session.sessionId
      };
      ws.send(JSON.stringify(errorMessage));
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