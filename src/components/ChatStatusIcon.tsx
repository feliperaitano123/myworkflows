import React from 'react';
import { Circle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatStatusIconProps {
  color: 'green' | 'red' | 'yellow';
  message: string;
}

export const ChatStatusIcon: React.FC<ChatStatusIconProps> = ({ color, message }) => {
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Circle className={`w-3 h-3 ${colorClasses[color]} fill-current`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};