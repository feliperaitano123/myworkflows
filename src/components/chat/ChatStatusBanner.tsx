import React from 'react';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatStatusBannerProps {
  isValid: boolean;
  statusMessage: string;
  statusColor: 'green' | 'red' | 'yellow';
  isValidating: boolean;
}

export const ChatStatusBanner: React.FC<ChatStatusBannerProps> = ({
  isValid,
  statusMessage,
  statusColor,
  isValidating
}) => {
  if (isValid) return null; // Não mostra banner quando chat está válido

  const getIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    switch (statusColor) {
      case 'red':
        return <AlertCircle className="w-4 h-4" />;
      case 'yellow':
        if (statusMessage.includes('desconectado')) {
          return <WifiOff className="w-4 h-4" />;
        }
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getBannerStyles = () => {
    switch (statusColor) {
      case 'red':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          border: 'border-l-red-500'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50 border-yellow-200', 
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          border: 'border-l-yellow-500'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800', 
          icon: 'text-blue-600',
          border: 'border-l-blue-500'
        };
    }
  };

  const styles = getBannerStyles();

  return (
    <div className={cn(
      'px-4 py-3 border-t border-l-4',
      styles.bg,
      styles.border
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('flex-shrink-0', styles.icon)}>
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className={cn('flex items-center gap-2', styles.text)}>
            <span className="font-medium text-sm">
              {isValidating ? 'Verificando...' : 'Chat indisponível'}
            </span>
            {!isValidating && (
              <>
                <span className="text-xs">•</span>
                <span className="text-sm">{statusMessage}</span>
              </>
            )}
          </div>
          
          {isValidating && (
            <p className={cn('text-xs mt-1 opacity-75', styles.text)}>
              Verificando se o workflow ainda existe no n8n...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};