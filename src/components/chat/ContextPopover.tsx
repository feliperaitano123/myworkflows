import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, Key, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useExecutions, useExecutionStatus } from '@/hooks/useExecutions';

export interface ContextItem {
  id: string;
  name: string;
  type: 'execution' | 'credential' | 'document';
  description?: string;
}

interface ContextPopoverProps {
  trigger: React.ReactNode;
  onSelectContext: (context: ContextItem) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  workflowId?: string; // Adicionado para buscar executions
}

const CONTEXT_TYPES = [
  {
    id: 'executions',
    label: 'Executions',
    icon: Play,
    description: 'Execuções recentes do workflow'
  },
  {
    id: 'credentials',
    label: 'Credentials',
    icon: Key,
    description: 'Credenciais configuradas'
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    description: 'Documentação e guias'
  }
];

// Mock data for each context type
const MOCK_EXECUTIONS: ContextItem[] = [
  { id: 'exec-1', name: 'Execução #1234 - Sucesso', type: 'execution', description: 'Executado há 2 horas' },
  { id: 'exec-2', name: 'Execução #1233 - Erro', type: 'execution', description: 'Executado há 4 horas' },
  { id: 'exec-3', name: 'Execução #1232 - Sucesso', type: 'execution', description: 'Executado ontem' },
];

const MOCK_CREDENTIALS: ContextItem[] = [
  { id: 'cred-1', name: 'Google Sheets API', type: 'credential', description: 'Configurado para leitura/escrita' },
  { id: 'cred-2', name: 'Slack Webhook', type: 'credential', description: 'Canal #general' },
  { id: 'cred-3', name: 'Postgres Database', type: 'credential', description: 'Banco de produção' },
];

const MOCK_DOCUMENTS: ContextItem[] = [
  { id: 'doc-1', name: 'Manual do Workflow', type: 'document', description: 'Documentação completa' },
  { id: 'doc-2', name: 'API Reference', type: 'document', description: 'Referência das APIs utilizadas' },
  { id: 'doc-3', name: 'Troubleshooting Guide', type: 'document', description: 'Guia de resolução de problemas' },
];

export const ContextPopover: React.FC<ContextPopoverProps> = ({
  trigger,
  onSelectContext,
  open,
  onOpenChange,
  workflowId
}) => {
  const [currentView, setCurrentView] = useState<'main' | 'executions' | 'credentials' | 'documents'>('main');
  
  // Hooks para buscar executions reais
  const { data: executions, isLoading: isLoadingExecutions, error: executionsError } = useExecutions(workflowId || '');
  const { getStatusConfig, formatDate } = useExecutionStatus();

  const getContextData = (type: string): ContextItem[] => {
    switch (type) {
      case 'executions': 
        if (!executions) return [];
        return executions.map(execution => ({
          id: execution.id,
          name: execution.name,
          type: 'execution' as const,
          description: `${getStatusConfig(execution.status).label} • ${formatDate(execution.startedAt)}`
        }));
      case 'credentials': return MOCK_CREDENTIALS;
      case 'documents': return MOCK_DOCUMENTS;
      default: return [];
    }
  };

  const getCurrentTypeInfo = () => {
    return CONTEXT_TYPES.find(t => t.id === currentView);
  };

  const handleSelectContext = (context: ContextItem) => {
    onSelectContext(context);
    onOpenChange?.(false);
    setCurrentView('main');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {currentView === 'main' ? (
          <div className="p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium">Adicionar Contexto</h4>
              <p className="text-xs text-muted-foreground">
                Selecione o tipo de contexto para adicionar
              </p>
            </div>
            <div className="space-y-2">
              {CONTEXT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setCurrentView(type.id as any)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* Header with back button */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={handleBackToMain}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h4 className="text-sm font-medium">{getCurrentTypeInfo()?.label}</h4>
                <p className="text-xs text-muted-foreground">
                  {getCurrentTypeInfo()?.description}
                </p>
              </div>
            </div>

            {/* Context items */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {currentView === 'executions' ? (
                // Renderização especial para executions com loading/error states
                <>
                  {isLoadingExecutions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Carregando executions...</span>
                      </div>
                    </div>
                  ) : executionsError ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Erro ao carregar executions</span>
                      </div>
                    </div>
                  ) : getContextData(currentView).length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center text-muted-foreground">
                        <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">Nenhuma execution encontrada</span>
                      </div>
                    </div>
                  ) : (
                    getContextData(currentView).map((item) => {
                      // Para executions, buscar dados originais para obter status
                      const execution = executions?.find(e => e.id === item.id);
                      const statusConfig = execution ? getStatusConfig(execution.status) : null;
                      
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-2 text-left"
                          onClick={() => handleSelectContext(item)}
                        >
                          <div className="flex items-start gap-2 w-full">
                            {statusConfig ? (
                              <span className="text-xs mt-1 flex-shrink-0">{statusConfig.icon}</span>
                            ) : (
                              <CheckCircle2 className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })
                  )}
                </>
              ) : (
                // Renderização normal para outros tipos de contexto
                getContextData(currentView).map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 text-left"
                    onClick={() => handleSelectContext(item)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <CheckCircle2 className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};