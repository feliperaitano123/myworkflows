# Como Testar o Agente de IA

## Passos para Teste

1. **Abrir 2 terminais**

**Terminal 1 - Servidor:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## O que Verificar

### No Terminal do Servidor:
```
🚀 AI Agent WebSocket Server running on port 3001
🔑 Token extraído: Presente/Ausente
🔍 Validating JWT token...
✅ Token válido para usuário: user-id
✅ User user-id connected with session session_xyz
```

### No Frontend:
- Página de login funciona
- Consegue acessar um workflow
- Chat mostra "Conectado ao agente de IA" 
- Consegue enviar mensagens
- Recebe respostas do agente

## Debugging

Se ainda der erro "Token inválido":

1. **Verificar se o usuário está logado:**
   - Abrir Developer Tools (F12)
   - Console → executar: `localStorage.getItem('sb-knalxzxpfajwcjnbvfhe-auth-token')`
   - Deve retornar um objeto com access_token

2. **Verificar se o Supabase está funcionando:**
   - Testar login/logout no frontend
   - Verificar se consegue ver workflows

3. **Logs do servidor:**
   - Verificar mensagens de erro específicas
   - Ver se token está sendo extraído corretamente

## Solução Rápida

Se ainda não funcionar, implementar bypass temporário para desenvolvimento:

```typescript
// Em server/src/auth/jwt.ts - APENAS PARA TESTE
export async function validateJWT(token: string): Promise<string | null> {
  console.log('🔧 MODO DEBUG: Aceitando qualquer token');
  return 'debug-user-id'; // Retornar ID fixo para teste
}
```