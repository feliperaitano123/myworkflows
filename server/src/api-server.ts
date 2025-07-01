import express from 'express';
import cors from 'cors';
import { validateJWT } from './auth/jwt';
import { getN8nClient } from './n8n/n8n-client';
import { rateLimiter } from './middleware/rateLimiter';
import { createClient } from '@supabase/supabase-js';
import { setupStaticServer } from './static-server';
import StripeService from './stripe/stripe-service';

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
    // CORS configuration for production and development
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://myworkflows.railway.app']
      : ['http://localhost:8080', 'http://localhost:3000'];
      
    this.app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));

    // JSON parser (except for webhooks)
    this.app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 API Request: ${req.method} ${req.path}`);
      next();
    });

    // Auth middleware for API routes (skip webhooks)
    this.app.use('/api', async (req, res, next) => {
      // Skip authentication for Stripe webhooks
      if (req.path === '/billing/webhook') {
        console.log('🎣 Bypassing auth for webhook:', req.path);
        return next();
      }

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

        // Buscar configuração do plano
        const { data: planConfig } = await supabase
          .from('plan_configs')
          .select('stripe_price_id')
          .eq('plan_type', planType)
          .single();

        if (!planConfig?.stripe_price_id) {
          return res.status(400).json({
            success: false,
            error: `Plano ${planType} não encontrado ou sem price_id configurado`,
            timestamp: new Date().toISOString()
          });
        }

        // Buscar dados do usuário
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Buscar email do usuário
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser.user?.email;

        if (!userEmail) {
          return res.status(400).json({
            success: false,
            error: 'Email do usuário não encontrado',
            timestamp: new Date().toISOString()
          });
        }

        // Criar ou buscar customer no Stripe
        const customer = await StripeService.createOrGetCustomer({
          email: userEmail,
          name: authUser.user?.user_metadata?.name,
          userId: userId
        });

        // Criar checkout session
        const session = await StripeService.createCheckoutSession({
          priceId: planConfig.stripe_price_id,
          customerId: customer.id,
          successUrl: successUrl || `${process.env.FRONTEND_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/settings`,
          metadata: {
            userId: userId,
            planType: planType
          }
        });

        // Salvar customer_id no perfil se não existir
        if (!userProfile?.stripe_customer_id) {
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              stripe_customer_id: customer.id,
              plan_type: userProfile?.plan_type || 'free'
            });
        }

        res.json({
          success: true,
          data: {
            sessionId: session.id,
            url: session.url
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
        const { returnUrl } = req.body;

        console.log(`💳 API: Criando portal session para usuário ${userId}`);

        // Buscar dados do usuário
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .single();

        if (!userProfile?.stripe_customer_id) {
          return res.status(400).json({
            success: false,
            error: 'Usuário não possui customer_id no Stripe. Faça um checkout primeiro.',
            timestamp: new Date().toISOString()
          });
        }

        // Criar portal session
        const session = await StripeService.createPortalSession({
          customerId: userProfile.stripe_customer_id,
          returnUrl: returnUrl || `${process.env.FRONTEND_URL}/settings`
        });

        res.json({
          success: true,
          data: {
            url: session.url
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
    this.app.post('/api/billing/webhook', async (req, res) => {
      try {
        const signature = req.headers['stripe-signature'] as string;
        const body = req.body as Buffer;

        console.log(`💳 API: Webhook do Stripe recebido`);

        // Verificar e processar evento
        const event = await StripeService.processWebhookEvent(body, signature);
        
        console.log(`🎯 Webhook event type: ${event.type}`);

        // Processar diferentes tipos de eventos
        switch (event.type) {
          case 'checkout.session.completed':
            await this.handleCheckoutCompleted(event.data.object as any);
            break;
            
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            await this.handleSubscriptionUpdated(event.data.object as any);
            break;
            
          case 'customer.subscription.deleted':
            await this.handleSubscriptionCanceled(event.data.object as any);
            break;
            
          case 'invoice.payment_succeeded':
            await this.handlePaymentSucceeded(event.data.object as any);
            break;
            
          case 'invoice.payment_failed':
            await this.handlePaymentFailed(event.data.object as any);
            break;
            
          default:
            console.log(`🤷 Webhook event não processado: ${event.type}`);
        }

        res.json({ received: true });

      } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(400).json({
          error: 'Webhook processing failed'
        });
      }
    });
  }

  // Webhook handlers
  private async handleCheckoutCompleted(session: any) {
    const sessionId = session.id;
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;
    
    try {
      console.log(`✅ [WEBHOOK] Checkout completed for session: ${sessionId}`);
      console.log(`📋 [WEBHOOK] Session data:`, {
        sessionId,
        userId,
        planType,
        customer: session.customer,
        subscription: session.subscription,
        amount_total: session.amount_total,
        payment_status: session.payment_status
      });
      
      // Validação de dados obrigatórios
      if (!userId) {
        console.error(`❌ [WEBHOOK] userId não encontrado no metadata do checkout ${sessionId}`);
        throw new Error('userId missing in session metadata');
      }

      if (!planType) {
        console.error(`❌ [WEBHOOK] planType não encontrado no metadata do checkout ${sessionId}`);
        throw new Error('planType missing in session metadata');
      }

      if (!session.customer) {
        console.error(`❌ [WEBHOOK] customer não encontrado no session ${sessionId}`);
        throw new Error('customer missing in session');
      }

      // Validar se usuário existe
      console.log(`🔍 [WEBHOOK] Verificando se usuário ${userId} existe...`);
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('user_id, plan_type')
        .eq('user_id', userId)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error(`❌ [WEBHOOK] Erro ao verificar perfil do usuário ${userId}:`, profileCheckError);
        throw new Error(`Failed to check user profile: ${profileCheckError.message}`);
      }

      console.log(`📊 [WEBHOOK] Perfil atual do usuário:`, existingProfile);

      // Tentar atualizar perfil com retry mechanism
      const updateData = {
        user_id: userId,
        plan_type: planType,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      };

      console.log(`💾 [WEBHOOK] Atualizando perfil do usuário com dados:`, updateData);

      let upsertSuccess = false;
      let lastError = null;
      
      // Retry mechanism: 3 tentativas
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 [WEBHOOK] Tentativa ${attempt}/3 para atualizar perfil...`);
          
          const { data: upsertResult, error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(updateData, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            })
            .select();

          if (upsertError) {
            console.error(`❌ [WEBHOOK] Erro no upsert (tentativa ${attempt}):`, upsertError);
            lastError = upsertError;
            
            if (attempt < 3) {
              console.log(`⏳ [WEBHOOK] Aguardando 2s antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            continue;
          }

          console.log(`✅ [WEBHOOK] Perfil atualizado com sucesso (tentativa ${attempt}):`, upsertResult);
          upsertSuccess = true;
          break;

        } catch (error) {
          console.error(`❌ [WEBHOOK] Erro inesperado no upsert (tentativa ${attempt}):`, error);
          lastError = error;
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!upsertSuccess) {
        console.error(`💥 [WEBHOOK] Falha em todas as tentativas de atualizar perfil para ${userId}`);
        throw new Error(`Failed to update user profile after 3 attempts: ${(lastError as any)?.message || 'Unknown error'}`);
      }

      // Registrar evento de billing
      console.log(`📝 [WEBHOOK] Registrando evento de billing...`);
      const { error: billingEventError } = await supabase
        .from('billing_events')
        .insert({
          user_id: userId,
          event_type: 'checkout.session.completed',
          stripe_event_id: sessionId,
          amount_cents: session.amount_total,
          status: 'processed',
          metadata: {
            session_id: sessionId,
            customer_id: session.customer,
            subscription_id: session.subscription,
            plan_type: planType
          }
        });

      if (billingEventError) {
        console.error(`❌ [WEBHOOK] Erro ao registrar evento de billing:`, billingEventError);
        // Não falha o processo, apenas registra o erro
      } else {
        console.log(`✅ [WEBHOOK] Evento de billing registrado com sucesso`);
      }

      // Verificar se a atualização realmente funcionou
      console.log(`🔍 [WEBHOOK] Verificando atualização final...`);
      const { data: finalProfile, error: finalCheckError } = await supabase
        .from('user_profiles')
        .select('user_id, plan_type, subscription_status, stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (finalCheckError) {
        console.error(`❌ [WEBHOOK] Erro na verificação final:`, finalCheckError);
      } else {
        console.log(`🎉 [WEBHOOK] Verificação final - Perfil atualizado:`, finalProfile);
        
        if (finalProfile.plan_type !== planType) {
          console.error(`⚠️ [WEBHOOK] INCONSISTÊNCIA: plan_type esperado '${planType}', mas encontrado '${finalProfile.plan_type}'`);
        }
      }

      console.log(`🎯 [WEBHOOK] Usuário ${userId} processado com sucesso para plano ${planType}`);

    } catch (error) {
      console.error(`💥 [WEBHOOK] Erro crítico ao processar checkout completed para session ${sessionId}:`, error);
      console.error(`📊 [WEBHOOK] Stack trace:`, error instanceof Error ? error.stack : 'No stack available');
      
      // Registrar erro no billing_events para tracking
      try {
        await supabase
          .from('billing_events')
          .insert({
            user_id: userId || 'unknown',
            event_type: 'checkout.session.completed',
            stripe_event_id: sessionId,
            amount_cents: session.amount_total || 0,
            status: 'failed',
            metadata: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              session_data: {
                sessionId,
                userId,
                planType,
                customer: session.customer
              }
            }
          });
      } catch (logError) {
        console.error(`❌ [WEBHOOK] Erro ao registrar falha no billing_events:`, logError);
      }
      
      // Re-throw para que o webhook seja marcado como failed
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    const status = subscription.status;
    
    try {
      console.log(`🔄 [WEBHOOK] Subscription updated: ${subscriptionId}`);
      console.log(`📋 [WEBHOOK] Subscription data:`, {
        subscriptionId,
        customerId,
        status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      });
      
      // Buscar usuário pelo customer_id
      console.log(`🔍 [WEBHOOK] Buscando usuário para customer: ${customerId}`);
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id, plan_type, subscription_status')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !userProfile) {
        console.error(`❌ [WEBHOOK] Usuário não encontrado para customer ${customerId}:`, userError);
        throw new Error(`User not found for customer: ${customerId}`);
      }

      console.log(`📊 [WEBHOOK] Perfil encontrado:`, userProfile);

      // Atualizar status da subscription
      console.log(`💾 [WEBHOOK] Atualizando status da subscription para: ${status}`);
      const { data: updateResult, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userProfile.user_id)
        .select();

      if (updateError) {
        console.error(`❌ [WEBHOOK] Erro ao atualizar subscription status:`, updateError);
        throw new Error(`Failed to update subscription status: ${updateError.message}`);
      }

      console.log(`✅ [WEBHOOK] Subscription status atualizado:`, updateResult);

      // Registrar evento de billing
      await supabase
        .from('billing_events')
        .insert({
          user_id: userProfile.user_id,
          event_type: 'customer.subscription.updated',
          stripe_event_id: subscriptionId,
          status: 'processed',
          metadata: {
            subscription_id: subscriptionId,
            customer_id: customerId,
            new_status: status,
            previous_status: userProfile.subscription_status
          }
        });

      console.log(`🎯 [WEBHOOK] Subscription ${subscriptionId} processada para usuário ${userProfile.user_id}: ${status}`);

    } catch (error) {
      console.error(`💥 [WEBHOOK] Erro ao processar subscription updated ${subscriptionId}:`, error);
      
      // Registrar erro
      try {
        await supabase
          .from('billing_events')
          .insert({
            user_id: 'unknown',
            event_type: 'customer.subscription.updated',
            stripe_event_id: subscriptionId,
            status: 'failed',
            metadata: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              subscription_data: { subscriptionId, customerId, status }
            }
          });
      } catch (logError) {
        console.error(`❌ [WEBHOOK] Erro ao registrar falha:`, logError);
      }
      
      throw error;
    }
  }

  private async handleSubscriptionCanceled(subscription: any) {
    try {
      console.log(`❌ Subscription canceled: ${subscription.id}`);
      
      // Buscar usuário pelo customer_id
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer)
        .single();

      if (!userProfile) {
        console.error('❌ Usuário não encontrado para customer:', subscription.customer);
        return;
      }

      // Reverter para plano free
      await supabase
        .from('user_profiles')
        .update({
          plan_type: 'free',
          subscription_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userProfile.user_id);

      console.log(`✅ Usuário ${userProfile.user_id} voltou para plano free`);
    } catch (error) {
      console.error('❌ Erro ao processar subscription canceled:', error);
    }
  }

  private async handlePaymentSucceeded(invoice: any) {
    try {
      console.log(`💰 Payment succeeded: ${invoice.id}`);
      
      // Registrar evento de pagamento
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('stripe_customer_id', invoice.customer)
        .single();

      if (userProfile) {
        await supabase
          .from('billing_events')
          .insert({
            user_id: userProfile.user_id,
            event_type: 'invoice.payment_succeeded',
            stripe_event_id: invoice.id,
            amount_cents: invoice.amount_paid
          });
      }
    } catch (error) {
      console.error('❌ Erro ao processar payment succeeded:', error);
    }
  }

  private async handlePaymentFailed(invoice: any) {
    try {
      console.log(`💸 Payment failed: ${invoice.id}`);
      
      // Registrar evento de falha de pagamento
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('stripe_customer_id', invoice.customer)
        .single();

      if (userProfile) {
        await supabase
          .from('billing_events')
          .insert({
            user_id: userProfile.user_id,
            event_type: 'invoice.payment_failed',
            stripe_event_id: invoice.id,
            amount_cents: invoice.amount_due
          });
      }
    } catch (error) {
      console.error('❌ Erro ao processar payment failed:', error);
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      // In production, serve the frontend static files
      if (process.env.NODE_ENV === 'production') {
        setupStaticServer(this.app);
      }
      
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 API Server running on port ${this.port}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        if (process.env.NODE_ENV === 'production') {
          console.log(`📂 Serving static files from dist/`);
        }
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