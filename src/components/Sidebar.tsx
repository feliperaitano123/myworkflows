
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Settings, 
  BookOpen, 
  Cable,
  ChevronLeft,
  Bot
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
    name: 'My Connections',
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
      <nav className="flex-1 px-3 py-4 space-y-2">
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
    </div>
  );
};
