
import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'destructive';
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <div className="flex flex-col justify-center gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      
      {actionButton && (
        <div className="flex items-center">
          <Button
            onClick={actionButton.onClick}
            variant={actionButton.variant || 'default'}
            className="flex items-center gap-2 px-4 py-2 h-10"
          >
            <actionButton.icon className="h-4 w-4" />
            {actionButton.label}
          </Button>
        </div>
      )}
    </div>
  );
};
