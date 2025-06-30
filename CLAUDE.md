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
5. Conversa com o agente de IA especializado em cada workflow
6. Visualiza histórico completo de conversas por workflow
7. Acompanha uso de tokens e custos (base para cobrança)

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: React Query + React Context API
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **WebSocket Client**: Native WebSocket API
- **Animations**: Tailwind CSS transitions + CSS animations

### Backend Services
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **Real-time Chat**: WebSocket Server (Node.js)
- **AI Integration**: OpenRouter API (8 modelos especializados)
- **Tool System**: Model Context Protocol (MCP)
- **Workflow API**: n8n REST API integration

### Development Tools
- **Build Tool**: Vite with SWC
- **Linting**: ESLint
- **Type Checking**: TypeScript (relaxed mode)
- **Component Tagging**: lovable-tagger (dev only)

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
node server.js       # WebSocket server on port 3001
pm run dev          # Frontend dev server on port 8080

# Testing WebSocket
node test-websocket.js  # Test WebSocket connection and chat flow
```

## Architecture Overview

### Authentication Flow
- Supabase Auth handles user authentication
- `AuthContext` manages global auth state
- `ProtectedRoute` component guards private routes
- User data is scoped by user_id in all database queries

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
  - `name`: Workflow name
  - `description`: Optional description
  - `active`: Boolean status
  - `tags`: Text array
  - `nodes_count`: Integer
  - `created_at`, `updated_at`: Timestamps

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
- React Query for server state (useWorkflows, useConnections)
- WebSocket for real-time chat data
- Automatic cache invalidation after mutations
- Optimistic updates for better UX

#### 2. **State Management**
- **Server State**: React Query (workflows, connections)
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
│   │   ├── WorkflowChat.tsx      # Main chat container
│   │   ├── ChatMessage.tsx       # Message display
│   │   ├── ChatInput.tsx         # Input with model selector
│   │   ├── ChatWelcome.tsx       # Welcome screen
│   │   └── TypingIndicator.tsx   # AI thinking indicator
│   └── /[feature]/   # Other feature components
├── /pages/           # Route components
├── /contexts/        # Global state providers
├── /hooks/           # Custom React hooks
│   └── useChatWithPersistence-v2.ts  # WebSocket chat hook
├── /integrations/
│   └── /supabase/    # Database client and types
└── /utils/           # Helper functions
```

#### 4. **Real-time Architecture**
- **WebSocket Events**: Bidirectional communication
- **Event Types**: chat, token, message_saved, tool_call, history, connected
- **Streaming**: Token-by-token response streaming
- **Connection Management**: Auto-reconnect with cleanup
- **Smart History Loading**: Waits for 'connected' confirmation before requesting history
- **Retry Mechanism**: Auto-retry with exponential backoff (max 3 attempts)

#### 5. **Error Handling**
- Graceful fallbacks for connection failures
- Mock responses when AI service unavailable
- User-friendly error messages
- Comprehensive logging for debugging

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

#### Security Best Practices
1. **Authentication**: Verify JWT tokens on all requests
2. **Data Access**: Use RLS policies for all queries
3. **Input Validation**: Sanitize all user inputs
4. **API Keys**: Never expose keys in client code
5. **CORS**: Properly configure for production

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

#### OpenRouter Integration
- **Models**: 8 programming-focused models available
- **Streaming**: Real-time token streaming
- **Tool Calling**: Official tool_calls format
- **Cost Tracking**: Token usage for billing

#### WebSocket Server
- **Port**: 3001 (configurable via ENV)
- **Authentication**: JWT token validation
- **Events**: Comprehensive event system
- **Persistence**: Automatic message saving

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

4. **Agente de IA** (✅ Implementado Completo)
   
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
   - **Markdown & Syntax Highlighting**: Detecção automática de JSON/código
   - **Interactive UI**: Botões hover para copy/like/dislike
   - **Visual Grouping**: Agrupamento inteligente de mensagens assistant+tools
   - **Clean Layout**: Background diferenciado para mensagens do usuário
   
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

5. **Pagamentos** (❌ Não Implementado)
   - Integração com Stripe pendente
   - **Preparado**: Sistema de tracking de tokens para cobrança

### Current Limitations

#### Not Implemented
- **n8n Connection Validation**: No real-time connection health check
- **Payment System**: Stripe integration pending (tracking ready)
- **Template Library**: Workflow templates not implemented
- **File Uploads**: Supabase Storage not configured
- **Email Notifications**: No email system integrated

#### Technical Debt
- **Test Coverage**: Limited unit and integration tests
- **Error Boundaries**: Need more granular error handling
- **Performance Monitoring**: No APM tool integrated
- **Rate Limiting**: Not implemented on API calls
- **Caching Strategy**: Could optimize with Redis

#### Recent Major Improvements (2025-01)
- ✅ **Chat Input Redesign**: Layout compacto e moderno seguindo design patterns
- ✅ **Layout Architecture**: Hierarquia de altura corrigida, sem elementos fora da tela
- ✅ **Tool Status System**: Corrigido spinning infinito, ícones de status inteligentes
- ✅ **Markdown Rendering**: Syntax highlighting automático para JSON e código
- ✅ **Interactive UI**: Sistema de hover para botões de feedback
- ✅ **Visual Grouping**: Agrupamento de mensagens assistant+tools
- ✅ **Background Consistency**: Diferenciação visual entre user/assistant
- ✅ **Timezone Support**: Formatação correta para Brasil (UTC-3)

#### Known Issues (Recently Fixed)
- ✅ **Fixed**: WebSocket history loading timing issue
- ✅ **Fixed**: Message get_history not reaching server  
- ✅ **Fixed**: Chat history not displaying after page refresh
- ✅ **Fixed**: Tool calls spinning infinitely
- ✅ **Fixed**: ChatInput disappearing after history load
- ✅ **Fixed**: Background conflicts in message display
- WebSocket reconnection can be flaky on poor connections
- Large workflows (>100 nodes) may cause performance issues
- No offline support or message queueing

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

#### WebSocket Test Script
```bash
node test-websocket.js
```
Tests: auth, history, chat, tools, errors

### Deployment Architecture

#### Services Required
1. **Frontend**: Static hosting (Vercel, Netlify, etc.)
2. **WebSocket Server**: Node.js server (PM2, Docker)
3. **Database**: Supabase (managed PostgreSQL)
4. **AI Service**: OpenRouter API
5. **Workflow API**: n8n instances

#### Environment Variables
```env
# Frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Backend
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
PORT=3001
```

### Future Roadmap

#### Phase 1: Production Launch
- [ ] Implement Stripe payments
- [ ] Add connection validation
- [ ] Create onboarding flow
- [ ] Setup monitoring/alerting

#### Phase 2: Enhanced Features  
- [ ] Workflow templates library
- [ ] Collaborative workflows
- [ ] Advanced tool system
- [ ] Mobile responsive design

#### Phase 3: Scale & Optimize
- [ ] Multi-region deployment
- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] Advanced analytics