# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyWorkflows é um micro-SaaS que oferece um agente de IA especializado em ajudar e construir workflows para o n8n. A plataforma acelera e facilita o processo de criação de automações, além de ajudar na resolução de bugs, funcionando como um agente de IA vertical especializado em automações n8n.

### Proposta de Valor
- **Acelerar** o processo de criação de automações
- **Facilitar** a construção de workflows complexos
- **Resolver bugs** com assistência de IA especializada
- **Agente vertical** focado exclusivamente em n8n
- **Interface profissional** similar ao ChatGPT/Claude com streaming em tempo real
- **Múltiplos modelos** de IA especializados em programação

### Fluxo do Usuário
1. Usuário se cadastra na plataforma
2. Realiza assinatura do serviço (preparado para Stripe)
3. Conecta suas instâncias n8n (connections)
4. Importa seus workflows existentes
5. **Sincroniza nomes e status** dos workflows via botão na sidebar
6. Conversa com o agente de IA especializado em cada workflow
7. **Copia workflow IDs** diretamente do chat header
8. Visualiza histórico completo de conversas por workflow
9. Acompanha uso de tokens e custos (base para cobrança)

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: React Query + React Context API
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **WebSocket Client**: Native WebSocket API
- **Animations**: Tailwind CSS transitions + CSS animations
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Markdown**: React Markdown + remark-gfm

### Backend Services
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **Real-time Chat**: WebSocket Server (Node.js, port 3001)
- **REST API Server**: Express (Node.js, port 3002)
- **AI Integration**: OpenRouter API (8 modelos especializados)
- **Tool System**: Model Context Protocol (MCP)
- **Workflow API**: n8n REST API integration (otimizada)
- **Sync Service**: Workflow names & status synchronization
- **JWT Auth**: jsonwebtoken para validação

### Development Tools
- **Build Tool**: Vite with SWC
- **Linting**: ESLint
- **Type Checking**: TypeScript (relaxed mode)
- **Component Tagging**: lovable-tagger (dev only)
- **Package Manager**: npm
- **Node Version**: 18+

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

# Backend Services (separate terminals)
cd server && npm run dev  # API Server (port 3002) + WebSocket (port 3001)
npm run dev              # Frontend dev server on port 8080

# Testing
node server/test-websocket.js  # Test WebSocket connection and chat flow

# Workflow Management
# - Use sync button in sidebar to update workflow names from n8n
# - Copy workflow IDs directly from chat header
```

## API Endpoints

### Workflow Management APIs

#### POST /api/workflows/sync-names
Sincroniza nomes e status dos workflows com a instância n8n do usuário.

```bash
curl -X POST http://localhost:3002/api/workflows/sync-names \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Nomes dos workflows sincronizados com sucesso",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET /api/workflows/:workflowId/executions
Busca execuções de um workflow específico.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "exec-123",
      "name": "Execution #123",
      "status": "success", // success | error | running | waiting
      "startedAt": "2024-01-01T12:00:00.000Z",
      "finishedAt": "2024-01-01T12:01:00.000Z",
      "mode": "manual",
      "workflowId": "workflow-456"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET /api/workflows/:workflowId/details
Busca detalhes completos de um workflow.

### MyExecutions Implementation

#### Context System Integration
- **@mentions no Chat**: Usuário digita `@` para abrir ContextPopover
- **Real-time Loading**: Hook `useExecutions` busca executions via API
- **Visual Feedback**: Ícones de status (✅❌⏳⏸️) e timestamps formatados
- **Error Handling**: Loading states, error messages, empty states
- **Smart Caching**: React Query cache com 30s stale time

#### Backend Architecture
```
Frontend → useExecutions → ExecutionsService → API Server (3002)
                            ↓
N8nAPIClient.getWorkflowExecutions() → n8n API (/api/v1/executions)
```

