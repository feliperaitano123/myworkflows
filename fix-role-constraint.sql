-- ================================================
-- FIX: Adicionar role 'tool' ao constraint de chat_messages
-- ================================================

-- Remover o constraint antigo
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;

-- Adicionar novo constraint que inclui 'tool'
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check 
  CHECK (role IN ('user', 'assistant', 'tool'));

-- Verificar o constraint atualizado
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'chat_messages_role_check';

-- Teste de inserção para validar
-- (Descomente para testar em desenvolvimento)
/*
INSERT INTO chat_messages (session_id, role, content, metadata) VALUES (
  (SELECT id FROM chat_sessions LIMIT 1),
  'tool',
  'Test tool message',
  '{"tool_call_id": "test_123", "tool_name": "getWorkflow"}'
);
*/