
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LucideIcon, MoreVertical, Trash2, Trash } from 'lucide-react';
import { EditableTitle } from '@/components/EditableTitle';
import { ChatStatusIcon } from '@/components/ChatStatusIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'destructive';
  };
  editable?: {
    onSave: (newTitle: string) => void;
    isLoading?: boolean;
  };
  // Props para workflow settings
  workflowSettings?: {
    onClearChat: () => void;
    onDeleteWorkflow: () => void;
  };
  // Props para status do chat
  chatStatus?: {
    color: 'green' | 'red' | 'yellow';
    message: string;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton, editable, workflowSettings, chatStatus }) => {

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <div className="flex flex-col justify-center gap-1">
          {editable ? (
            <EditableTitle
              title={title}
              onSave={editable.onSave}
              isLoading={editable.isLoading}
            />
          ) : (
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {chatStatus && (
          <ChatStatusIcon 
            color={chatStatus.color} 
            message={chatStatus.message}
          />
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {actionButton && (
          <Button
            onClick={actionButton.onClick}
            variant={actionButton.variant || 'default'}
            className="flex items-center gap-2 px-4 py-2 h-10"
          >
            <actionButton.icon className="h-4 w-4" />
            {actionButton.label}
          </Button>
        )}
        
        {workflowSettings && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={workflowSettings.onClearChat}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={workflowSettings.onDeleteWorkflow}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <Trash className="h-4 w-4" />
                Deletar Workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
