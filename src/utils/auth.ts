import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém o token de acesso atual do Supabase
 * @returns O token de acesso ou null se não houver sessão
 */
export async function getSupabaseToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('Erro ao obter sessão:', error);
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Erro ao obter token Supabase:', error);
    return null;
  }
}