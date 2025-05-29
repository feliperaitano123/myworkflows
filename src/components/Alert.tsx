
import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AlertProps {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export const Alert: React.FC<AlertProps> = ({
  id,
  type,
  title,
  message,
  duration = type === 'success' ? 5000 : 8000,
  onDismiss
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border rounded-lg shadow-lg animate-slide-in-from-right max-w-sm',
        isSuccess 
          ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
          : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0 mt-0.5',
          isSuccess 
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}
      />
      
      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'font-medium text-sm',
            isSuccess 
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
          )}
        >
          {title}
        </h4>
        <p
          className={cn(
            'text-sm mt-1',
            isSuccess 
              ? 'text-green-700 dark:text-green-200'
              : 'text-red-700 dark:text-red-200'
          )}
        >
          {message}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 w-6 p-0',
          isSuccess 
            ? 'text-green-600 hover:text-green-900'
            : 'text-red-600 hover:text-red-900'
        )}
        onClick={() => onDismiss(id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