#### Security & Performance
- **API Key Sanitization**: Remove caracteres unicode problemáticos (U+2028, etc.)
- **Payload Optimization**: Apenas id, name, status (99% redução de dados)
- **JWT Authentication**: Todas chamadas protegidas por token
- **CORS**: Configurado para localhost:8080

### N8n API Integration

#### Otimizações Implementadas:
- **listWorkflowsBasic()**: Busca apenas id, name, active (99% menos dados)
- **excludePinnedData=true**: Remove dados pesados desnecessários
- **Batch updates**: Atualiza múltiplos workflows de uma vez
- **sanitizeApiKey()**: Remove caracteres unicode invisíveis e de controle

## Recent Updates

### Chat Validation Modal System (Latest)
- ✅ **Smart Validation Modal**: Modal elegante com design system para validação de chat
- ✅ **Multi-step Validation**: 3 etapas detalhadas (Workflow exists, WebSocket, Connection health)
- ✅ **ID Mapping Fix**: Correção crítica no mapeamento System ID → n8n ID
- ✅ **Auto-validation**: Validação automática ao abrir workflow chat
- ✅ **Error Recovery**: Botão "Tentar Novamente" com retry automático
- ✅ **Bug Reporting**: Interface visual para reportar problemas (frontend-ready)
- ✅ **Smart UX**: Modal aparece em validação/erro, fecha automaticamente no sucesso
- ✅ **UI Cleanup**: Removido banner de status antigo em favor do modal

### MyExecutions System Implementation
- ✅ **Backend APIs**: Servidor REST (porta 3002) + endpoint `/api/workflows/:id/executions`
- ✅ **N8n Integration**: `getWorkflowExecutions()` com payload otimizado (id, name, status)
- ✅ **Frontend Integration**: `useExecutions` hook + React Query cache
- ✅ **Context System**: Executions reais integradas no ContextPopover (@mentions)
- ✅ **UX Complete**: Loading states, error handling, empty states, status icons
- ✅ **API Key Fix**: Sanitização de caracteres unicode problemáticos (ByteString)

### Workflow Sync & Copy Features
- ✅ **Workflow Names Sync**: Botão na sidebar para sincronizar nomes reais do n8n
- ✅ **Copy Workflow ID**: Botão no chat header para copiar ID do workflow
- ✅ **Real Status Display**: Círculo verde/cinza baseado no status ativo do n8n
- ✅ **Optimized API**: 99% redução no tráfego de dados para sincronização
- ✅ **Loading States**: Indicadores visuais durante sincronização

### Architecture Pattern: Reusable n8n API Integration

#### Princípios
1. **Backend-First**: Todas as chamadas n8n centralizadas no backend
2. **Reusabilidade**: Endpoints podem ser chamados de múltiplos lugares
3. **Segurança**: JWT auth + sanitização de API keys
4. **Performance**: Payload mínimo, caching inteligente

#### Fluxo de Implementação
```
1. Backend: Criar método no N8nAPIClient
2. Backend: Criar endpoint REST no api-server
3. Frontend: Criar service para chamada API
4. Frontend: Criar hook React Query
5. Frontend: Integrar nos componentes
```

#### Exemplo: MyExecutions
- **Backend**: N8nAPIClient.getWorkflowExecutions()
- **API**: GET /api/workflows/:id/executions
- **Frontend**: ExecutionsService + useExecutions
- **UI**: ContextPopover com @mentions
- **Futuro**: Reutilizar em MCP tools

## Architecture Overview

### Authentication Flow
- Supabase Auth handles user authentication
- `AuthContext` manages global auth state
- `ProtectedRoute` component guards private routes
- User data is scoped by user_id in all database queries
- JWT tokens validated on all backend endpoints

### Database Schema (Supabase)

#### Core Tables
- **connections**: n8n server connection details
  - `id`: UUID primary key
  - `user_id`: FK to auth.users
  - `name`: Connection name
  - `url`: n8n instance URL
  - `api_key`: Encrypted API key
  - `active`: Boolean status
  - `created_at`: Timestamp

