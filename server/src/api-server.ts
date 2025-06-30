import express from 'express';
import cors from 'cors';
import { validateJWT } from './auth/jwt';
import { getN8nClient } from './n8n/n8n-client';

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