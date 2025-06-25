# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyWorkflows é um micro-SaaS que oferece um agente de IA especializado em ajudar e construir workflows para o n8n. A plataforma acelera e facilita o processo de criação de automações, além de ajudar na resolução de bugs, funcionando como um agente de IA vertical especializado em automações n8n.

### Proposta de Valor
- **Acelerar** o processo de criação de automações
- **Facilitar** a construção de workflows complexos
- **Resolver bugs** com assistência de IA especializada
- **Agente vertical** focado exclusivamente em n8n

### Fluxo do Usuário
1. Usuário se cadastra na plataforma
2. Realiza assinatura do serviço
3. Conecta suas instâncias n8n (connections)
4. Importa seus workflows existentes
5. Conversa com o agente de IA especializado em cada workflow

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: React Query + React Context API
- **Backend**: Supabase (Auth + Database)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6

## Essential Commands

```bash
# Development
npm run dev          # Start dev server on port 8080

# Build & Preview
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## Architecture Overview

### Authentication Flow
- Supabase Auth handles user authentication
- `AuthContext` manages global auth state
- `ProtectedRoute` component guards private routes
- User data is scoped by user_id in all database queries

### Database Schema (Supabase)
- **connections**: n8n server connection details (url, api_key, active status)
- **workflows**: workflow configurations linked to connections

### Key Architectural Patterns
1. **Data Fetching**: React Query with custom hooks (useWorkflows, useConnections)
2. **State Management**: 
   - Server state: React Query
   - Global state: Context API (Auth, Workflow)
   - Local state: Component useState
3. **Component Organization**:
   - `/components/ui/`: shadcn/ui components
   - `/pages/`: Route components
   - `/contexts/`: Global state providers
   - `/hooks/`: Custom React hooks
   - `/integrations/supabase/`: Database client and types

### Route Structure
```
Public:  /login, /register, /forgot-password
Private: / (dashboard), /connections, /library, /settings, /workflow/:id
```

### Development Guidelines

1. **Path Imports**: Use `@/` alias for src directory imports
2. **Components**: Follow shadcn/ui patterns when creating new components
3. **TypeScript**: Project uses relaxed TS settings (no strict null checks)
4. **Styling**: Use Tailwind classes and CSS variables for theming
5. **Forms**: Use React Hook Form with Zod schemas for validation
6. **Data Mutations**: Always invalidate React Query cache after mutations

### Integration Points
- **Supabase**: Authentication and database operations
- **n8n**: Workflow automation backend (connections stored in DB)
- **Chat Interface**: Designed to interact with n8n webhook triggers

### Features Principais

1. **Autenticação** (✅ Implementada)
   - Login, registro e recuperação de senha via Supabase
   - Proteção de rotas e gerenciamento de sessão

2. **Connections** (⚠️ Parcialmente Implementada)
   - Frontend completo para CRUD de conexões n8n
   - Falta: validação real da conexão com API n8n

3. **Importar Workflows** (⚠️ Parcialmente Implementada)
   - Modal e fluxo de importação prontos
   - Falta: integração com API n8n para listar/importar workflows reais

4. **Agente de IA** (✅ Implementado)
   - Chat em tempo real com streaming via WebSocket
   - Integração completa com OpenRouter (8 modelos Programming)
   - Persistência de histórico por workflow no Supabase
   - Sistema completo de tracking de tokens e custos
   - Seleção dinâmica de modelos (Claude, GPT-4o, Llama, DeepSeek, WizardCoder)
   - Fallback inteligente e tratamento de erros
   - Interface profissional como ChatGPT/Claude

5. **Pagamentos** (❌ Não Implementado)
   - Integração com Stripe pendente
   - **Preparado**: Sistema de tracking de tokens para cobrança

### Current Limitations
- Validação de conexão n8n não implementada
- Sistema de pagamentos não configurado (mas tracking de uso pronto)
- Biblioteca de templates não implementada
- Carregamento de histórico na primeira visualização (issue menor)

### New Capabilities (Agente de IA)
- **Real-time Chat**: Streaming de respostas em tempo real
- **Multiple Models**: 8 modelos especializados em programação
- **Token Tracking**: Input/output tokens + tempo de resposta + modelo usado
- **Cost Management**: Base completa para implementar cobrança
- **Scalable Architecture**: WebSocket + Supabase + RLS + Service Role
- **Fallback System**: Mock responses se OpenRouter falhar