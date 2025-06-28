import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  error
}) => {
  const getStatusIcon = () => {
    if (isConnecting) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (isConnected) {
      return <Wifi className="w-4 h-4" />;
    }
    return <WifiOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isConnecting) return 'Conectando...';
    if (isConnected) return 'Conectado';
    return 'Desconectado';
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-500';
    if (isConnected) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      getStatusColor()
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {error && (
        <span className="text-red-500 text-xs">({error})</span>
      )}
    </div>
  );
};