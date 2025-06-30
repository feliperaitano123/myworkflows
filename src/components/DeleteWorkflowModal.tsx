import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workflowName: string;
  isLoading?: boolean;
}

export const DeleteWorkflowModal: React.FC<DeleteWorkflowModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  workflowName,
  isLoading = false,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Workflow</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o workflow <strong>"{workflowName}"</strong>?
            <br />
            <br />
            Esta ação irá:
            <ul className="mt-2 ml-4 space-y-1 text-sm">
              <li>• Remover o workflow da sua biblioteca</li>
              <li>• Deletar todo o histórico de conversas</li>
              <li>• Apagar execuções de ferramentas relacionadas</li>
            </ul>
            <br />
            <span className="text-destructive font-medium">
              Esta ação não pode ser desfeita.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deletando...' : 'Deletar Workflow'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};