import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Settings, Copy, Check } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';

interface ChatHeaderProps {
  workflowName: string;
  workflowId?: string;
  onClearChat: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error?: string | null;
  messageCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  workflowName,
  workflowId,
  onClearChat,
  isConnected,
  isConnecting,
  error,
  messageCount
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyWorkflowId = async () => {
    if (!workflowId) return;
    
    try {
      await navigator.clipboard.writeText(workflowId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar ID do workflow:', err);
    }
  };
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between p-4">
        {/* Left side - Workflow info */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Chat com IA</h2>
            <p className="text-sm text-muted-foreground">
              Workflow: {workflowName}
            </p>
            {workflowId && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">ID: {workflowId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyWorkflowId}
                  className="h-5 w-5 p-0 hover:bg-muted"
                  title="Copiar Workflow ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
          <ConnectionStatus 
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={error}
          />
        </div>
        
        {/* Right side - Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearChat}
            disabled={messageCount === 0}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
};