- **workflows**: Imported n8n workflows
  - `id`: UUID primary key
  - `user_id`: FK to auth.users
  - `connection_id`: FK to connections
  - `n8n_workflow_id`: Original n8n ID
  - `name`: Workflow name (synced)
  - `description`: Optional description
  - `active`: Boolean status (synced)
  - `tags`: Text array
  - `nodes_count`: Integer
  - `created_at`, `updated_at`: Timestamps

#### Billing & Plans Tables
- **user_profiles**: Extended user profile with billing info
  - `id`: UUID primary key
  - `user_id`: FK to auth.users
  - `plan_type`: 'free' | 'pro'
  - `stripe_customer_id`: Stripe customer reference
  - `stripe_subscription_id`: Active subscription
  - `subscription_status`: Current status
  - `created_at`, `updated_at`: Timestamps

- **user_usage**: Usage tracking and limits
  - `id`: UUID primary key
  - `user_id`: FK to auth.users
  - `daily_interactions`: Free plan usage
  - `monthly_credits_used`: Pro plan usage
  - `monthly_credits_limit`: Pro plan limit
  - `daily_reset_at`: Next reset time
  - `total_interactions`, `total_tokens_used`: Lifetime stats

- **plan_configs**: Dynamic plan configuration
  - `plan_type`: Plan identifier
  - `config`: JSONB with limits and features
  - `stripe_product_id`, `stripe_price_id`: Stripe references
  - `price_cents`: Plan price

- **usage_logs**: Detailed usage tracking
  - `user_id`: FK to auth.users
  - `action_type`: 'chat_interaction', 'tool_execution', etc
  - `model_used`: AI model identifier
  - `input_tokens`, `output_tokens`: Token usage
  - `credits_used`: Credits consumed

- **billing_events**: Stripe event tracking
  - `user_id`: FK to auth.users
  - `event_type`: Stripe event type
  - `stripe_event_id`: Stripe reference
  - `amount_cents`: Payment amount

#### Chat System Tables
- **chat_sessions**: Chat session management
  - `id`: UUID primary key
  - `user_id`: FK to auth.users
  - `workflow_id`: FK to workflows
  - `created_at`, `updated_at`: Timestamps

- **chat_messages**: Message persistence
  - `id`: UUID primary key
  - `session_id`: FK to chat_sessions
  - `role`: 'user' | 'assistant' | 'tool'
  - `content`: Message text
  - `metadata`: JSONB (tool_calls, tokens, model, etc.)
  - `created_at`: Timestamp

#### Security
- All tables protected by Row Level Security (RLS)
- Users can only access their own data
- Service role key used for backend operations

### Key Architectural Patterns

#### 1. **Data Fetching**
- React Query for server state (useWorkflows, useConnections, useExecutions)
- WebSocket for real-time chat data
- Automatic cache invalidation after mutations
- Optimistic updates for better UX
- 30s stale time for optimal performance

#### 2. **State Management**
- **Server State**: React Query (workflows, connections, executions)
- **Global State**: Context API (Auth, Workflow)
- **Chat State**: Custom hook (useChatWithPersistence)
- **Local State**: Component useState for UI
- **WebSocket State**: Connection status, streaming content

#### 3. **Component Organization**
```
/src
├── /components
│   ├── /ui/          # shadcn/ui base components
│   ├── /chat/        # Chat-specific components
│   │   ├── WorkflowChat.tsx         # Main chat container
│   │   ├── ChatMessage-v2.tsx       # Message display with tool support
│   │   ├── ChatInput-v2.tsx         # Input with model selector
│   │   ├── ChatWelcome.tsx          # Welcome screen
│   │   ├── TypingIndicator.tsx      # AI thinking indicator
│   │   ├── ChatValidationModal.tsx  # Validation status modal
│   │   ├── ClearChatModal.tsx       # Clear chat confirmation
│   │   ├── ContextPopover.tsx       # @mentions system
│   │   └── ContextTag.tsx           # Context item display
│   └── /[feature]/   # Other feature components
├── /pages/           # Route components
├── /contexts/        # Global state providers
├── /hooks/           # Custom React hooks
│   ├── useChatWithPersistence-v2.ts  # WebSocket chat hook
│   ├── useChatValidation.ts          # Chat validation with modal control
│   ├── useExecutions.ts              # Executions data hook
│   └── useWorkflowSync.ts            # Workflow sync hook
├── /services/        # API service layers
│   └── executionsService.ts  # Executions API calls
├── /integrations/
│   └── /supabase/    # Database client and types
└── /utils/           # Helper functions
```

