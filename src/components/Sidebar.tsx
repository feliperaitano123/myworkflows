
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkflowsContext } from '@/contexts/WorkflowContext';
import { useCreateWorkflow } from '@/hooks/useWorkflows';
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
  Plus
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    name: 'My Connections teste',
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
  const navigate = useNavigate();
  const { workflows, isLoading } = useWorkflowsContext();
  const createWorkflow = useCreateWorkflow();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleImportWorkflow = async (connectionId: string, workflowId: string) => {
    try {
      const newWorkflow = await createWorkflow.mutateAsync({
        workflow_id: workflowId,
        n8n_connection_id: connectionId,
        description: `Imported workflow: ${workflowId}`,
      });
      
      // Navigate to the new workflow chat page
      navigate(`/workflow/${newWorkflow.id}`);
    } catch (error) {
      console.error('Error importing workflow:', error);
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-sidebar-foreground">My Workflows</h1>
            <p className="text-xs text-sidebar-foreground/60">AI-Powered Platform</p>
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
                    'w-full justify-start gap-3 h-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
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
                  <Workflow className="h-4 w-4 text-sidebar-foreground/60" />
                  <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    Workflows
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
            {isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-sidebar-accent justify-center"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
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
                return (
                  <Link key={workflow.id} to={`/workflow/${workflow.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start gap-3 h-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Circle 
                        className={cn(
                          'h-2 w-2 flex-shrink-0 fill-current',
                          workflow.isActive ? 'text-green-500' : 'text-gray-400'
                        )}
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
                  <MessageSquare className="h-8 w-8 mx-auto text-sidebar-foreground/40 mb-2" />
                  <p className="text-xs text-sidebar-foreground/60">No workflows yet</p>
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
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            'w-full gap-3 h-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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
        onImport={handleImportWorkflow}
      />
    </div>
  );
};
