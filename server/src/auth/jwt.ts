import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Usar o Supabase para validar tokens
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export async function validateJWT(token: string): Promise<string | null> {
  try {
    // Remover "Bearer " se presente
    const cleanToken = token.replace('Bearer ', '');
    
    console.log('🔍 Validating JWT token...');
    
    // Usar Supabase para validar o token
    const { data: { user }, error } = await supabase.auth.getUser(cleanToken);
    
    if (error) {
      console.error('❌ Supabase auth error:', error.message);
      return null;
    }
    
    if (user?.id) {
      console.log('✅ Token válido para usuário:', user.id);
      return user.id;
    }
    
    console.log('❌ Token válido mas sem user ID');
    return null;
    
  } catch (error) {
    console.error('❌ JWT validation error:', error);
    return null;
  }
}

export function extractTokenFromRequest(req: any): string | null {
  // Tentar header Authorization
  const authHeader = req.headers?.authorization;
  if (authHeader) {
    return authHeader.replace('Bearer ', '');
  }
  
  // Tentar query string
  const url = new URL(req.url, 'http://localhost');
  const tokenFromQuery = url.searchParams.get('token');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }
  
  return null;
}