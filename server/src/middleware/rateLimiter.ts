import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remainingCredits?: number;
  resetAt?: Date;
  upgradeUrl?: string;
}

export class RateLimiter {
  async checkUserLimits(userId: string, estimatedCredits: number = 1): Promise<RateLimitResult> {
    try {
      // Busca perfil e uso do usuário
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        console.error('❌ Erro ao buscar perfil do usuário:', profileError);
        return { allowed: false, reason: 'user_not_found' };
      }

      const { data: usage, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usageError || !usage) {
        console.error('❌ Erro ao buscar uso do usuário:', usageError);
        return { allowed: false, reason: 'usage_not_found' };
      }

      const { data: planConfig, error: planError } = await supabase
        .from('plan_configs')
        .select('config')
        .eq('plan_type', profile.plan_type)
        .single();

      if (planError || !planConfig) {
        console.error('❌ Erro ao buscar configuração do plano:', planError);
        return { allowed: false, reason: 'plan_config_not_found' };
      }

      const config = planConfig.config;

      if (profile.plan_type === 'free') {
        // Verifica limite diário
        const needsReset = !usage.daily_reset_at || new Date() > new Date(usage.daily_reset_at);
        
        if (needsReset) {
          // Reset automático será feito quando usar
          return { 
            allowed: true, 
            remainingCredits: config.credits.amount,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
          };
        }
        
        const remaining = config.credits.amount - usage.daily_interactions;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: 'daily_limit_reached',
            remainingCredits: 0,
            resetAt: new Date(usage.daily_reset_at),
            upgradeUrl: '/settings/billing'
          };
        }
        
        return { 
          allowed: true, 
          remainingCredits: remaining,
          resetAt: new Date(usage.daily_reset_at)
        };

      } else {
        // Pro: verifica créditos
        const remaining = usage.monthly_credits_limit - usage.monthly_credits_used;
        
        if (remaining < estimatedCredits) {
          return {
            allowed: false,
            reason: 'insufficient_credits',
            remainingCredits: remaining,
            resetAt: new Date(usage.credits_reset_at || Date.now() + 30 * 24 * 60 * 60 * 1000)
          };
        }
        
        return { 
          allowed: true, 
          remainingCredits: remaining,
          resetAt: new Date(usage.credits_reset_at || Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
      }

    } catch (error) {
      console.error('❌ Erro no rate limiter:', error);
      return { allowed: false, reason: 'internal_error' };
    }
  }
  
  async recordUsage(
    userId: string,
    creditsUsed: number,
    tokensUsed: number,
    metadata: any
  ): Promise<void> {
    try {
      // Registra uso usando a function do banco
      const { error: incrementError } = await supabase
        .rpc('increment_user_usage', {
          p_user_id: userId,
          p_credits_used: creditsUsed,
          p_tokens_used: tokensUsed
        });

      if (incrementError) {
        console.error('❌ Erro ao incrementar uso:', incrementError);
        return;
      }

      // Log detalhado
      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          action_type: metadata.action_type || 'chat_interaction',
          model_used: metadata.model_used,
          workflow_id: metadata.workflow_id,
          session_id: metadata.session_id,
          message_id: metadata.message_id,
          input_tokens: metadata.input_tokens || tokensUsed,
          output_tokens: metadata.output_tokens || 0,
          credits_used: creditsUsed,
          metadata: metadata
        });

      if (logError) {
        console.error('❌ Erro ao registrar log de uso:', logError);
      }

    } catch (error) {
      console.error('❌ Erro ao registrar uso:', error);
    }
  }

  async getUserUsageStatus(userId: string): Promise<any> {
    try {
      // Buscar usage e profile separadamente
      const { data: usage, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usageError) {
        console.error('❌ Erro ao buscar status de uso:', usageError);
        return null;
      }

      // Buscar profile separadamente
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        return usage; // Retorna usage mesmo sem profile
      }

      // Combinar os dados
      return {
        ...usage,
        plan_type: profile?.plan_type || 'free'
      };
    } catch (error) {
      console.error('❌ Erro ao buscar status de uso:', error);
      return null;
    }
  }
}

export const rateLimiter = new RateLimiter();