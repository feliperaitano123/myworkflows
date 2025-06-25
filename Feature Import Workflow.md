# Feature Import Workflow - Checklist de Implementação

## 📋 Overview
Este documento detalha a implementação completa da feature de Importar Workflows, incluindo integração real com a API do n8n para buscar e importar workflows.

## 🎯 Objetivo
Permitir que usuários importem workflows reais de suas instâncias n8n através do modal no sidebar, salvando os dados no banco e exibindo na lista de workflows.

## ✅ Checklist de Implementação

### 1. Backend - Buscar Workflows do n8n

#### [ ] 1.1 Criar Edge Function para listar workflows
- [ ] Criar arquivo `supabase/functions/get-n8n-workflows/index.ts`
- [ ] Implementar chamada para API do n8n `GET /api/v1/workflows`
- [ ] Retornar lista de workflows com id, name, active status
- [ ] Tratar erros de CORS, timeout e autenticação

#### [ ] 1.2 Estrutura da Edge Function
```typescript
interface RequestBody {
  n8n_url: string;
  n8n_api_key: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Response {
  success: boolean;
  workflows: N8nWorkflow[];
  message?: string;
  error?: string;
}
```

#### [ ] 1.3 Deploy da Edge Function
- [ ] Deploy para produção via Supabase
- [ ] Configurar CORS apropriados
- [ ] Testar com conexão real do n8n

### 2. Backend - Importar Workflow Específico

#### [ ] 2.1 Criar Edge Function para importar workflow
- [ ] Criar arquivo `supabase/functions/import-n8n-workflow/index.ts`
- [ ] Implementar chamada para `GET /api/v1/workflows/{id}`
- [ ] Buscar JSON completo do workflow
- [ ] Retornar dados estruturados para salvar no banco

#### [ ] 2.2 Estrutura da Edge Function de Import
```typescript
interface ImportRequestBody {
  n8n_url: string;
  n8n_api_key: string;
  workflow_id: string;
}

interface ImportResponse {
  success: boolean;
  workflow: {
    id: string;
    name: string;
    active: boolean;
    nodes: any[];
    connections: any;
    settings: any;
    staticData: any;
    tags: string[];
    meta: any;
  };
  message?: string;
  error?: string;
}
```

### 3. Frontend - Hook para Workflows do n8n

#### [ ] 3.1 Criar hook useN8nWorkflows
- [ ] Criar arquivo `src/hooks/useN8nWorkflows.ts`
- [ ] Mutation para buscar workflows de uma conexão
- [ ] Mutation para importar workflow específico
- [ ] Estados de loading e error handling

#### [ ] 3.2 Estrutura do Hook
```typescript
export const useN8nWorkflows = () => {
  const fetchWorkflows = useMutation({
    mutationFn: async (connectionId: string) => {
      // Buscar connection do banco
      // Chamar Edge Function get-n8n-workflows
      // Retornar lista de workflows
    }
  });

  const importWorkflow = useMutation({
    mutationFn: async ({ connectionId, workflowId }: { connectionId: string; workflowId: string }) => {
      // Buscar connection do banco
      // Chamar Edge Function import-n8n-workflow
      // Salvar no banco de dados (tabela workflows)
      // Invalidar cache de workflows
    }
  });
};
```

### 4. Frontend - Atualizar ImportWorkflowModal

#### [ ] 4.1 Integrar busca real de workflows
- [ ] Remover mock workflows
- [ ] Integrar com hook useN8nWorkflows
- [ ] Buscar workflows quando conexão é selecionada
- [ ] Mostrar loading durante busca

#### [ ] 4.2 Estrutura do Modal Atualizado
```typescript
// Estados adicionais
const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
const [loadingWorkflows, setLoadingWorkflows] = useState(false);

// Buscar workflows quando conexão muda
useEffect(() => {
  if (selectedConnection) {
    fetchWorkflowsFromN8n(selectedConnection);
  }
}, [selectedConnection]);
```

#### [ ] 4.3 UX melhorada no Modal
- [ ] Loading state no dropdown de workflows
- [ ] Mensagem quando não há workflows
- [ ] Indicar workflows ativos/inativos
- [ ] Feedback de erro se falha ao buscar workflows