#### 4. **Real-time Architecture**
- **WebSocket Events**: Bidirectional communication
- **Event Types**: chat, token, message_saved, tool_call, tool_result, history, connected
- **Streaming**: Token-by-token response streaming
- **Connection Management**: Auto-reconnect with cleanup
- **Smart History Loading**: Waits for 'connected' confirmation before requesting history
- **Retry Mechanism**: Auto-retry with exponential backoff (max 3 attempts)

#### 5. **Error Handling**
- Graceful fallbacks for connection failures
- Mock responses when AI service unavailable
- User-friendly error messages
- Comprehensive logging for debugging
- API key sanitization for unicode errors

### Route Structure
```
Public:  /login, /register, /forgot-password
Private: / (dashboard), /connections, /library, /settings, /workflow/:id
```

### Development Guidelines

#### Code Standards
1. **Path Imports**: Use `@/` alias for src directory imports
2. **Components**: Follow shadcn/ui patterns when creating new components
3. **TypeScript**: Project uses relaxed TS settings (no strict null checks)
4. **Styling**: Use Tailwind classes and CSS variables for theming
5. **Forms**: Use React Hook Form with Zod schemas for validation
6. **Data Mutations**: Always invalidate React Query cache after mutations

#### Chat Development
1. **WebSocket Connection**: Always check connection state before sending
2. **Message Format**: Follow OpenRouter tool_calls specification
3. **History Management**: Use WebSocket events, not direct DB queries
4. **State Updates**: Batch updates to prevent re-renders
5. **Tool Calls**: Maintain proper message flow (assistant → tool → assistant)
6. **Error Recovery**: Implement fallbacks for all external services

#### Performance Guidelines
1. **Message Limiting**: Send only last 12 messages to AI
2. **Debouncing**: Debounce rapid user inputs
3. **Memoization**: Use React.memo for expensive components
4. **Lazy Loading**: Code split routes and heavy components
5. **WebSocket Efficiency**: Single connection per session
6. **API Optimization**: Request only necessary fields

#### Security Best Practices
1. **Authentication**: Verify JWT tokens on all requests
2. **Data Access**: Use RLS policies for all queries
3. **Input Validation**: Sanitize all user inputs
4. **API Keys**: Never expose keys in client code
5. **CORS**: Properly configure for production
6. **Unicode Sanitization**: Clean API keys before use

### Integration Points

#### Supabase Integration
- **Authentication**: Email/password auth with JWT tokens
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: Not used (WebSocket server handles real-time)
- **Storage**: Prepared for file uploads (not implemented)

#### n8n Integration
- **API Connection**: REST API via stored credentials
- **Workflow Management**: Import, list, and fetch workflows
- **Dynamic Access**: Real-time workflow data for AI context
- **Security**: API keys encrypted in database
- **Sync Service**: Periodic name/status updates
- **Executions API**: Fetch workflow execution history

#### OpenRouter Integration
- **Models**: 8 programming-focused models available
- **Streaming**: Real-time token streaming
- **Tool Calling**: Official tool_calls format
- **Cost Tracking**: Token usage for billing
- **Error Handling**: Fallback to mock responses

#### WebSocket Server
- **Port**: 3001 (configurable via ENV)
- **Authentication**: JWT token validation
- **Events**: Comprehensive event system
- **Persistence**: Automatic message saving
- **MCP Integration**: Tool execution support

