import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Se o perfil não existir, será criado automaticamente pelo trigger
        if (error.code === 'PGRST116') {
          // Aguardar um pouco e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const isPro = profile?.plan_type === 'pro';
  const isActive = profile?.subscription_status === 'active';

  return {
    profile,
    isLoading,
    error,
    isPro,
    isActive
  };
};