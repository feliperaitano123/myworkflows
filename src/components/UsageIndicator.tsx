import { Zap, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRateLimit } from '@/hooks/useRateLimit';
import { cn } from '@/lib/utils';

export const UsageIndicator = () => {
  const { limits, checkCanSendMessage, isPro, isLoading } = useRateLimit();

  if (isLoading || !limits) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Carregando...</span>
      </div>
    );
  }

  const status = checkCanSendMessage();

  if (isPro) {
    const remaining = limits.monthly_credits_limit - limits.monthly_credits_used;
    const percentage = (remaining / limits.monthly_credits_limit) * 100;
    const isLow = percentage < 20;
    const isCritical = percentage < 10;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Zap className={cn(
          "w-4 h-4",
          isCritical ? "text-red-500" : isLow ? "text-yellow-500" : "text-blue-500"
        )} />
        <span className="text-sm font-medium">
          {remaining.toLocaleString()} créditos
        </span>
        {isLow && (
          <Badge 
            variant={isCritical ? "destructive" : "secondary"} 
            className="ml-1 text-xs"
          >
            {isCritical ? "Crítico" : "Baixo"}
          </Badge>
        )}
      </div>
    );
  } else {
    // Free plan
    const remaining = status.remaining;
    const isLast = status.isLastMessage;
    const canSend = status.canSend;

    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        canSend 
          ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      )}>
        {canSend ? (
          <Clock className={cn(
            "w-4 h-4",
            isLast ? "text-orange-500" : "text-gray-500"
          )} />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
        
        <span className={cn(
          "text-sm",
          canSend ? "text-gray-700 dark:text-gray-300" : "text-red-600 dark:text-red-400"
        )}>
          {canSend ? `${remaining}/5 hoje` : "Limite atingido"}
        </span>
        
        {isLast && canSend && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Última!
          </Badge>
        )}
        
        {!canSend && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Upgrade Pro
          </Badge>
        )}
      </div>
    );
  }
};