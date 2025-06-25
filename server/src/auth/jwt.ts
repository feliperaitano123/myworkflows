import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export function validateJWT(token: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Remover "Bearer " se presente
      const cleanToken = token.replace('Bearer ', '');
      
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as JWTPayload;
      
      if (decoded.userId) {
        resolve(decoded.userId);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('JWT validation error:', error);
      resolve(null);
    }
  });
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