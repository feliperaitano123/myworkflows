# Plano: Persistência de Chat por Workflow

## 🎯 Objetivo
Implementar sistema de chat persistente onde cada workflow mantém seu próprio histórico de conversas.

## 📋 Fases de Implementação

### FASE A: Database Schema (URGENTE)
**Duração**: 1-2 horas

#### A.1 Criar Tabelas no Supabase
- [ ] `chat_sessions` - Uma sessão por workflow/usuário
- [ ] `chat_messages` - Mensagens do chat (user/assistant)
- [ ] Policies RLS para segurança

#### A.2 Atualizar Types TypeScript
- [ ] Adicionar interfaces para Chat no types.ts
- [ ] Exportar novos tipos

### FASE B: Backend - Persistência (PRIORITÁRIO)  
**Duração**: 2-3 horas

#### B.1 Sistema de Sessões por Workflow
- [ ] Modificar WebSocket server para criar/recuperar sessões por workflow
- [ ] Salvar mensagens do usuário no banco
- [ ] Salvar respostas do agente no banco

#### B.2 API de Histórico
- [ ] Endpoint para buscar mensagens de uma sessão
- [ ] Integração no WebSocket server

### FASE C: Frontend - Chat Persistente (PRIORITÁRIO)
**Duração**: 3-4 horas

#### C.1 Hook de Chat com Persistência
- [ ] Modificar `useChatMessagesWithAI` para carregar histórico
- [ ] Limpar chat apenas quando necessário
- [ ] Cache de mensagens por workflow

#### C.2 UX Melhorias
- [ ] Loading states para carregar histórico
- [ ] Indicadores de que mensagens foram salvas
- [ ] Botão "Limpar Chat" opcional

### FASE D: Otimizações (FUTURO)
**Duração**: 2-3 horas

#### D.1 Performance
- [ ] Paginação de mensagens antigas
- [ ] Cache inteligente no frontend
- [ ] Cleanup de sessões antigas

#### D.2 Features Avançadas
- [ ] Exportar chat como PDF/TXT
- [ ] Busca no histórico
- [ ] Favoritar mensagens importantes

## 🔧 Implementação Técnica

### 1. Schema SQL (Supabase)

```sql
-- Sessões de chat por workflow
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  title TEXT, -- Nome da sessão (opcional)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workflow_id) -- Uma sessão ativa por workflow/usuário
);

-- Mensagens do chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- attachments, tool_calls, tokens_used, etc
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_chat_sessions_user_workflow ON chat_sessions(user_id, workflow_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Usuários só veem suas próprias sessões
CREATE POLICY "Users can view own chat sessions" 
  ON chat_sessions FOR ALL 
  USING (auth.uid() = user_id);

-- Usuários só veem mensagens de suas sessões
CREATE POLICY "Users can view own chat messages" 
  ON chat_messages FOR ALL 
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );
```

### 2. Backend Changes

```typescript
// server/src/chat/session-manager.ts
class ChatSessionManager {
  async getOrCreateSession(userId: string, workflowId: string): Promise<string> {
    // Buscar sessão existente ou criar nova
    const { data: session } = await supabase
      .from('chat_sessions')
      .upsert({
        user_id: userId,
        workflow_id: workflowId,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    return session.id;
  }

  async saveMessage(sessionId: string, role: string, content: string, metadata?: any) {
    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        metadata: metadata || {}
      });
  }

  async getSessionHistory(sessionId: string, limit = 50) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);
      
    return data || [];
  }
}
```

### 3. Frontend Changes

```typescript
// src/hooks/useChatWithPersistence.ts
export const useChatWithPersistence = (workflowId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // Carregar histórico quando workflowId muda
  useEffect(() => {
    if (workflowId) {
      loadChatHistory(workflowId);
    }
  }, [workflowId]);

  const loadChatHistory = async (workflowId: string) => {
    setIsLoadingHistory(true);
    // Buscar mensagens do banco via API
    const history = await fetchChatHistory(workflowId);
    setMessages(history);
    setIsLoadingHistory(false);
  };

  const sendMessage = async (content: string) => {
    // Adicionar à UI imediatamente
    const userMessage = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    
    // Enviar para agente (que salvará no banco)
    await sendToAgent(content, workflowId);
  };

  return { messages, isLoadingHistory, sendMessage, clearChat };
};
```

## 📈 Benefícios Imediatos

1. **✅ Chat persistente por workflow** - Histórico mantido entre sessões
2. **✅ UX profissional** - Como ChatGPT, Claude, etc.
3. **✅ Base para Fase 2** - Preparado para MCP Tools
4. **✅ Escalabilidade** - Sistema robusto para crescimento

## 🚀 Próximos Passos Recomendados

**Ordem de prioridade:**
1. **AGORA**: Implementar FASE A (Database Schema)
2. **DEPOIS**: FASE B (Backend Persistência) 
3. **EM SEGUIDA**: FASE C (Frontend Chat Persistente)
4. **PARALELO**: Começar Fase 2 do feature-agent.md (MCP Tools)

**Estimativa total**: 6-9 horas para ter chat persistente completo.

Quer que comecemos pela FASE A (Database Schema)?