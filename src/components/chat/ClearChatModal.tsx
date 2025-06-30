import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface ClearChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  messageCount: number;
}

export const ClearChatModal: React.FC<ClearChatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  messageCount
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Limpar Histórico do Chat
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja limpar todo o histórico do chat? 
            Esta ação irá remover {messageCount} {messageCount === 1 ? 'mensagem' : 'mensagens'} 
            e não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Trash2 className="w-4 h-4 mr-2" />
            Sim, Limpar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};