
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { ImportWorkflowModal } from './ImportWorkflowModal';
import { 
  BarChart3, 
  Settings, 
  BookOpen, 
  Cable,
  ChevronLeft,
  Bot,
  Workflow,
  Circle,
  MessageSquare,
  Plus,
  RefreshCw
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navigation = [
  {
    name: 'Dashboard 1',
    href: '/',
    icon: BarChart3,
  },
  {
    name: 'My Connections',
    href: '/connections',
    icon: Cable,
  },
  {
    name: 'Library',
    href: '/library',
    icon: BookOpen,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const { workflows, isLoading, syncWorkflowNames, isSyncing, getWorkflowStatus } = useWorkflowsContext();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleSyncWorkflows = async () => {
    try {
      console.log('🔄 Botão sync clicado, iniciando sincronização...');
      console.log('📊 Workflows antes da sync:', workflows.map(w => ({id: w.id, name: w.name, isActive: w.isActive})));
      
      await syncWorkflowNames();
      
      console.log('✅ Workflows sincronizados com sucesso');
      console.log('📊 Workflows após sync:', workflows.map(w => ({id: w.id, name: w.name, isActive: w.isActive})));
    } catch (error) {
      console.error('❌ Erro ao sincronizar workflows:', error);
    }
  };


  return (
    <div
      className={cn(
        'relative flex flex-col bg-background border-r border-border transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">My Workflows</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        {/* Main Navigation */}
        <nav className="px-3 py-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-3 h-10 text-foreground hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Workflows Section */}
        <div className="px-3 pt-6">
          <div className="flex items-center justify-between px-3 mb-3">
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Workflows
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent"
                    onClick={handleSyncWorkflows}
                    disabled={isSyncing}
                    title="Sincronizar nomes dos workflows"
                  >
                    <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent"
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
            {isCollapsed && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent justify-center"
                  onClick={handleSyncWorkflows}
                  disabled={isSyncing}
                  title="Sincronizar nomes dos workflows"
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent justify-center"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Workflows List */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <>
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="px-3 py-2">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </>
            ) : workflows.length > 0 ? (
              workflows.map((workflow) => {
                const isActive = location.pathname === `/workflow/${workflow.id}`;
                const workflowStatus = getWorkflowStatus(workflow.id);
                
                // Determinar cor baseada no status do cache
                let statusColor = 'text-gray-400'; // Padrão: cinza (não verificado)
                let statusTitle = 'Status não verificado - clique no botão sync';
                
                if (workflowStatus === 'exists') {
                  statusColor = 'text-green-500'; // Verde: existe no n8n
                  statusTitle = 'Workflow existe no n8n';
                } else if (workflowStatus === 'missing') {
                  statusColor = 'text-red-500'; // Vermelho: não existe no n8n
                  statusTitle = 'Workflow não existe no n8n';
                }
                
                return (
                  <Link key={workflow.id} to={`/workflow/${workflow.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start gap-3 h-9 text-foreground hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-accent text-accent-foreground',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Circle 
                        className={cn(
                          'h-2 w-2 flex-shrink-0 fill-current',
                          statusColor
                        )}
                        title={statusTitle}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-sm">{workflow.name}</span>
                      )}
                    </Button>
                  </Link>
                );
              })
            ) : (
              !isCollapsed && (
                <div className="px-3 py-4 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No workflows yet</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs mt-2"
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    Import Workflow
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Collapse Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            'w-full gap-3 h-10 text-foreground hover:bg-accent hover:text-accent-foreground',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
          {!isCollapsed && <span>Collapse</span>}
        </Button>
      </div>

      {/* Import Workflow Modal */}
      <ImportWorkflowModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />
    </div>
  );
};
