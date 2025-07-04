import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserUsage {
  id: string;
  user_id: string;
  daily_interactions: number;
  daily_reset_at: string | null;
  monthly_credits_used: number;
  monthly_credits_limit: number;
  credits_reset_at: string | null;
  total_interactions: number;
  total_tokens_used: number;
  user_profiles: {
    plan_type: 'free' | 'pro';
  };
}

interface RateLimitStatus {
  canSend: boolean;
  remaining: number;
  isLastMessage?: boolean;
  isLowCredits?: boolean;
  resetAt?: Date;
}

export const useRateLimit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: limits, isLoading, error } = useQuery<UserUsage>({
    queryKey: ['rate-limits', user?.id],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('http://localhost:3002/api/usage/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage status');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage status');
      }

      return result.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
    staleTime: 15000, // Considera dados frescos por 15s
  });

  const checkCanSendMessage = useCallback((): RateLimitStatus => {
    if (!limits) {
      return { canSend: true, remaining: 0 };
    }

    const profile = limits.user_profiles;
    
    if (profile.plan_type === 'free') {
      const remaining = 5 - limits.daily_interactions;
      const resetAt = limits.daily_reset_at ? new Date(limits.daily_reset_at) : undefined;
      
      return {
        canSend: remaining > 0,
        remaining,
        isLastMessage: remaining === 1,
        resetAt
      };
    } else {
      // Pro plan
      const remaining = limits.monthly_credits_limit - limits.monthly_credits_used;
      const resetAt = limits.credits_reset_at ? new Date(limits.credits_reset_at) : undefined;
      
      return {
        canSend: remaining > 0,
        remaining,
        isLowCredits: remaining < 50,
        resetAt
      };
    }
  }, [limits]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
  }, [queryClient]);

  const isPro = limits?.user_profiles?.plan_type === 'pro';

  return {
    limits,
    isLoading,
    error,
    checkCanSendMessage,
    refetch,
    isPro
  };
};