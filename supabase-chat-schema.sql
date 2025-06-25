-- ================================================
-- CHAT PERSISTENCE SCHEMA - MyWorkflows AI Agent
-- ================================================

-- 1. Sessões de chat por workflow
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  title TEXT, -- Nome da sessão (opcional, futuro)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uma sessão ativa por workflow/usuário
  UNIQUE(user_id, workflow_id)
);

-- 2. Mensagens do chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- attachments, tool_calls, tokens_used, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela para resultados de tools (Fase 3 - MCP)
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- INDEXES PARA PERFORMANCE
-- ================================================

-- Buscar sessão por usuário e workflow (muito comum)
CREATE INDEX idx_chat_sessions_user_workflow 
ON chat_sessions(user_id, workflow_id);

-- Buscar mensagens de uma sessão ordenadas por data
CREATE INDEX idx_chat_messages_session_time 
ON chat_messages(session_id, created_at);

-- Buscar mensagens por role (para análises futuras)
CREATE INDEX idx_chat_messages_role 
ON chat_messages(session_id, role);

-- Tool executions por mensagem
CREATE INDEX idx_tool_executions_message 
ON tool_executions(message_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS nas tabelas
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_sessions
-- Usuários só veem suas próprias sessões
CREATE POLICY "Users can view own chat sessions" 
  ON chat_sessions FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para chat_messages  
-- Usuários só veem mensagens de suas sessões
CREATE POLICY "Users can view own chat messages" 
  ON chat_messages FOR ALL 
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Políticas para tool_executions
-- Usuários só veem execuções de suas mensagens
CREATE POLICY "Users can view own tool executions"
  ON tool_executions FOR ALL
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- ================================================
-- TRIGGERS PARA updated_at
-- ================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTIONS ÚTEIS
-- ================================================

-- Função para limpar sessões antigas (opcional - manutenção)
CREATE OR REPLACE FUNCTION cleanup_old_chat_sessions(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_sessions 
  WHERE updated_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- INSERÇÃO DE DADOS DE TESTE (OPCIONAL)
-- ================================================

-- Descomentar para testar (substitua pelos IDs reais do seu sistema)
/*
-- Exemplo de inserção de sessão de teste
INSERT INTO chat_sessions (user_id, workflow_id, title) 
VALUES (
  'your-user-id-here', 
  'your-workflow-id-here', 
  'Teste de Chat'
);

-- Exemplo de mensagens de teste
INSERT INTO chat_messages (session_id, role, content) VALUES 
(
  (SELECT id FROM chat_sessions LIMIT 1),
  'user',
  'Olá, como posso otimizar este workflow?'
),
(
  (SELECT id FROM chat_sessions LIMIT 1),
  'assistant', 
  'Olá! Vou analisar seu workflow e sugerir melhorias...'
);
*/

-- ================================================
-- VERIFICAÇÃO FINAL
-- ================================================

-- Verificar se as tabelas foram criadas
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'tool_executions')
ORDER BY tablename;