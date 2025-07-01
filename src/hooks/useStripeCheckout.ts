import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getSupabaseToken } from '@/utils/auth';

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const getAuthToken = async (): Promise<string> => {
    const token = await getSupabaseToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }
    return token;
  };

  const createCheckoutSession = async (planType: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upgrade",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const response = await fetch('http://localhost:3002/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planType,
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing?canceled=true`
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar sessão de checkout');
      }
      
      // Redirecionar para Stripe Checkout
      if (result.data.url && result.data.url !== 'https://checkout.stripe.com/placeholder') {
        window.location.href = result.data.url;
      } else {
        toast({
          title: "Em desenvolvimento",
          description: "Integração com Stripe será implementada em breve",
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const response = await fetch('http://localhost:3002/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar portal session');
      }
      
      // Abrir portal do Stripe
      if (result.data.url && result.data.url !== 'https://billing.stripe.com/placeholder') {
        window.location.href = result.data.url;
      } else {
        toast({
          title: "Em desenvolvimento",
          description: "Portal de billing será implementado em breve",
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Erro ao abrir portal:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    createCheckoutSession,
    openCustomerPortal,
    isLoading
  };
};