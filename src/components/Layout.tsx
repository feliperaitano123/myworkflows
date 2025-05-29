
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { WorkflowProvider } from '@/contexts/WorkflowContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <WorkflowProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </WorkflowProvider>
  );
};
