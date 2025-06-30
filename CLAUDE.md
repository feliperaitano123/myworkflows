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

### Backend Services
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **Real-time Chat**: WebSocket Server (Node.js)
- **AI Integration**: OpenRouter API (8 modelos especializados)
- **Tool System**: Model Context Protocol (MCP)
- **Workflow API**: n8n REST API integration (otimizada)
- **Sync Service**: Workflow names & status synchronization

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

### MyExecutions System Implementation (Latest)
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

### Architecture
- **Frontend**: useWorkflowSync hook + WorkflowContext integration
- **Backend**: N8nAPIClient.listWorkflowsBasic() + optimized endpoints
- **Database**: Auto-update workflow names and active status

[... rest of the existing content ...]