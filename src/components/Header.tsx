
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LucideIcon, LogOut } from 'lucide-react';
import { EditableTitle } from '@/components/EditableTitle';

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
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton, editable }) => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
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
      
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, {user.name}
            </span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        )}
        
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
      </div>
    </div>
  );
};
