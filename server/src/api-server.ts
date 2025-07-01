import express from 'express';
import cors from 'cors';
import { validateJWT } from './auth/jwt';
import { getN8nClient } from './n8n/n8n-client';
import { rateLimiter } from './middleware/rateLimiter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class APIServer {
  private app: express.Application;
  private server: any;
  private n8nClient: any;

  constructor(private port: number) {
    this.app = express();
    this.n8nClient = getN8nClient();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: ['http://localhost:8080', 'http://localhost:3000'], // Frontend URLs
      credentials: true
    }));

    // JSON parser
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 API Request: ${req.method} ${req.path}`);
      next();
    });

    // Auth middleware for API routes
    this.app.use('/api', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token de autorização necessário' });
        }

        const token = authHeader.substring(7);
        const userId = await validateJWT(token);
        
        if (!userId) {
          return res.status(401).json({ error: 'Token inválido' });
        }

        // Adicionar userId ao request para uso nas rotas
        (req as any).userId = userId;
        next();
      } catch (error) {
        console.error('❌ Erro na autenticação da API:', error);
        res.status(401).json({ error: 'Erro de autenticação' });
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API Routes
    this.setupWorkflowRoutes();
    this.setupBillingRoutes();
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint não encontrado' });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Erro na API:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    });
  }

  private setupWorkflowRoutes(): void {
    // GET /api/workflows/:workflowId/executions
    this.app.get('/api/workflows/:workflowId/executions', async (req, res) => {
      try {
        const { workflowId } = req.params;
        const userId = (req as any).userId;

        console.log(`🔧 API: Buscando executions do workflow ${workflowId} para usuário ${userId}`);

        const executions = await this.n8nClient.getWorkflowExecutions(workflowId, userId);
        
        res.json({
          success: true,
          data: executions,
          count: executions.length,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao buscar executions via API:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // GET /api/workflows/:workflowId/details (para futuro uso)
    this.app.get('/api/workflows/:workflowId/details', async (req, res) => {
      try {
        const { workflowId } = req.params;
        const userId = (req as any).userId;

        console.log(`🔧 API: Buscando detalhes do workflow ${workflowId} para usuário ${userId}`);

        const workflow = await this.n8nClient.getWorkflow(workflowId, userId);
        
        res.json({
          success: true,
          data: workflow,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao buscar workflow via API:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/workflows/validate - Valida workflows e retorna status para cache
    this.app.post('/api/workflows/validate', async (req, res) => {
      try {
        const userId = (req as any).userId;

        console.log(`🔧 API: Validando workflows para usuário ${userId}`);

        const statusCache = await this.n8nClient.validateWorkflows(userId);
        
        res.json({
          success: true,
          message: 'Workflows validados com sucesso',
          data: statusCache,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao validar workflows:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/workflows/sync-names - DEPRECATED - use /validate
    this.app.post('/api/workflows/sync-names', async (req, res) => {
      try {
        const userId = (req as any).userId;

        console.log(`🔧 API: Sincronizando nomes dos workflows para usuário ${userId} (deprecated)`);

        const statusCache = await this.n8nClient.validateWorkflows(userId);
        
        res.json({
          success: true,
          message: 'Nomes dos workflows sincronizados com sucesso',
          data: statusCache,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao sincronizar nomes dos workflows:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private setupBillingRoutes(): void {
    // GET /api/usage/status - Status atual de uso do usuário
    this.app.get('/api/usage/status', async (req, res) => {
      try {
        const userId = (req as any).userId;
        console.log(`💳 API: Buscando status de uso para usuário ${userId}`);

        const usageStatus = await rateLimiter.getUserUsageStatus(userId);
        
        if (!usageStatus) {
          return res.status(404).json({
            success: false,
            error: 'Status de uso não encontrado',
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          data: usageStatus,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao buscar status de uso:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/usage/check - Verifica se usuário pode fazer uma ação
    this.app.post('/api/usage/check', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const { estimatedCredits = 1 } = req.body;

        console.log(`💳 API: Verificando limite para usuário ${userId}, créditos estimados: ${estimatedCredits}`);

        const limitCheck = await rateLimiter.checkUserLimits(userId, estimatedCredits);

        res.json({
          success: true,
          data: limitCheck,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao verificar limites:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/usage/record - Registra uso (geralmente chamado após AI processing)
    this.app.post('/api/usage/record', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const { creditsUsed, tokensUsed, metadata } = req.body;

        console.log(`💳 API: Registrando uso para usuário ${userId}, créditos: ${creditsUsed}, tokens: ${tokensUsed}`);

        await rateLimiter.recordUsage(userId, creditsUsed, tokensUsed, metadata);

        res.json({
          success: true,
          message: 'Uso registrado com sucesso',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao registrar uso:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // GET /api/billing/plans - Lista planos disponíveis
    this.app.get('/api/billing/plans', async (req, res) => {
      try {
        console.log(`💳 API: Buscando planos disponíveis`);

        // Buscar configurações dos planos do banco
        const { data: plans, error } = await supabase
          .from('plan_configs')
          .select('*')
          .eq('is_active', true)
          .order('price_cents', { ascending: true });

        if (error) {
          console.error('❌ Erro ao buscar planos:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao buscar planos',
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          data: plans,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao buscar planos:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/billing/create-checkout-session - Criar sessão de checkout Stripe
    this.app.post('/api/billing/create-checkout-session', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const { planType, successUrl, cancelUrl } = req.body;

        console.log(`💳 API: Criando checkout session para usuário ${userId}, plano: ${planType}`);

        // TODO: Implementar criação de checkout session
        // Por enquanto, retorna placeholder
        res.json({
          success: true,
          message: 'Checkout session endpoint implementado - integração Stripe pendente',
          data: {
            sessionId: 'placeholder_session_id',
            url: 'https://checkout.stripe.com/placeholder'
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao criar checkout session:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/billing/create-portal-session - Portal do cliente Stripe
    this.app.post('/api/billing/create-portal-session', async (req, res) => {
      try {
        const userId = (req as any).userId;

        console.log(`💳 API: Criando portal session para usuário ${userId}`);

        // TODO: Implementar portal do cliente
        res.json({
          success: true,
          message: 'Portal session endpoint implementado - integração Stripe pendente',
          data: {
            url: 'https://billing.stripe.com/placeholder'
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erro ao criar portal session:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /api/billing/webhook - Webhook do Stripe
    this.app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        console.log(`💳 API: Webhook do Stripe recebido`);

        // TODO: Implementar processamento de webhooks
        res.json({
          received: true
        });

      } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(400).json({
          error: 'Webhook processing failed'
        });
      }
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 API Server running on port ${this.port}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Server shutdown complete');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}