#### REST API Server
- **Port**: 3002 (configurable via ENV)
- **Framework**: Express with CORS
- **Authentication**: JWT middleware
- **Endpoints**: Workflows, executions, sync
- **Error Handling**: Structured responses

### Features Status

1. **Autenticação** (✅ Completa)
   - Login, registro e recuperação de senha via Supabase
   - Proteção de rotas e gerenciamento de sessão
   - JWT validation em todos os endpoints

2. **Connections** (✅ Completa)
   - CRUD completo de conexões n8n
   - Criptografia de API keys no banco
   - Sanitização de caracteres unicode em API keys
   - Validação de conexão com n8n API
   - Status visual de conexões ativas

3. **Importar Workflows** (✅ Completa)
   - Listagem de workflows da instância n8n
   - Importação com mapeamento de IDs
   - Atualização automática de metadados
   - Contagem de nodes e status
   - Pesquisa e filtros
   - Sincronização de nomes via sidebar

4. **Agente de IA** (✅ Completo)
   
   **Core Features**
   - Chat em tempo real com streaming via WebSocket
   - Integração completa com OpenRouter (8 modelos Programming)
   - Sistema MCP (Model Context Protocol) com tool getWorkflow
   - Interface profissional como ChatGPT/Claude
   
   **Arquitetura de Chat**
   - **WebSocket-based**: Toda comunicação em tempo real via WS
   - **Event-driven**: Sistema completo de eventos tipados
   - **Streaming otimizado**: Token-by-token com buffer management
   - **History via WebSocket**: Carregamento eficiente sem queries diretas
   - **Smart Connection**: Aguarda confirmação antes de solicitar histórico
   - **Robust Retry**: Sistema de retry automático para conexões instáveis
   
   **Sistema de Tools**
   - **MCP Protocol**: Implementação completa do Model Context Protocol
   - **Tool getWorkflow**: Acesso dinâmico a workflows n8n via API
   - **Detecção inteligente**: Keywords + padrões explícitos
   - **Execution flow**: assistant → tool_call → tool_result → response
   - **UI expansível**: Tool calls com resumos e status visual
   
   **Persistência e Contexto**
   - **Histórico por workflow**: Isolamento completo entre workflows
   - **Últimas 12 mensagens**: Contexto otimizado para AI
   - **Deduplicação**: Sistema robusto contra mensagens duplicadas
   - **Session management**: Uma sessão por workflow/usuário
   
   **Performance e UX**
   - **Loading states**: Indicadores visuais durante carregamento
   - **Typing indicator**: "AI is thinking/responding"
   - **Smooth animations**: Fade-in e scroll automático
   - **Welcome screen**: Sugestões interativas (Workflow/Code/Bug)
   - **Connection status**: Indicador visual verde/vermelho
   - **Auto-validation**: Validação automática de workflow ao abrir chat
   - **Validation Modal**: Modal elegante com status detalhado das verificações
   
   **Sistema de Validação Inteligente**
   - **Auto-verification**: Validação automática ao acessar workflow chat
   - **ID Mapping**: Conversão correta entre System ID e n8n ID
   - **Multi-step Validation**: 3 etapas (Workflow exists, WebSocket, Connection health)
   - **Status Modal**: Interface elegante com verificações detalhadas
   - **Error Recovery**: Botão "Tentar Novamente" com retry automático
   - **Bug Reporting**: Sistema visual para reportar problemas (frontend-ready)
   - **Smart UX**: Modal aparece durante validação e em erros, fecha automaticamente no sucesso
   
   **Modelos Disponíveis**
   - Claude 3.5 Sonnet & Haiku
   - GPT-4o & GPT-4o-mini
   - DeepSeek Coder V2
   - Llama 3.1 (70B & 405B)
   - WizardCoder 33B
   
   **Monitoramento**
   - Token tracking (input/output)
   - Response time measurement
   - Model usage statistics
   - Cost calculation base