### 5. Frontend - Processo de Importação

#### [ ] 5.1 Implementar importação completa
- [ ] Validar conexão antes de importar
- [ ] Buscar JSON completo do workflow
- [ ] Salvar dados na tabela workflows
- [ ] Feedback de sucesso/erro

#### [ ] 5.2 Dados salvos na tabela workflows
```sql
-- Campos da tabela workflows
id: uuid (PK)
user_id: uuid (FK para auth.users)
connection_id: uuid (FK para connections)
n8n_workflow_id: string (ID original do n8n)
name: string
active: boolean
workflow_data: jsonb (JSON completo do workflow)
created_at: timestamp
updated_at: timestamp
```

### 6. Frontend - Listagem no Sidebar

#### [ ] 6.1 Atualizar sidebar com workflows reais
- [ ] Buscar workflows do banco via useWorkflows hook
- [ ] Exibir nome de cada workflow importado
- [ ] Indicar conexão de origem
- [ ] Link para visualizar/editar workflow

#### [ ] 6.2 Estrutura da listagem
- [ ] Agrupar por conexão (opcional)
- [ ] Mostrar status ativo/inativo
- [ ] Ações: visualizar, excluir, sincronizar
- [ ] Empty state quando sem workflows

### 7. Banco de Dados - Atualizações

#### [ ] 7.1 Verificar/Atualizar schema da tabela workflows
- [ ] Confirmar campos necessários existem
- [ ] Adicionar índices para performance
- [ ] Configurar RLS (Row Level Security)
- [ ] Foreign keys corretas

#### [ ] 7.2 Políticas RLS
```sql
-- Usuário só vê seus próprios workflows
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (auth.uid() = user_id);

-- Usuário só pode inserir workflows para si mesmo
CREATE POLICY "Users can insert own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 8. Testes e Validações

#### [ ] 8.1 Testes de integração com n8n
- [ ] Testar com diferentes versões do n8n
- [ ] Testar com workflows complexos (muitos nodes)
- [ ] Testar com workflows sem permissão
- [ ] Testar timeout e erros de rede

#### [ ] 8.2 Testes de UX
- [ ] Fluxo completo: conectar → buscar → importar
- [ ] Casos de erro: conexão inválida, sem workflows
- [ ] Performance com muitos workflows
- [ ] Responsividade do modal

## 🎯 Critérios de Aceitação

1. ✅ Modal busca workflows reais da API n8n
2. ✅ Lista apenas workflows da conexão selecionada
3. ✅ Importa JSON completo do workflow
4. ✅ Salva corretamente na tabela workflows
5. ✅ Exibe workflows importados no sidebar
6. ✅ Trata erros de conexão/API gracefully
7. ✅ Feedback visual claro em todas as etapas

## 📝 Notas Técnicas

### API Endpoints do n8n:
- **Listar workflows**: `GET /api/v1/workflows`
- **Buscar workflow**: `GET /api/v1/workflows/{id}`
- **Header**: `X-N8N-API-KEY: {api_key}`

### Estrutura de resposta do n8n:
```json
{
  "data": [
    {
      "id": "1",
      "name": "My Workflow",
      "active": true,
      "nodes": [...],
      "connections": {...},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campos importantes para salvar:
- `n8n_workflow_id`: ID original do workflow no n8n
- `workflow_data`: JSON completo para reconstruir workflow
- `connection_id`: Referência à conexão usada
- `name`: Nome do workflow para exibição

## 🚀 Ordem de Implementação Recomendada

1. **Criar Edge Functions** (get-n8n-workflows, import-n8n-workflow)
2. **Criar hook useN8nWorkflows** 
3. **Atualizar ImportWorkflowModal** com integração real
4. **Implementar processo de importação completo**
5. **Atualizar sidebar** com workflows reais
6. **Testes e refinamentos** de UX
7. **Validações de banco** e RLS

## 💡 Melhorias Futuras (Fora do Escopo)

- Sincronização automática de workflows
- Preview do workflow antes de importar
- Importação em lote
- Filtros e busca na listagem
- Comparação de versões
- Export de workflows