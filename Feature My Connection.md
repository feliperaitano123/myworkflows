# Feature My Connection - Checklist de Implementação

## 📋 Overview
Este documento detalha o passo a passo para completar a implementação da feature My Connections, incluindo a validação real das conexões n8n e segurança.

## ✅ Checklist de Implementação

### 1. Backend - Validação de Conexão n8n

#### [ ] 1.1 Criar Edge Function para validar conexão
- [ ] Criar arquivo `supabase/functions/validate-n8n-connection/index.ts`
- [ ] Implementar chamada para API do n8n (`/api/v1/workflows` como teste)
- [ ] Retornar status de sucesso/erro com mensagem apropriada
- [ ] Tratar erros de CORS, timeout e autenticação

#### [ ] 1.2 Estrutura da Edge Function
```typescript
// Receber: { n8n_url: string, n8n_api_key: string }
// Validar formato da URL
// Fazer chamada GET para {n8n_url}/api/v1/workflows
// Headers: { 'X-N8N-API-KEY': n8n_api_key }
// Retornar: { valid: boolean, message: string, error?: string }
```

#### [ ] 1.3 Deploy da Edge Function
- [ ] Testar localmente com Supabase CLI
- [ ] Deploy para produção
- [ ] Configurar permissões apropriadas

### 2. Segurança - Criptografia da API Key

#### [ ] 2.1 Modificar tabela connections
- [ ] Adicionar política RLS para garantir que apenas o owner veja suas conexões
- [ ] Considerar usar Supabase Vault para armazenar API keys (opcional)

#### [ ] 2.2 Implementar criptografia no frontend
- [ ] Antes de salvar, validar a conexão via Edge Function
- [ ] Salvar apenas se a validação for bem-sucedida

### 3. Frontend - Integração com Validação

#### [ ] 3.1 Atualizar ConnectionModal
- [ ] Adicionar estado de validação (validating, valid, invalid)
- [ ] Mostrar spinner durante validação
- [ ] Exibir mensagem de sucesso/erro apropriada

#### [ ] 3.2 Modificar fluxo de criação/edição
- [ ] Ao clicar em "Save":
  - [ ] Primeiro validar a conexão
  - [ ] Se válida, salvar no banco
  - [ ] Se inválida, mostrar erro e não salvar
- [ ] Adicionar botão "Test Connection" opcional

#### [ ] 3.3 Atualizar useConnections hook
- [ ] Adicionar função para validar conexão
- [ ] Integrar com a Edge Function

### 4. Melhorias de UX

#### [ ] 4.1 Feedback Visual
- [ ] Adicionar ícone de status na listagem (✅ válida, ❌ inválida)
- [ ] Toast notifications para sucesso/erro
- [ ] Mensagens de erro específicas (URL inválida, API key incorreta, etc)

#### [ ] 4.2 Validações de formulário
- [ ] Validar formato da URL (deve começar com http/https)
- [ ] Validar que API key não está vazia
- [ ] Adicionar placeholder com exemplo de URL

### 5. Testes e Documentação

#### [ ] 5.1 Testes manuais
- [ ] Testar com URL válida e API key válida
- [ ] Testar com URL válida e API key inválida
- [ ] Testar com URL inválida
- [ ] Testar edição de conexão existente
- [ ] Testar múltiplas conexões por usuário

#### [ ] 5.2 Atualizar documentação
- [ ] Atualizar FEATURES.md marcando itens como completos
- [ ] Documentar formato esperado da URL n8n
- [ ] Adicionar instruções para obter API key do n8n

## 🎯 Critérios de Aceitação

1. ✅ Usuário só consegue salvar conexão se ela for válida
2. ✅ API key é armazenada de forma segura
3. ✅ Feedback claro sobre status da validação
4. ✅ Sem exposição de CORS no frontend
5. ✅ Mensagens de erro específicas e úteis

## 📝 Notas Técnicas

- A validação DEVE acontecer no backend (Edge Function) para evitar CORS
- Endpoint sugerido para teste: `GET /api/v1/workflows` (lista workflows)
- Header da API n8n: `X-N8N-API-KEY: {api_key}`
- Considerar cache de validação por alguns minutos

## 🚀 Ordem de Implementação Recomendada

1. Criar e testar Edge Function
2. Integrar frontend com Edge Function
3. Adicionar feedback visual
4. Implementar segurança adicional se necessário
5. Testes completos do fluxo