5. **Context System** (✅ Implementado)
   - Sistema de @mentions no chat
   - MyExecutions: Lista execuções do workflow
   - Integração via REST API backend
   - React Query para cache e loading states
   - UI expansível com popover

6. **Sistema de Planos e Billing** (🚧 Em Desenvolvimento)
   - **Planos**: Free (5 interações/dia) e Pro ($20/mês, 500 créditos)
   - **Rate Limiting**: Sistema completo de controle de uso
   - **Stripe Integration**: Checkout, webhooks e customer portal
   - **Créditos Baseados em Custo Real**: Cálculo dinâmico por modelo AI
   - **UI/UX Otimizada**: Modals de upgrade e indicadores de uso
   - **Admin Tools**: Gestão de planos e ajustes de créditos
   - **Documentação**: BILLING_PLAN.md com implementação completa

### Current Limitations

#### Not Implemented
- **Template Library**: Workflow templates not implemented
- **File Uploads**: Supabase Storage not configured
- **Email Notifications**: No email system integrated
- **Credentials API**: n8n credentials management pending
- **Documents API**: Document storage/retrieval pending
- **Workflow Versioning**: No version control for workflows
- **Team Collaboration**: Single user only

#### Technical Debt
- **Test Coverage**: Limited unit and integration tests
- **Error Boundaries**: Need more granular error handling
- **Performance Monitoring**: No APM tool integrated
- **Rate Limiting**: Not implemented on API calls
- **Caching Strategy**: Could optimize with Redis
- **API Documentation**: No Swagger/OpenAPI docs
- **Logging Infrastructure**: Basic console logs only

#### Known Issues
- ✅ **Fixed**: WebSocket history loading timing issue
- ✅ **Fixed**: Message get_history not reaching server
- ✅ **Fixed**: Chat history not displaying after page refresh
- ✅ **Fixed**: ByteString error with unicode in API keys
- ✅ **Fixed**: Tool calls display in chat history
- ✅ **Fixed**: System ID vs n8n ID mapping in chat validation
- ✅ **Fixed**: Manual workflow validation requirement
- WebSocket reconnection can be flaky on poor connections
- Large workflows (>100 nodes) may cause performance issues
- No offline support or message queueing
- Token counting not 100% accurate for complex messages

### Advanced Capabilities

#### Real-time Communication
- **WebSocket Architecture**: Persistent bidirectional connection
- **Event System**: Typed events with proper handling
- **Streaming**: Character-by-character response rendering
- **Connection Management**: Auto-reconnect with exponential backoff
- **History Loading**: Smart timing with 'connected' confirmation
- **Retry System**: Auto-retry mechanism (max 3 attempts, 5s intervals)

#### AI Integration Excellence
- **8 Specialized Models**: Programming-focused LLMs
- **Smart Model Selection**: Per-message model choice
- **Context Window Management**: Automatic trimming to prevent overflow
- **Fallback System**: Mock responses during outages

#### MCP (Model Context Protocol)
- **Tool System**: Extensible tool architecture
- **getWorkflow Tool**: Dynamic workflow data access
- **Tool Detection**: Keyword and pattern matching
- **Execution Flow**: Proper assistant→tool→assistant chain

#### Production-Ready Features
- **Deployment Guides**: PM2, Docker, PaaS ready
- **Monitoring**: Prometheus metrics integration
- **Health Checks**: System status endpoints
- **Logging**: Structured logging with levels
- **Security**: JWT auth, RLS, input sanitization

#### Developer Experience
- **Hot Reload**: Full HMR support
- **Type Safety**: Complete TypeScript coverage
- **Documentation**: Inline code documentation
- **Testing Tools**: WebSocket test scripts
- **Debug Mode**: Verbose logging options

### Testing and Validation

