
import React, { useState } from 'react';
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

interface ImportWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (connectionId: string, workflowId: string) => void;
}

export const ImportWorkflowModal: React.FC<ImportWorkflowModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const { data: connections, isLoading: connectionsLoading } = useConnections();

  const handleImport = () => {
    if (selectedConnection && selectedWorkflow) {
      onImport(selectedConnection, selectedWorkflow);
      setSelectedConnection('');
      setSelectedWorkflow('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedConnection('');
    setSelectedWorkflow('');
    onOpenChange(false);
  };

  // Mock workflows for now - will be replaced with real N8N API call later
  const mockWorkflows = [
    { id: 'wf-1', name: 'Email Campaign Automation' },
    { id: 'wf-2', name: 'Data Processing Pipeline' },
    { id: 'wf-3', name: 'Customer Onboarding Flow' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Workflow</DialogTitle>
          <DialogDescription>
            Select a connection and workflow to import into your workspace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="connection">Connection</Label>
            <Select 
              value={selectedConnection} 
              onValueChange={setSelectedConnection}
              disabled={connectionsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {connections?.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="workflow">Workflow</Label>
            <Select 
              value={selectedWorkflow} 
              onValueChange={setSelectedWorkflow}
              disabled={!selectedConnection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {mockWorkflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!selectedConnection || !selectedWorkflow}
          >
            Import Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
