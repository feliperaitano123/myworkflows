import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useConnections } from '@/hooks/useConnections';
import { useN8nWorkflows, type N8nWorkflow } from '@/hooks/useN8nWorkflows';
import { useAlert } from '@/components/AlertProvider';
import { Loader2, AlertTriangle, CheckCircle2, Workflow } from 'lucide-react';

interface ImportWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportWorkflowModal: React.FC<ImportWorkflowModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [fetchError, setFetchError] = useState<string>('');

  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { fetchWorkflows, importWorkflow, isFetchingWorkflows, isImportingWorkflow } = useN8nWorkflows();
  const { showAlert } = useAlert();

  // Buscar workflows quando conexão é selecionada
  useEffect(() => {
    if (selectedConnection && open) {
      setWorkflows([]);
      setSelectedWorkflow('');
      setFetchError('');

      fetchWorkflows.mutate(selectedConnection, {
        onSuccess: (response) => {
          if (response.success) {
            setWorkflows(response.workflows);
            if (response.workflows.length === 0) {
              setFetchError('Nenhum workflow encontrado nesta conexão');
            }
          } else {
            setFetchError(response.message || 'Erro ao buscar workflows');
          }
        },
        onError: (error) => {
          console.error('Error fetching workflows:', error);
          setFetchError('Erro ao conectar com o n8n. Verifique se a conexão está válida.');
        }
      });
    }
  }, [selectedConnection, open, fetchWorkflows]);

  const handleImport = async () => {
    if (!selectedConnection || !selectedWorkflow) return;

    try {
      await importWorkflow.mutateAsync({
        connectionId: selectedConnection,
        workflowId: selectedWorkflow
      });

      const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);
      
      showAlert({
        type: 'success',
        title: 'Workflow Importado',
        message: `"${selectedWorkflowData?.name}" foi importado com sucesso!`
      });

      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      showAlert({
        type: 'error',
        title: 'Erro na Importação',
        message: error instanceof Error ? error.message : 'Falha ao importar workflow'
      });
    }
  };

  const handleClose = () => {
    setSelectedConnection('');
    setSelectedWorkflow('');
    setWorkflows([]);
    setFetchError('');
    onOpenChange(false);
  };

  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setSelectedWorkflow('');
    setWorkflows([]);
    setFetchError('');
  };

  const activeConnections = connections?.filter(conn => conn.active) || [];
  const isLoading = connectionsLoading || isFetchingWorkflows || isImportingWorkflow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Import Workflow
          </DialogTitle>
          <DialogDescription>
            Select a connection and workflow to import into your workspace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="connection">Connection</Label>
            <Select 
              value={selectedConnection} 
              onValueChange={handleConnectionChange}
              disabled={connectionsLoading || isImportingWorkflow}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {activeConnections.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No active connections found
                  </div>
                ) : (
                  activeConnections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>{connection.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="workflow">Workflow</Label>
            <Select 
              value={selectedWorkflow} 
              onValueChange={setSelectedWorkflow}
              disabled={!selectedConnection || isFetchingWorkflows || isImportingWorkflow}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedConnection 
                    ? "Select a connection first" 
                    : isFetchingWorkflows 
                    ? "Loading workflows..." 
                    : "Select a workflow"
                } />
              </SelectTrigger>
              <SelectContent>
                {isFetchingWorkflows ? (
                  <div className="p-2 flex items-center gap-2 text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading workflows...
                  </div>
                ) : fetchError ? (
                  <div className="p-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    {fetchError}
                  </div>
                ) : workflows.length === 0 && selectedConnection ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No workflows found
                  </div>
                ) : (
                  workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${workflow.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span>{workflow.name}</span>
                        {workflow.active && (
                          <span className="text-xs text-green-600 ml-auto">Active</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {selectedConnection && !isFetchingWorkflows && workflows.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Found {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImportingWorkflow}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!selectedConnection || !selectedWorkflow || isLoading}
          >
            {isImportingWorkflow ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Workflow'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};