#### E2E Test Scenarios
1. **Authentication Flow**: Login → Dashboard → Workflow
2. **Connection Management**: CRUD operations
3. **Workflow Import**: List and import from n8n
4. **Chat Features**:
   - Send/receive messages
   - Model switching
   - Tool execution
   - History loading
   - Session persistence
   - Error handling
5. **Context System**:
   - @mentions trigger
   - Executions loading
   - Selection interaction

#### WebSocket Test Script
```bash
node test-websocket.js
```
Tests: auth, history, chat, tools, errors

#### API Test Script
```bash
node test-api.js
```
Tests: executions, sync, auth

### Deployment Architecture

#### Services Required
1. **Frontend**: Static hosting (Vercel, Netlify, etc.)
2. **WebSocket Server**: Node.js server on port 3001
3. **REST API Server**: Express server on port 3002
4. **Database**: Supabase (managed PostgreSQL)
5. **AI Service**: OpenRouter API
6. **Workflow API**: n8n instances (customer-provided)
7. **Payment Processing**: Stripe (webhooks, customer portal)

#### Environment Variables
```env
# Frontend (.env)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Backend (server/.env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
OPENROUTER_API_KEY=sk-or-v1-xxx
JWT_SECRET=xxx
PORT=3001
API_PORT=3002
NODE_ENV=development

# Stripe Integration
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### Production Checklist
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS on all services
- [ ] Setup PM2 for process management
- [ ] Configure nginx reverse proxy
- [ ] Setup monitoring and alerts
- [ ] Enable Supabase RLS policies
- [ ] Configure rate limiting
- [ ] Setup backup strategy
- [ ] Configure Stripe webhooks
- [ ] Test billing flows end-to-end
- [ ] Setup plan management admin tools

### Future Roadmap

#### Phase 1: Billing System Launch (4 semanas)
- [x] Plan billing system architecture (BILLING_PLAN.md)
- [ ] Implement database schema for billing
- [ ] Create rate limiting system
- [ ] Integrate Stripe payment processing
- [ ] Build upgrade modals and UI
- [ ] Setup monitoring/alerting
- [ ] Add API documentation

#### Phase 2: Enhanced Features
- [ ] Annual billing plans (20% discount)
- [ ] Business plan ($49/mês, 1500 créditos)
- [ ] Workflow templates library
- [ ] Collaborative workflows
- [ ] Advanced tool system
- [ ] Mobile responsive design
- [ ] Credentials management
- [ ] Documents API

#### Phase 3: Scale & Optimize
- [ ] Enterprise plan (custom pricing)
- [ ] Credit add-ons marketplace
- [ ] Multi-region deployment
- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] Advanced analytics dashboard
- [ ] Team workspaces
- [ ] Workflow versioning

---

## ✅ BILLING SYSTEM IMPLEMENTATION STATUS (January 2025)

### 🎉 **FASE 1 - Database & Backend** ✅ **COMPLETE**

#### Database Schema
- ✅ **user_profiles**: Perfil de usuário com dados de billing
- ✅ **user_usage**: Controle de uso (daily/monthly limits)
- ✅ **plan_configs**: Configuração dinâmica de planos (Free/Pro)
- ✅ **usage_logs**: Log detalhado de uso com tokens e créditos
- ✅ **billing_events**: Eventos de billing do Stripe
- ✅ **credit_adjustments**: Ajustes manuais de créditos

#### Security & Functions
- ✅ **RLS Policies**: Todas as tabelas protegidas
- ✅ **handle_new_user()**: Trigger automático para criar perfil/usage
- ✅ **increment_user_usage()**: Function para incrementar uso

#### Rate Limiting System
- ✅ **RateLimiter Class**: server/src/middleware/rateLimiter.ts
- ✅ **Credit Estimation**: Baseada em custos reais do OpenRouter
- ✅ **WebSocket Integration**: Rate limiting em tempo real no chat
- ✅ **Model Cost Mapping**: 8 modelos com preços precisos

#### API Endpoints
- ✅ **GET /api/usage/status**: Status atual de uso do usuário
- ✅ **POST /api/usage/check**: Verifica se pode fazer ação
- ✅ **POST /api/usage/record**: Registra uso após AI processing
- ✅ **GET /api/billing/plans**: Lista planos disponíveis
- ✅ **POST /api/billing/create-checkout-session**: Stripe checkout (estrutura)
- ✅ **POST /api/billing/create-portal-session**: Stripe portal (estrutura)
- ✅ **POST /api/billing/webhook**: Webhooks Stripe (estrutura)

#### Stripe Integration
- ✅ **Product Created**: MyWorkflows Pro produto criado
- ✅ **Price Setup**: $20/mês (⚠️ ajustar para recorrente no Dashboard)
- ✅ **Database Integration**: IDs salvos em plan_configs

### 🎉 **FASE 2 - Frontend** ✅ **COMPLETE**

#### Core Hooks
- ✅ **useRateLimit**: src/hooks/useRateLimit.ts
  - Verifica limites em tempo real
  - Atualiza a cada 30s
  - Suporte Free (daily) e Pro (monthly credits)

- ✅ **useUserProfile**: src/hooks/useUserProfile.ts
  - Perfil do usuário com plano
  - Auto-criação via trigger

- ✅ **useFeatureAccess**: src/hooks/useFeatureAccess.ts
  - Controle de acesso a features
  - Verificação de limites (connections, workflows)

- ✅ **useStripeCheckout**: src/hooks/useStripeCheckout.ts
  - Checkout e portal do Stripe
  - Error handling com toasts

#### UI Components
- ✅ **UsageIndicator**: src/components/UsageIndicator.tsx
  - Para o header
  - Mostra créditos Pro / interações Free
  - Visual feedback (low credits, critical)

- ✅ **UpgradeModal**: src/components/UpgradeModal.tsx
  - 4 triggers: daily_limit, connection_limit, workflow_limit, feature_locked
  - Benefícios dinâmicos por trigger
  - Integração com Stripe checkout

- ✅ **FeatureGate**: src/components/FeatureGate.tsx
  - Controla acesso a features Pro
  - Overlay com ícone de lock
  - Trigger para upgrade modal

#### Enhanced Chat Experience
- ✅ **ChatInput Rate Limiting**: src/components/chat/ChatInput.tsx
  - Verificação antes de enviar
  - Visual indicators (remaining messages/credits)
  - Upgrade prompts integrados
  - Toast para última mensagem Free

#### Billing Page
- ✅ **Settings Billing Tab**: src/pages/Settings.tsx
  - Plano atual dinâmico
  - Uso do período (Progress bars)
  - Estatísticas totais
  - Comparação de planos (Free vs Pro)
  - Botões upgrade/portal integrados

### ⚠️ **PENDING - Stripe Integration**
- [ ] **Configurar preço recorrente**: No Stripe Dashboard
- [ ] **Implementar checkout real**: Substituir placeholders
- [ ] **Webhook handlers**: Processar eventos reais
- [ ] **Customer portal**: Gerenciamento de assinatura

### 🔄 **PRÓXIMOS PASSOS**
1. **Configurar Stripe recorrente** no Dashboard
2. **Implementar handlers reais** dos webhooks  
3. **Testar fluxo completo** de upgrade
4. **Adicionar UsageIndicator ao Header** principal
5. **Deploy e teste em produção**

### 📊 **ARQUITETURA DE CRÉDITOS**
```typescript
// 1 crédito = $0.01
const models = {
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 5.00, output: 15.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 }
};

// Free: 5 interações/dia
// Pro: 500 créditos/mês (~$5 de uso AI)
```

### 🎯 **FEATURES IMPLEMENTADAS**
- [x] Rate limiting inteligente baseado em custos reais
- [x] Sistema de créditos transparente  
- [x] UI/UX otimizada para conversão
- [x] Controle granular de features
- [x] Histórico e analytics de uso
- [x] Upgrade flows integrados
- [x] WebSocket rate limiting em tempo real