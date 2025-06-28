import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Settings } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { ConnectionStatus } from './ConnectionStatus';

interface ChatHeaderProps {
  workflowName: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onClearChat: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error?: string | null;
  messageCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  workflowName,
  selectedModel,
  onModelChange,
  onClearChat,
  isConnected,
  isConnecting,
  error,
  messageCount
}) => {
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
          </div>
          <ConnectionStatus 
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={error}
          />
        </div>
        
        {/* Right side - Controls */}
        <div className="flex items-center gap-3">
          <ModelSelector
            value={selectedModel}
            onChange={onModelChange}
          />
          
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